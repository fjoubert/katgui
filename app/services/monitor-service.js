(function () {

angular.module('katGui.services')
    .service('MonitorService', MonitorService);

function MonitorService($rootScope, SERVER_URL, $localStorage, KatGuiUtil, $timeout, StatusService) {

    var pendingSubscribeObjects = [];
    var urlBase = SERVER_URL + ':8830';

    var connection = null;
    //use this alias because we are using some api functions within functions
    //because 'this' means something different within each child function
    var api = this;
    api.connectionAuthorised = false;

    api.subscribeToReceptorUpdates = function () {
        var connectionParams = ['m011:mode', 'm011:inhibited', 'm022:mode', 'm022:inhibited', 'm033:mode', 'm033:inhibited', 'm044:mode', 'm044:inhibited', 'm055:mode', 'm055:inhibited'];
        api.subscribe(connectionParams);
    };

    api.subscribeToAlarms = function () {
        api.subscribe('kataware:alarm[.]*');
    };

    api.subscribe = function (pattern) {
        var jsonRPC = {
            'jsonrpc': '2.0',
            'method': 'subscribe',
            'params': [pattern],
            'id': 'monitor' + KatGuiUtil.generateUUID()
        };

        if (connection && connection.readyState && api.connectionAuthorised) {
            return connection.send(JSON.stringify(jsonRPC));
        } else {
            $timeout(function () {
                api.subscribe(pattern);
            }, 500);
        }
    };

    api.onSockJSOpen = function () {
        if (connection && connection.readyState) {
            console.log('Monitor Connection Established. Authenticating...');

            authenticateSocketConnection();
            api.subscribeToAlarms();
        }
    };

    api.onSockJSClose = function () {
        console.log('Disconnecting Monitor Connection');
        connection = null;
    };

    api.onSockJSMessage = function (e) {

        var messages = JSON.parse(e.data);
        if (messages.error) {
            console.error('There was an error sending a jsonrpc request:');
            console.error(messages);
        } else if (messages.id === 'redis-pubsub-init' || messages.id === 'redis-pubsub') {
            console.log('received redis-pubsub-init message:');
            console.log(messages);

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

                    var channelNameSplit = messageObj.msg_channel.split(":");

                    if (messageObj.msg_channel.lastIndexOf('kataware:', 0) === 0) {
                        api.alarmMessageReceived(messageObj.msg_channel, messageObj.msg_data);
                    } else if (messageObj.msg_channel.indexOf('mon_') === 0) {
                        StatusService.messageReceived(messageObj.msg_channel, messageObj.msg_data);
                    } else if (messageObj.msg_channel.indexOf('sensors.ok') !== -1) {
                        StatusService.messageReceivedSensorsOk(messageObj.msg_channel, messageObj.msg_data);
                    } else if (channelNameSplit.length > 1 &&
                        (channelNameSplit[1] === 'mode' || channelNameSplit[1] === 'inhibited')) {
                        api.receptorMessageReceived(messageObj.msg_channel, messageObj.msg_data);
                    } else {
                        console.log('dangling monitor message...');
                        console.log(messageObj);
                    }
                });
            }
        } else if (messages.result && messages.result.session_id) {
            //auth response
            if (messages.result.email && messages.result.session_id) {
                $localStorage['currentUserToken'] = $rootScope.jwt;
                api.connectionAuthorised = true;

            } else {
                //bad auth response
                //TODO handle bad case
                api.connectionAuthorised = false;
                console.error('Bad auth response:');
                console.error(messages);
            }
        }
    };

    api.connectListener = function () {
        console.log('Monitor Connecting...');
        connection = new SockJS(urlBase + '/monitor');
        connection.onopen = api.onSockJSOpen;
        connection.onmessage = api.onSockJSMessage;
        connection.onclose = api.onSockJSClose;

        return connection !== null;
    };

    api.disconnectListener = function () {
        if (connection) {
            connection.close();
        }
    };

    api.receptorMessageReceived = function (messageName, messageObj) {
        $rootScope.$broadcast('operatorControlStatusMessage', {name: messageName, value: messageObj});
    };

    api.alarmMessageReceived = function (messageName, messageObj) {

        var alarmValues = messageObj.value.toString().split(',');
        var alarmPriority = 'unknown';
        if (alarmValues.length > 2) {
            alarmPriority = alarmValues[1];
            messageObj.severity = alarmValues[0];
        }

        messageObj.priority = alarmPriority;
        messageObj.name = messageName.replace('kataware:alarm.', '');
        messageObj.dateUnix = messageObj.timestamp;
        messageObj.date = moment.utc(messageObj.timestamp, 'X').format('HH:mm:ss DD-MM-\'YY');
        $rootScope.$emit('alarmMessage', messageObj);
    };

    function authenticateSocketConnection() {

        if (connection) {
            var jsonRPC = {
                'jsonrpc': '2.0',
                'method': 'authorise',
                'params': [$rootScope.session_id],
                'id': KatGuiUtil.generateUUID()
            };

            connection.send(JSON.stringify(jsonRPC));
        }
    }

    return api;
}
})();
