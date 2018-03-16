(function() {

    angular.module('katGui.healthsub', ['katGui', 'katGui.d3'])
        .controller('HealthCtrlSub', HealthCtrlSub);

    function HealthCtrlSub($rootScope, $scope, ConfigService, StatusService, NotifyService,
        MonitorService, d3Util, $timeout, $log) {

        var vm = this;
        var which = 'sub';
        ConfigService.loadAggregateSensorDetail();
        vm.subStatusTrees = StatusService.subStatusTrees;
        vm.sensorValues = {};
        vm.aggSensorValues = {};
        vm.subscribedSensors = [];
        vm.sensorsRegex = '';
        vm.getClassesOfSensor = StatusService.getClassesOfSensor;

        ConfigService.getStatusTreesForSub()
            .then(function(result) {
                StatusService.setSubStatusTrees(result.data);
                $timeout(vm.initSensors, 500);
            }, function() {
                NotifyService.showSimpleDialog(
                    "Error retrieving layout from katconf-webserver, is the server running?");
            });
        ConfigService.getSystemConfig();

        vm.initSensors = function() {
            if (StatusService.subStatusTrees) {
                var components = {};
                StatusService.subStatusTrees.forEach(function(tree) {
                    tree.subs.forEach(function(sub) {
                        if (!components[sub.component]) {
                            components[sub.component] = {
                                sensors: []
                            };
                        }
                        components[sub.component].sensors.push(sub.sensor);
                    });
                });
                var componentSensors = [];
                for (var component in components) {
                    componentSensors.push(components[component].sensors.join('|'));
                }
                vm.sensorsRegex = componentSensors.join('|');
                MonitorService.listSensorsHttp('all', vm.sensorsRegex).then(function (result) {
                    result.data.forEach(function (sensor) {
                        MonitorService.subscribeSensor(sensor);
                        vm.subscribedSensors.push(sensor);
                        vm.sensorValues[sensor.name] = sensor;
                        var aggIndex = sensor.name.indexOf('agg_');
                        if (aggIndex > -1) {
                            vm.aggSensorValues['all_' + sensor.name.slice(aggIndex, sensor.name.length)] = sensor;
                        }
                    });
                }, function(error) {
                    $log.error(error);
                });

                vm.sensorsRegex += '|resources_in_maintenance';
                MonitorService.listSensorsHttp('katpool', 'resources_in_maintenance', true).then(function (result) {
                    result.data.forEach(function (sensor) {
                        MonitorService.subscribeSensor(sensor);
                        vm.subscribedSensors.push(sensor);
                        vm.sensorValues[sensor.name] = sensor;
                    });
                }, function(error) {
                    $log.error(error);
                });
            }
        };

        vm.getClassesOfSensor = function(sub) {
            var sensorName = sub.component + '_' + sub.sensor;
            var statusClassResult = [sensorName, 'md-whiteframe-z1'];
            var sensorValue = vm.sensorValues[sensorName] || vm.aggSensorValues[sensorName];
            if (sensorValue) {
                var inMaintenance = vm.sensorValues.katpool_resources_in_maintenance;
                if (inMaintenance && (
                    inMaintenance.value.indexOf(sub.sensor.replace('agg_', '').split('_')[0]) > -1 ||
                    inMaintenance.value.indexOf(sub.component) > -1)) {
                    statusClassResult.push('in-maintenance-child');
                }
                statusClassResult.push(sensorValue.status + '-item');
            } else {
                statusClassResult.push('inactive-item');
            }
            return statusClassResult.join(' ');
        };

        vm.subMouseUp = function(sub, event) {
            if (sub.sensor.indexOf('agg_') > -1) {
                d3Util.showDialogForAggregateSensorInfo(sub);
            }
        };

        vm.getSensorTextFromSub = function(sub) {
            var sensorName = sub.component + '_' + sub.sensor;
            var sensor = vm.sensorValues[sensorName] || vm.aggSensorValues[sensorName];
            var sensorText = '';
            if (sensor) {
                sensorText = sensor.name + ' - ' + sensor.status + ' - ' + sensor.value;
            }
            return sensorText;
        };

        var unbindUpdate = $rootScope.$on('sensorUpdateMessage', function(event, sensor, subject) {
            if (sensor.name.search(vm.sensorsRegex) < 0) {
                return;
            }
            vm.sensorValues[sensor.name] = sensor;
            var aggIndex = sensor.name.indexOf('agg_');
            if (aggIndex > -1) {
                vm.aggSensorValues['all_' + sensor.name.slice(aggIndex, sensor.name.length)] = sensor;
            }
        });

        var unbindReconnected = $rootScope.$on('websocketReconnected', vm.initSensors);

        $scope.$on('$destroy', function() {
            vm.subscribedSensors.forEach(function(sensor) {
                MonitorService.unsubscribeSensor(sensor);
            });
            unbindUpdate();
            unbindReconnected();
        });
    }
})
();
