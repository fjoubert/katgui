(function () {
    angular.module('katGui', ['ngMaterial',
        'ui.bootstrap', 'ui.utils', 'ui.router',
        'adf',
        'ngAnimate',
        'katGui.admin',
        'katGui.alarms',
        'katGui.config',
        'katGui.d3',
        'katGui.health',
        'katGui.widgets.navigationWidget',
        //'katGui.widgets.ganttWidget',
        'katGui.dashboardStructure',
        'katGui.landing',
        'katGui.util',
        'katGui.scheduler',
        'katGui.services',
        'katGui.video'])
        .constant('UI_VERSION', '0.0.1')
        .constant('USER_ROLES', {
            noAuth: 'noAuth',
            all: '*',
            monitor: 'monitor',
            operator: 'operator',
            leadOperator: 'leadOperator',
            control: 'control',
            expert: 'expert'
        })
        .constant('TOAST_HIDE_DELAY', 3500)
        .constant('THEMES', [
            {
                name: 'Blue-Grey',
                primary: 'blue-grey',
                secondary: 'deep-purple',
                primaryButtons: 'indigo'
            },
            {
                name: 'Indigo',
                primary: 'indigo',
                secondary: 'blue',
                primaryButtons: 'blue'
            },
            {
                name: 'Teal',
                primary: 'teal',
                secondary: 'amber',
                primaryButtons: 'indigo'
            }])
        .constant('SCHEDULE_BLOCK_TYPES', [
            'MAINTENANCE',
            'OBSERVATION',
            'MANUAL'])
        //,
        //{
        //    name: 'Light-Blue-Dark',
        //    primary: 'light-blue-dark',
        //    secondary: 'indigo',
        //    primaryButtons: 'blue-grey'
        //}
        .config(configureKatGui)
        .run(runKatGui)
        .controller('ApplicationCtrl', ApplicationCtrl);

    function ApplicationCtrl($rootScope, $scope, $state, $interval, $mdSidenav, $timeout, $localStorage, THEMES,
                             USER_ROLES, MonitorService, ControlService, KatGuiUtil, $mdToast, TOAST_HIDE_DELAY, SessionService, $mdDialog) {

        var vm = this;

        SessionService.recoverLogin();

        var theme = _.find(THEMES, function (theme) {
            return $localStorage['selectedTheme'] === theme.name;
        });

        if (!theme) {
            theme = THEMES[0];
        }

        $rootScope.themePrimary = theme.primary;
        $rootScope.themeSecondary = theme.secondary;
        $rootScope.themePrimaryButtons = theme.primaryButtons;

        vm.showNavbar = true;
        $rootScope.showNavbar = true;
        $rootScope.showLargeAlarms = $localStorage['showLargeAlarms'];
        if (typeof $rootScope.showLargeAlarms === 'undefined') {
            $rootScope.showLargeAlarms = false;
        }

        $scope.$watch('showNavbar', function (value) {
            $rootScope.showNavbar = value;
        });

        vm.currentUser = null;
        vm.userRoles = USER_ROLES;
        vm.userCanOperate = false;
        vm.userLoggedIn = false;

        vm.actionMenuOpen = false;
        $rootScope.newAlarmWarnCount = 0;
        $rootScope.newAlarmErrorCount = 0;
        $rootScope.newAlarmCritCount = 0;
        $rootScope.toastPosition = 'bottom right';
        $rootScope.showAlarms = true;
        $rootScope.showSimpleToast = function (message) {
            $mdToast.show(
                $mdToast.simple()
                    .content(message)
                    .position($rootScope.toastPosition)
                    .hideDelay(TOAST_HIDE_DELAY)
            );

            console.log('Showing toast-message: ' + message);
        };

        var unbindAlarmMessage = null;

        $rootScope.connectEvents = function () {

            vm.showNavbar = true;
            $rootScope.$on('alarmMessage', receivedAlarmMessage);

            syncTimeWithServer();
            $interval(updateTimeDisplay, 1000); //update local clock every second

            $interval(function () {
                syncTimeWithServer();
            }, 600000); //sync time every 10 minutes

            MonitorService.connectListener();
            ControlService.connectListener();
        };

        vm.toggleLeftSidenav = function () {
            $mdSidenav('left-sidenav').toggle();
        };

        vm.toggleRightSidenav = function () {
            $mdSidenav('right-sidenav').toggle();
        };

        vm.logout = function () {

            MonitorService.disconnectListener();
            ControlService.disconnectListener();
            $mdSidenav('right-sidenav').close();
            SessionService.logout();

            if (unbindAlarmMessage) {
                unbindAlarmMessage();
            }

            vm.showNavbar = false;
        };

        vm.stateGo = function (newState) {
            $state.go(newState);
        };

        vm.sideNavStateGo = function (newState) {
            vm.stateGo(newState);
            $mdSidenav('left-sidenav').close();
        };

        vm.sideNavRightStateGo = function (newState) {
            vm.stateGo(newState);
            $mdSidenav('right-sidenav').close();
        };

        vm.isPageSelected = function (page) {
            return $state.current.name === page;
        };

        vm.currentStateUpperCase = function () {
            return $state.current.title;
        };

        vm.navigateToParentState = function() {
            if ($state.current.parent) {
                if ($state.current.name === 'scheduler.observations.detail') {
                    $state.go('scheduler.observations');
                } else {
                    $state.go($state.current.parent.name);
                }
            } else {
                $state.go('home');
            }
        };

        vm.operatorActionMenuItemSelected = function () {
            $state.go('operatorControl');
            vm.operatorControlMenuHover = false;
        };

        vm.inhibitAll = function () {
            ControlService.inhibitAll();
            vm.operatorActionMenuItemSelected();
        };

        vm.stowAll = function () {
            ControlService.stowAll();
            vm.operatorActionMenuItemSelected();
        };

        vm.stopAll = function () {
            ControlService.stopAll();
            vm.operatorActionMenuItemSelected();
        };

        vm.resumeOperations = function () {
            ControlService.resumeOperations();
            vm.operatorActionMenuItemSelected();
        };

        vm.shutdownComputing = function () {
            ControlService.shutdownComputing();
            vm.operatorActionMenuItemSelected();
        };

        vm.utcTime = '';
        vm.localTime = '';

        $rootScope.displayPromiseResult = function(result) {
            if (result.result === 'ok') {
                $rootScope.showSimpleToast(result.message);
            } else {
                $rootScope.showSimpleDialog(result.result, result.message);
            }
        };

        $rootScope.showSimpleDialog = function(title, message) {
            var alert = $mdDialog.alert()
                .title(title)
                .content(message)
                .ok('Close');
            $mdDialog
                .show(alert)
                .finally(function () {
                    alert = undefined;
                });

            console.log('Showing simple dialog, title: ' + title + ', message: ' + message);
        };

        var updateTimeDisplay = function () {
            //TODO: calculate local sidereal time outside this function and only on every sync
            if ($rootScope.serverTimeOnLoad > 0) {
                var utcTime = moment.utc($rootScope.serverTimeOnLoad, 'X');
                var localTime = moment($rootScope.serverTimeOnLoad, 'X');
                vm.utcTime = utcTime.format('HH:mm:ss');
                vm.localTime = localTime.format('HH:mm:ss');

                //TODO: get actual longitude to use
                var longitude = 21.3692096; //site longitude
                var fractionalHours = localTime.hours() + localTime.minutes() / 60 + (localTime.seconds() / 60) / 60;
                var julianDayWithTime = KatGuiUtil.julianDayWithTime(utcTime.date(), utcTime.month() + 1, utcTime.year(), fractionalHours);
                vm.julianDay = Math.round(julianDayWithTime * 1000) / 1000;
                vm.localSiderealTime = KatGuiUtil.localSiderealTime(julianDayWithTime, longitude);
                $rootScope.serverTimeOnLoad += 1; //unix time is seconds, so only add one
            }
        };

        function syncTimeWithServer() {
            ControlService.getCurrentServerTime()
                .success(function (serverTime) {
                    $rootScope.serverTimeOnLoad = serverTime.katcontrol_webserver_current_time;
                    //var utcTime = moment.utc($rootScope.serverTimeOnLoad, 'X');
                    //vm.julianDay = KatGuiUtil.julianDay(utcTime.date(), utcTime.month() + 1, utcTime.year());
                    console.log('Syncing current time with katcontrol server (utc HH:mm:ss DD-MM-YYYY): ' + moment.utc($rootScope.serverTimeOnLoad, 'X').format('HH:mm:ss DD-MM-YYYY'));
                })
                .error(function (error) {
                    console.log("Error syncing time with katcontrol portal! " + error);
                    $rootScope.serverTimeOnLoad = 0;
                    vm.localSiderealTime = "Error syncing time!";
                });
        }

        //these alarm collections are modified in alarms/alarms.js
        //just so you know
        //TODO move them all into a service
        $rootScope.alarmsData = [];

        //for easier testing
        this.receivedAlarmMessage = receivedAlarmMessage;

        function receivedAlarmMessage(event, message) {

            //TODO remove this test code
            //if (!$rootScope.showAlarms) {
            //    return;
            //}

            if (message.severity === 'nominal') {
                return;
            }

            var foundAlarm = _.findWhere($rootScope.alarmsData, {name: message.name});

            if (foundAlarm) {
                foundAlarm.priority = message.priority;
                foundAlarm.severity = message.severity;
                foundAlarm.dateUnix = message.dateUnix;
                foundAlarm.date = message.date;
                foundAlarm.selected = false;
            }

            if (!foundAlarm) {
                $rootScope.alarmsData.push(message);
            }
        }

        //so that all controllers and directives has access to which keyboard presses is happening
        document.onkeydown = function(event) {
            event = event || window.event;
            $rootScope.$emit('keydown', event.keyCode);
        };

        $scope.$on('$destroy', vm.logout);
    }

    function configureKatGui($stateProvider, $urlRouterProvider, $compileProvider, $mdThemingProvider, $httpProvider, USER_ROLES) {

        //todo: disable in production
        //disable this in production for performance boost
        //batarang uses this for scope inspection
        //https://docs.angularjs.org/guide/production
        //$compileProvider.debugInfoEnabled(false);

        delete $httpProvider.defaults.headers.common['X-Requested-With'];

        configureThemes($mdThemingProvider);

        $stateProvider.state('login', {
            url: '/login',
            templateUrl: 'app/login-form/login-form.html',
            title: 'Login',
            data: {
                authorizedRoles: [USER_ROLES.noAuth]
            }
        });
        $stateProvider.state('admin', {
            url: '/admin',
            templateUrl: 'app/admin/admin.html',
            title: 'User Admin',
            data: {
                authorizedRoles: [USER_ROLES.leadOperator, USER_ROLES.control, USER_ROLES.expert]
            }
        });
        $stateProvider.state('alarms', {
            url: '/alarms',
            templateUrl: 'app/alarms/alarms.html',
            title: 'Alarms',
            data: {
                authorizedRoles: [USER_ROLES.leadOperator, USER_ROLES.control, USER_ROLES.expert]
            }
        });
        $stateProvider.state('config', {
            url: '/config',
            templateUrl: 'app/config/config.html',
            title: 'Configure katGUI',
            data: {
                authorizedRoles: [USER_ROLES.all]
            }
        });
        $stateProvider.state('health', {
            url: '/health',
            templateUrl: 'app/health/health.html',
            title: 'Health & State',
            data: {
                authorizedRoles: [USER_ROLES.all]
            }
        });
        $stateProvider.state('receptorStatus', {
            url: '/receptor-status',
            templateUrl: 'app/health/receptor-status/receptor-status.html',
            title: 'Receptor Status',
            data: {
                authorizedRoles: [USER_ROLES.all]
            }
        });
        $stateProvider.state('home', {
            url: '/home',
            templateUrl: 'app/landing/landing.html',
            title: 'Home',
            data: {
                authorizedRoles: [USER_ROLES.all]
            }
        });
        $stateProvider.state('operatorControl', {
            url: '/operatorControl',
            templateUrl: 'app/operator-control/operator-control.html',
            title: 'Operator Control',
            data: {
                authorizedRoles: [USER_ROLES.operator, USER_ROLES.leadOperator, USER_ROLES.control, USER_ROLES.expert]
            }
        });

        var schedulerHome = {
            name: 'scheduler',
            url: '/scheduler',
            templateUrl: 'app/scheduler/scheduler-home.html',
            title: 'Scheduler',
            data: {
                authorizedRoles: [USER_ROLES.operator, USER_ROLES.leadOperator, USER_ROLES.control, USER_ROLES.expert]
            }
        };

        var sbDrafts = {
            name: 'scheduler.drafts',
            parent: schedulerHome,
            url: '/drafts',
            templateUrl: 'app/scheduler/schedule-block-drafts/schedule-block-drafts.html',
            title: 'Scheduler.Drafts',
            data: {
                authorizedRoles: [USER_ROLES.operator, USER_ROLES.leadOperator, USER_ROLES.control, USER_ROLES.expert]
            }
        };

        var subArrays = {
            name: 'scheduler.subarrays',
            parent: schedulerHome,
            url: '/subarrays',
            templateUrl: 'app/scheduler/subarrays-draft-assignment/subarrays-draft-assignment.html',
            title: 'Scheduler.Sub-Array Drafts',
            data: {
                authorizedRoles: [USER_ROLES.all]
            }
        };

        var subArrayResources = {
            name: 'scheduler.resources',
            parent: schedulerHome,
            url: '/resources',
            templateUrl: 'app/scheduler/subarray-resources/subarray-resources.html',
            title: 'Scheduler.Resources',
            data: {
                authorizedRoles: [USER_ROLES.all]
            }
        };

        var observationsOverview = {
            name: 'scheduler.observations',
            parent: schedulerHome,
            url: '/observations',
            templateUrl: 'app/scheduler/observations/observations-overview.html',
            title: 'Scheduler.Observations Overview',
            data: {
                authorizedRoles: [USER_ROLES.all]
            }
        };

        var observationsDetail = {
            name: 'scheduler.observations.detail',
            parent: schedulerHome,
            url: '/observations/:subarray_id',
            templateUrl: 'app/scheduler/observations/observations-detail.html',
            title: 'Scheduler.Observations Details',
            data: {
                authorizedRoles: [USER_ROLES.all]
            }
        };

        $stateProvider
            .state(schedulerHome)
            .state(sbDrafts)
            .state(subArrays)
            .state(subArrayResources)
            .state(observationsOverview)
            .state(observationsDetail);

        $stateProvider.state('sensorGraph', {
            url: '/sensorGraph',
            templateUrl: 'app/sensor-graph/sensor-graph.html',
            title: 'Sensor Graphs',
            data: {
                authorizedRoles: [USER_ROLES.operator, USER_ROLES.leadOperator, USER_ROLES.control, USER_ROLES.expert]
            }
        });
        $stateProvider.state('about', {
            url: '/about',
            templateUrl: 'app/about/about.html',
            title: 'About',
            data: {
                authorizedRoles: [USER_ROLES.all]
            }
        });
        $stateProvider.state('video', {
            url: '/video',
            templateUrl: 'app/video/video.html',
            title: 'Video',
            data: {
                authorizedRoles: [USER_ROLES.all]
            }
        });
        $stateProvider.state('weather', {
            url: '/weather',
            templateUrl: 'app/weather/weather.html',
            title: 'Weather',
            data: {
                authorizedRoles: [USER_ROLES.all]
            }
        });
        /* Add New States Above */
        $urlRouterProvider.otherwise('/login');
    }

    function runKatGui($rootScope, $state, $localStorage) {

        $rootScope.$on('$stateChangeStart', function (event, toState) {

            if (!$rootScope.loggedIn && toState.name !== 'login') {

                if (!$localStorage['currentUserToken']) {
                    event.preventDefault();
                    $state.go('login');
                }

            } else if ($rootScope.loggedIn && toState.name === 'login') {
                event.preventDefault();
                $state.go('home');
            }
        });

        $rootScope.$on('$stateChangeError', function (event) {
            console.log('$stateChangeError - debugging required. Event: ');
            console.log(event);
        });
    }

    //this function includes the style sheets instead of having to link to each individually
    function configureThemes($mdThemingProvider) {
        //$mdThemingProvider.theme('default')
        //    .primaryPalette('indigo');
        //
        $mdThemingProvider.theme('indigo')
            .primaryPalette('indigo');

        $mdThemingProvider.theme('blue')
            .primaryPalette('blue');

        $mdThemingProvider.theme('red')
            .primaryPalette('red');

        $mdThemingProvider.theme('green')
            .primaryPalette('green');

        $mdThemingProvider.theme('blue-grey')
            .primaryPalette('blue-grey');

        $mdThemingProvider.theme('deep-purple')
            .primaryPalette('deep-purple');

        $mdThemingProvider.theme('teal')
            .primaryPalette('teal');

        $mdThemingProvider.theme('yellow')
            .primaryPalette('yellow');

        $mdThemingProvider.theme('amber')
            .primaryPalette('amber');

        //$mdThemingProvider.theme('light-blue-dark')
        //    .primaryPalette('red');

        $mdThemingProvider.alwaysWatchTheme(true);
    }
})();
