(function () {

angular.module('katGui.services')
    .service('MonitorService', MonitorService);

function MonitorService($rootScope, SERVER_URL, $localStorage, KatGuiUtil, $timeout, StatusService, ConfigService, AlarmsService, ObservationScheduleService) {

    var urlBase = SERVER_URL + '/katmonitor/api/v1';
    var api = {};
    api.connection = null;

    api.subscribeToReceptorUpdates = function () {
        ConfigService.receptorList.forEach(function(receptor) {
            var connectionParams = ['mon:' + receptor + '.mode', 'mon:' + receptor + '.inhibited'];
            api.subscribe(connectionParams);
        });
    };

    api.subscribeToAlarms = function () {
        api.subscribe('kataware.alarm_*');
    };

    api.subscribe = function (pattern) {
        if (typeof(pattern) !== 'object' && pattern.indexOf('mon:') === -1) {
            pattern = 'mon:' + pattern;
        }
        var jsonRPC = {
            'jsonrpc': '2.0',
            'method': 'subscribe',
            'params': [pattern],
            'id': 'monitor' + KatGuiUtil.generateUUID()
        };

        if (api.connection === null) {
            console.error('No Monitor Connection Present for subscribing, ignoring command for pattern ' + pattern);
        } else if (api.connection.readyState && api.connection.authorized) {
            return api.connection.send(JSON.stringify(jsonRPC));
        } else {
            $timeout(function () {
                api.subscribe(pattern);
            }, 500);
        }
    };

    api.unsubscribe = function (pattern) {
        if (pattern.indexOf('mon:') === -1) {
            pattern = 'mon:' + pattern;
        }
        var jsonRPC = {
            'jsonrpc': '2.0',
            'method': 'unsubscribe',
            'params': [pattern],
            'id': 'monitor' + KatGuiUtil.generateUUID()
        };

        if (api.connection === null) {
            console.error('No Monitor Connection Present for subscribing, ignoring command for pattern ' + pattern);
        } else if (api.connection.readyState && api.connection.authorized) {
            return api.connection.send(JSON.stringify(jsonRPC));
        } else {
            $timeout(function () {
                api.unsubscribe(pattern);
            }, 500);
        }
    };

    api.onSockJSOpen = function () {
        if (api.connection && api.connection.readyState) {
            console.log('Monitor Connection Established. Authenticating...');
            api.authenticateSocketConnection();
            api.subscribeToAlarms();
        }
    };

    api.onSockJSClose = function () {
        console.log('Disconnecting Monitor Connection');
        api.connection = null;
    };

    api.onSockJSMessage = function (e) {
        if (e && e.data) {
            var messages = JSON.parse(e.data);
            if (messages.error) {
                console.error('There was an error sending a jsonrpc request:');
                console.error(messages);
            } else if (messages.id === 'redis-pubsub-init' || messages.id === 'redis-pubsub') {
                if (messages.result) {
                    if (messages.id === 'redis-pubsub') {
                        var arrayResult = [];
                        arrayResult.push({msg_data: messages.result.msg_data, msg_channel: messages.result.msg_channel});
                        messages.result = arrayResult;
                    }
                    messages.result.forEach(function (message) {
                        var messageObj = message;
                        if (_.isString(message)) {
                            messageObj = JSON.parse(message);
                        }
                        if (messageObj.msg_channel) {
                            var channelNameSplit = messageObj.msg_channel.split(":")[1].split('.');
                            if (channelNameSplit[0] === 'kataware') {
                                AlarmsService.receivedAlarmMessage(messageObj.msg_channel, messageObj.msg_data);
                            } else if (channelNameSplit.length > 1 &&
                                (channelNameSplit[1] === 'mode' || channelNameSplit[1] === 'inhibited')) {
                                $rootScope.$emit('operatorControlStatusMessage', {name: messageObj.msg_channel, value: messageObj.msg_data});
                            }  else if (messageObj.msg_channel.lastIndexOf('sched:', 0) === 0) {
                                ObservationScheduleService.receivedSchedMessage(messageObj.msg_channel, messageObj.msg_data);
                            } else if (channelNameSplit.length > 1) {
                                StatusService.messageReceivedSensors(messageObj.msg_channel, messageObj.msg_data);
                            }
                        } else {
                            console.error('Dangling monitor message...');
                            console.error(messageObj);
                        }
                    });
                }
            } else if (messages.result) {
                //auth response
                if (messages.result.email && messages.result.session_id) {
                    $localStorage['currentUserToken'] = $rootScope.jwt;
                    api.connection.authorized = true;
                    console.log('Monitor Connection Established. Authenticated.');
                } else if (messages.result.length > 0) {
                    //subscribe response
                    //console.log('Subscribed to: ');
                    //console.log(messages.result);
                } else {
                    //bad auth response
                    api.connection.authorized = false;
                    console.log('Monitor Connection Established. Authentication failed.');
                    console.error(messages);
                }
            } else {
                console.error('Dangling monitor message...');
                console.error(e);
            }
        } else {
            console.error('Dangling monitor message...');
            console.error(e);
        }
    };

    api.connectListener = function () {
        console.log('Monitor Connecting...');
        api.connection = new SockJS(urlBase + '/monitor');
        api.connection.onopen = api.onSockJSOpen;
        api.connection.onmessage = api.onSockJSMessage;
        api.connection.onclose = api.onSockJSClose;
        return api.connection !== null;
    };

    api.disconnectListener = function () {
        if (api.connection) {
            api.connection.close();
        } else {
            console.error('Attempting to disconnect an already disconnected connection!');
        }
    };

    api.authenticateSocketConnection = function() {

        if (api.connection) {
            var jsonRPC = {
                'jsonrpc': '2.0',
                'method': 'authorise',
                'params': [$rootScope.session_id],
                'id': 'authorise' + KatGuiUtil.generateUUID()
            };

            api.connection.send(JSON.stringify(jsonRPC));
        }
    };

    api.sendMonitorCommand = function (method, params) {

        if (api.connection && api.connection.authorized) {
            var jsonRPC = {
                'id': KatGuiUtil.generateUUID(),
                'jsonrpc': '2.0',
                'method': method,
                'params': params
            };

            api.connection.send(JSON.stringify(jsonRPC));
        } else {
            $timeout(function () {
                api.sendMonitorCommand(method, params);
            }, 500);
        }
    };

    return api;
}
})();
