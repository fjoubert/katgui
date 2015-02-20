(function () {

    angular.module('katGui.services')
        .service('StatusService', StatusService);

    function StatusService($rootScope) {

        var api = {};
        api.statusData = {};

        api.setReceptorsAndStatusTree = function (statusTree, receptors) {
            receptors.forEach(function (receptor) {
                api.statusData[receptor] = { name: receptor, sensor: statusTree.sensor, status_children: statusTree.children, children: [] };
            });
        };

        api.messageReceived = function (messageName, message) {
            for (var attr in api.statusData) {
               if (messageName.indexOf(attr) > -1) {
                   var existingSensor = _.findWhere(api.statusData[attr].children, {name: messageName});
                   if (existingSensor) {
                       for (var sensorAttr in message) {
                           existingSensor.objValue[sensorAttr] = message[sensorAttr];
                       }
                       $rootScope.$emit('sensorUpdateReceived', {name: messageName, objValue: message});
                   } else {
                       api.statusData[attr].children.push({name: messageName, objValue: message, blockValue: 100});
                   }
               }
            }
        };

        api.messageReceivedSensorsOk = function (messageName, message) {
            for (var attr in api.statusData) {
                if (messageName.indexOf(attr) > -1) {
                    var existingSensor = api.statusData[messageName.split(':')[0]];
                    if (existingSensor) {
                        if (!existingSensor.sensorValue) {
                            existingSensor.sensorValue = {};
                        }
                        for (var sensorAttr in message) {
                            existingSensor.sensorValue[sensorAttr] = message[sensorAttr];
                        }

                        $rootScope.$emit('sensorUpdateReceived', {name: messageName, objValue: message});
                    } else {
                        existingSensor.sensorValue = message;
                    }
                }
            }
        };

        return api;
    }
})();
