/*jshint loopfunc: true */
(function () {
    angular.module('katGui.services', ['katGui.util', 'ngStorage'])
        .service('AlarmsService', AlarmsService);

    function AlarmsService($rootScope, ConfigService) {

        var api = {};
        api.alarmsData = [];
        $rootScope.$on('alarmMessage', api.receivedAlarmMessage);

        api.tailAlarmsHistory = function () {
            if (ConfigService.KATObsPortalURL) {
                window.open(ConfigService.KATObsPortalURL + "/logfile/alarms.log").focus();
            } else {
                $rootScope.showSimpleDialog('Error Viewing Progress', 'There is no KATObsPortal IP defined in config, please contact CAM support.');
            }
        };

        api.receivedAlarmMessage = function (messageName, messageObj) {

            var alarmValues = messageObj.value.toString().split(',');
            messageObj.severity = alarmValues[0];
            messageObj.priority = alarmValues[1];
            messageObj.name = messageName.replace('mon:kataware.alarm_', '');
            messageObj.timestamp = messageObj.timestamp;
            messageObj.date = moment.utc(messageObj.timestamp, 'X').format('HH:mm:ss DD-MM-\'YY');

            var foundAlarm = _.findWhere(api.alarmsData, {name: messageObj.name});
            if (foundAlarm) {
                foundAlarm.priority = messageObj.priority;
                foundAlarm.severity = messageObj.severity;
                foundAlarm.timestamp = messageObj.timestamp;
                foundAlarm.date = messageObj.date;
                foundAlarm.value = messageObj.value;
                foundAlarm.selected = false;
            }
            if (!foundAlarm) {
                api.alarmsData.push(messageObj);
            }
        };
        return api;
    }
})();
