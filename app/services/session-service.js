(function() {

    angular.module('katGui.services')
        .service('SessionService', SessionService);

    function SessionService($http, $state, $rootScope, $localStorage, $mdDialog,
        KatGuiUtil, $timeout, $q, $interval, $log, $location, NotifyService, MOMENT_DATETIME_FORMAT) {

        function urlBase() {
            return $rootScope.portalUrl ? $rootScope.portalUrl + '/katauth' : '';
        }

        var api = {};
        api.connection = null;
        api.deferredMap = {};
        api.userSessions = {};
        $rootScope.jwt = $localStorage['currentUserToken'];

        var jwtHeader = {
            "alg": "HS256",
            "typ": "JWT"
        };

        api.verify = function(email, password, role) {
            var jwtPayload = {
                "email": email
            };
            var msg = window.btoa(JSON.stringify(jwtHeader)) + "." + window.btoa(JSON.stringify(jwtPayload));
            msg = msg.replace(/=/g, "");
            var pass = CryptoJS.HmacSHA256(msg, CryptoJS.SHA256(password).toString());
            $rootScope.auth_jwt = msg + '.' + pass.toString(CryptoJS.enc.Base64);
            $rootScope.jwt = $rootScope.auth_jwt;
            $http(createRequest('get', urlBase() + '/user/verify/' + role))
                .then(verifySuccess, verifyError);
        };

        api.verifyAs = function(role) {
            var req = {
                method: 'get',
                url: urlBase() + '/user/verify/' + role,
                headers: {
                    'Authorization': 'CustomJWT ' + $rootScope.jwt
                }
            };
            $http(req).then(function(result) {
                if (result.data.session_id) {
                    if (result.data.confirmation_token) {
                        $log.info('Found confirmation token');
                        var b = result.data.confirmation_token.split(".");
                        var payload = JSON.parse(CryptoJS.enc.Base64.parse(b[1]).toString(CryptoJS.enc.Utf8));
                        if (payload.req_role === 'lead_operator' &&
                            payload.current_lo &&
                            payload.current_lo !== payload.requester) {
                            confirmRole(result.data.session_id, payload);
                        } else {
                            api.login(payload.session_id);
                        }
                    } else {
                        api.login(result.data.session_id);
                    }
                }
            }, function(error) {
                $log.error(error);
            });

        };

        api.login = function(session_id) {
            $rootScope.jwt = session_id;
            $http(createRequest('post', urlBase() + '/user/login', {}))
                .then(function(result) {
                    loginSuccess(result, session_id);
                }, loginError);
        };

        api.logout = function() {
            return $http(createRequest('post', urlBase() + '/user/logout', {}))
                .then(logoutResultSuccess, logoutResultError);
        };

        api.recoverLogin = function() {
            if ($rootScope.jwt) {
                var b = $rootScope.jwt.split(".");
                var payload = JSON.parse(CryptoJS.enc.Base64.parse(b[1]).toString(CryptoJS.enc.Utf8));
                $http(createRequest('get', urlBase() + '/user/verify/' + payload.req_role))
                    .then(verifySuccess, verifyError);
                $rootScope.currentUser = payload;
            }
        };

        api.onSockJSOpen = function() {
            if (api.connection && api.connection.readyState) {
                $log.info('Lead Operator Connection Established.');
                api.deferredMap['connectDefer'].resolve();
                api.connection.send($rootScope.currentUser.email);
                if (api.reconnectInterval) {
                    $interval.cancel(api.reconnectInterval);
                    api.reconnectInterval = null;
                }
            }
        };

        api.onSockJSClose = function() {
            $log.info('Disconnected Lead Operator Connection.');
            api.connection = null;
            if ($rootScope.loggedIn && $rootScope.currentUser.req_role === 'lead_operator') {
                // if the lo connection closes but we still want to be lo, try to reconnect
                // every 10 seconds
                if (!api.reconnectInterval) {
                    api.reconnectInterval = $interval(function() {
                        api.connectListener(false);
                    }, 10000);
                }
            }
        };

        api.onSockJSMessage = function(e) {
            //we got a ping for LO so send a pong with our email
            api.connection.send($rootScope.currentUser.email);
        };

        api.connectListener = function(skipDeferObject) {
            if (!$rootScope.loggedIn) {
                if (api.reconnectInterval) {
                    $interval.cancel(api.reconnectInterval);
                    api.reconnectInterval = null;
                }
                return;
            }
            $log.info('Lead Operator Connecting...');
            api.connection = new SockJS(urlBase() + '/alive');
            api.connection.onopen = api.onSockJSOpen;
            api.connection.onmessage = api.onSockJSMessage;
            api.connection.onclose = api.onSockJSClose;

            if (!skipDeferObject) {
                api.deferredMap['connectDefer'] = $q.defer();
                return api.deferredMap['connectDefer'].promise;
            }
        };

        api.disconnectListener = function() {
            if (api.connection) {
                $log.info('Disconnecting Lead Operator.');
                api.connection.close();
            } else {
                $log.error('Attempting to disconnect an already disconnected connection!');
            }
        };

        api.receivedSessionMessage = function(subject, data) {
            if (subject === "portal.auth.session.deleted") {
                if (api.userSessions[data.user]) {
                    delete api.userSessions[data.user];
                }
                if ($rootScope.currentUser && data.user === $rootScope.currentUser.email) {
                    // this user's session was deleted, log him out!
                    api.logout();
                    NotifyService.showSimpleDialog(
                        "Logged out", "Your session has been terminated by an administrator, please contact the lead operator or login again.");
                }
            }
            else if ($rootScope.expertOrLO) {
                if (!api.userSessions[data.user]) {
                    api.userSessions[data.user] = [data];
                } else {
                    api.userSessions[data.user].push(data);
                }
            }
        };

        api.listUserSessions = function() {
            $http(createRequest('get', urlBase() + '/sessions')).then(function(result) {
                result.data.forEach(function(session) {
                    api.userSessions[session.user] = [session];
                });
            }, function(error) {
                $log.error('Error listing user sessions!');
                $log.error(error);
            });
        };

        api.showSessionDetails = function(user) {
            $mdDialog
                .show({
                    controller: function($rootScope, $scope, $mdDialog) {
                        $scope.sessions = api.userSessions[user.email];
                        $scope.user = user;

                        $scope.secondsToDate = function(input) {
                            return new Date(parseFloat(input));
                        };

                        $scope.logoutUser = function() {
                            api.deleteUserSession(user.email);
                            $mdDialog.hide();
                        };

                        $scope.cancel = function() {
                            $mdDialog.hide();
                        };
                    },
                    template: [
                        '<md-dialog>',
                            '<md-toolbar md-theme="{{$root.themePrimary}}" class="md-whiteframe-z1 md-primary"><div class="md-toolbar-tools">User Session Activity - {{user.email}}</div></md-toolbar>',
                            '<md-dialog-content style="padding: 32px; overflow: auto" md-theme="{{$root.themePrimaryButtons}}" layout="column">',
                                '<label>{{sessions.length > 1? "Recent session activity:" : "No recent session activity sniffed."}}</label>',
                                '<div ng-repeat="session in sessions">',
                                    '<span ng-if="session.full_url">{{session.method + " - " + session.full_url}}</span>',
                                '</div>',
                            '</md-dialog-content>',
                            '<md-dialog-actions  md-theme="{{$root.themePrimaryButtons}}" layout="row">',
                                '<span flex></span>',
                                '<md-button md-theme="red" class="md-raised md-primary" ng-click="logoutUser()">Logout User</md-button>',
                                '<md-button ng-click="cancel()">Close</md-button>',
                            '</md-dialog-actions>',
                        '</md-dialog>'
                    ].join('')
                });
        };

        api.deleteUserSession = function(userEmail) {
            $http(createRequest('delete', urlBase() + '/session/' + userEmail)).then(function(result) {
                NotifyService.showSimpleToast('Logged out user: ' + userEmail);
            }, function(error) {
                $log.error('Error deleting user session!');
                $log.error(error);
            });
        };

        function logoutResultSuccess() {
            NotifyService.showSimpleToast('Logout successful.');
            if (api.connection) {
                api.disconnectListener();
            }
            $rootScope.currentUser = null;
            $rootScope.loggedIn = false;
            $localStorage['currentUserToken'] = null;
            $rootScope.jwt = null;
            $state.go('login');
        }

        function logoutResultError(result) {
            NotifyService.showSimpleToast('Error Logging out, resetting local user session.');
            if (api.connection) {
                api.disconnectListener();
            }
            $rootScope.currentUser = null;
            $rootScope.loggedIn = false;
            $localStorage['currentUserToken'] = null;
            $rootScope.jwt = null;
            $state.go('login');
            $log.error('Error logging out, server returned with: ');
            $log.error(result);
        }

        function verifySuccess(result) {
            if (result.data.session_id) {
                if (result.data.confirmation_token) {
                    $log.debug('Found confirmation token');
                    var b = result.data.confirmation_token.split(".");
                    var payload = JSON.parse(CryptoJS.enc.Base64.parse(b[1]).toString(CryptoJS.enc.Utf8));
                    if (payload.req_role === 'lead_operator' &&
                        payload.current_lo &&
                        payload.current_lo !== payload.requester) {
                        confirmRole(result.data.session_id, payload);
                    } else {
                        api.login(payload.session_id);
                    }
                } else {
                    api.login(result.data.session_id);
                }
            } else {
                //User's session expired, we got a message
                $localStorage['currentUserToken'] = null;
                $state.go('login');
                if (result.data.message) {
                    NotifyService.showSimpleToast(result.data.message);
                } else {
                    $log.error("Could not determine verify success message.");
                }
            }
        }

        function verifyError(result) {
            if (result.data && result.data.session_id === null) {
                api.currentUser = null;
                api.loggedIn = false;
                $localStorage['currentUserToken'] = undefined;
                NotifyService.showSimpleToast('Invalid username or password.');
                $state.go('login');
            } else {
                if (result.data && result.data.err_msg) {
                    NotifyService.showSimpleToast('Error: ' + result.data.err_msg);
                    $state.go('login');
                } else {
                    if (!window.location.pathname.startsWith('/sensor-graph')) {
                        NotifyService.showSimpleToast('Error connecting to KATPortal.');
                        $log.error("Could not connect to portal webservers: " + result.statusText);
                        $state.go('login');
                    }
                }
            }
        }

        function confirmRole(session_id, payload) {
            $mdDialog
                .show({
                    controller: function($rootScope, $scope, $mdDialog) {
                        var readonly_session_id = session_id;
                        var requested_session_id = payload.session_id;
                        $scope.current_lo = payload.current_lo;
                        $scope.requested_role = payload.req_role;

                        $scope.proceed = function() {
                            api.login(requested_session_id);
                            $mdDialog.hide();
                        };

                        $scope.cancel = function() {
                            api.login(readonly_session_id);
                            $mdDialog.hide();
                        };
                    },
                    template: [
                        '<md-dialog md-theme="{{$root.themePrimary}}" class="md-whiteframe-z1">',
                        '<md-toolbar class="md-toolbar-tools md-whiteframe-z1">Confirm login as {{$root.rolesMap[requested_role]}}</md-toolbar>',
                        '<md-dialog-content class="md-padding" layout="column">',
                        '<p><b>{{current_lo ? current_lo : "No one"}}</b> is the current Lead Operator.</p>',
                        '<p ng-show="current_lo">If you proceed <b>{{current_lo}}</b> will be demoted to the Monitor Role.</p>',
                        '</md-dialog-content>',
                        '<md-dialog-actions layout="row" md-theme="{{$root.themePrimaryButtons}}">',
                        '<md-button ng-click="cancel()" class="md-primary md-raised">',
                        'Login As Monitor Only',
                        '</md-button>',
                        '<md-button ng-click="proceed()" class="md-primary md-raised">',
                        'Login As Lead Operator',
                        '</md-button>',
                        '</md-dialog-actions>',
                        '</md-dialog>'
                    ].join('')
                });
        }

        function loginSuccess(result, session_id) {
            if (session_id) {
                var a = session_id.split(".");
                $rootScope.session_id = session_id;
                var payload = JSON.parse(CryptoJS.enc.Base64.parse(a[1]).toString(CryptoJS.enc.Utf8));
                if (payload.name !== null) {
                    $rootScope.currentUser = payload;
                    $rootScope.loggedIn = true;
                    //only redirect when logging in from login screen
                    if ($state.current.name === 'login') {
                        $state.go('home');
                    }
                    $localStorage['currentUserToken'] = $rootScope.jwt;
                    NotifyService.showSimpleToast('Login successful, welcome ' + payload.name + '.');
                    $rootScope.connectEvents();
                    if (payload.req_role === 'lead_operator' && !api.connection) {
                        api.connectListener(false);
                    } else if (api.connection) {
                        api.disconnectListener();
                    }
                    $rootScope.expertOrLO = payload.req_role === 'expert' || payload.req_role === 'lead_operator';
                    $rootScope.$emit('loginSuccess', true);
                }
            } else {
                //User's session expired, we got a message
                $log.info('No session id');
                $localStorage['currentUserToken'] = null;
                $state.go('login');
                if (result.data.message) {
                    NotifyService.showSimpleToast(result.data.message);
                } else {
                    $log.error("Could not determine login success message.");
                }
            }
        }

        function loginError(result) {
            if (result.data && result.data.session_id === null) {
                api.currentUser = null;
                api.loggedIn = false;
                $localStorage['currentUserToken'] = undefined;
                NotifyService.showSimpleToast('Invalid username or password.');
                $state.go('login');
            } else {
                $log.error('Error logging return, server returned with:');
                $log.error(result.data);
                if (result.data.err_msg) {
                    NotifyService.showSimpleToast(result.data.err_msg);
                } else {
                    NotifyService.showSimpleToast('Error connecting to KATPortal.');
                }
                $state.go('login');
            }
        }

        function createRequest(method, url, data) {
            var req = {
                method: method,
                url: url,
                headers: {
                    'Authorization': 'CustomJWT ' + $rootScope.jwt
                }
            };

            if (data && method === 'post') {
                req.headers['Content-Type'] = 'application/json';
                req.data = data;
            }

            return req;
        }

        return api;
    }

})();
