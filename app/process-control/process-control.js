(function() {

    angular.module('katGui')
        .controller('ProcessControlCtrl', ProcessControlCtrl);

    function ProcessControlCtrl($rootScope, $scope, MonitorService, KatGuiUtil, $interval, $log, $timeout, ConfigService,
        ControlService, MOMENT_DATETIME_FORMAT, NotifyService, ConfigService, $state, USER_ROLES) {

        var vm = this;
        vm.sensorValues = {};
        vm.nodemans = {};
        vm.showProgress = false;
        vm.processSensors = ['running', 'args', 'pid', 'return_code'];
        vm.sensorsRegex = vm.processSensors.join('|');
        vm.resourcesNames = []

        vm.initSensors = function() {
            vm.nodemans = {};
            vm.showProgress = true;
            ConfigService.getSystemConfig()
                .then(function() {
                    var nodeNames = Object.keys(ConfigService.systemConfig.nodes).map(function(node) {
                        return 'nm_' + node;
                    });
                    nodeNames.sort();
                    nodeNames.forEach(function(nodeName, index) {
                        if (!vm.nodemans[nodeName]) {
                            vm.nodemans[nodeName] = {
                                processes: []
                            };
                        }
                    });
                    MonitorService.listSensorsHttp(nodeNames.join(','), vm.sensorsRegex).then(function(result) {
                        result.data.forEach(function(sensor) {
                            MonitorService.subscribeSensor(sensor);
                            if (sensor.name.endsWith('running') && sensor.original_name) {
                                // e.g. nm_monctl.anc.running
                                var splitName = sensor.original_name.split('.');
                                var processName = splitName[1];
                                if (!vm.nodemans[sensor.component]) {
                                    vm.nodemans[sensor.component] = {
                                        processes: []
                                    };
                                }
                                vm.nodemans[sensor.component].processes.push({
                                    name: processName,
                                    runningSensor: sensor.name,
                                    nm: sensor.component
                                });
                            }
                            vm.sensorValues[sensor.name] = sensor;
                            vm.showProgress = false;
                        });
                    }, function(error) {
                        $log.error(error);
                        vm.showProgress = false;
                    });
                });

            if (vm.resourcesNames.length === 0) {
                ConfigService.listResourcesFromConfig().then(function() {
                    for (var name in ConfigService.resources) {
                        vm.resourcesNames.push(name);
                    }
                });
            }
        };

        vm.collapseAll = function(nm_name) {
            vm.nodemans[nm_name].processes.forEach(function(process) {
                vm.toggleProcessDetail(process, false);
            });
        };

        vm.expandAll = function(nm_name) {
            vm.nodemans[nm_name].processes.forEach(function(process) {
                vm.toggleProcessDetail(process, true);
            });
        };

        vm.toggleProcessDetail = function(process, show) {
            if (show !== undefined) {
                vm.sensorValues[process.runningSensor].showDetail = show;
            } else {
                vm.sensorValues[process.runningSensor].showDetail = !vm.sensorValues[process.runningSensor].showDetail;
            }
            if (vm.sensorValues[process.runningSensor].showDetail) {
                process.sensors = vm.processSensors.map(function(processSensor) {
                    var sensor = vm.sensorValues[[process.nm, process.name, processSensor].join('_')];
                    sensor.shortName = processSensor;
                    return sensor;
                });
            }
        };

        vm.stopProcess = function(nm, process) {
            ControlService.stopProcess(nm, process.name);
        };

        vm.startProcess = function(nm, process) {
            ControlService.startProcess(nm, process.name);
        };

        vm.restartProcess = function(nm, process) {
            ControlService.restartProcess(nm, process.name);
        };

        vm.killProcess = function(nm, process) {
            ControlService.killProcess(nm, process.name);
        };

        vm.sortNodemans = function(nmKey) {
            if (nmKey.startsWith("nm_sim") || nmKey.startsWith("nm_proxy")) {
                // sort nm_proxy and nm_sim last
                return "z" + nmKey;
            } else {
                return nmKey;
            }
        };

        vm.tailProcess = function(nm, process) {
            ControlService.tailProcess(nm, process.name, 30).then(function(result) {
                var splitMessage = result.data.result.split(' ');
                var message = KatGuiUtil.sanitizeKATCPMessage(splitMessage[2]);
                if (splitMessage.length > 2 && splitMessage[1] !== 'ok') {
                    NotifyService.showPreDialog('Error tailing file', message);
                } else {
                    NotifyService.showPreDialog('Tail of ' + process.name + ' (last 30 lines)', message);
                }
            }, function(error) {
                NotifyService.showPreDialog('Error displaying tail of ' + process.name, error.data.err_msg);
            });
        };

        vm.navigateToSensorList = function(process) {
            if (vm.resourcesNames.indexOf(process.name) > -1) {
                $state.go('sensor-list',
                {
                    component: process.name
                });
            }
            else {
                NotifyService.showSimpleDialog(
                  'Could not navigate to sensor list',
                  process.name + ' Possibly not a Proxy nor a Component');
            }
        }

        vm.navigateToLogtrail = function(process) {
            $rootScope.openLogtrailInNewTab(process.name)
        };

        var unbindUpdate = $rootScope.$on('sensorUpdateMessage', function(event, sensor, subject) {
            if (sensor.name.search(vm.sensorsRegex) < 0) {
                return;
            }
            if (!vm.sensorValues[sensor.name]) {
                vm.sensorValues[sensor.name] = sensor;
            } else {
                vm.sensorValues[sensor.name].value = sensor.value;
            }
        });

        vm.initSensors();

        var unbindReconnected = $rootScope.$on('websocketReconnected', vm.initSensors);

        $scope.$on('$destroy', function() {
            for (var sensorName in vm.sensorValues) {
                MonitorService.unsubscribeSensor(vm.sensorValues[sensorName]);
            }
            unbindUpdate();
            unbindReconnected();
        });
    }
})();
