(function () {

    angular.module('katGui')
        .controller('ProcessControlCtrl', ProcessControlCtrl);

    function ProcessControlCtrl($rootScope, $scope, SensorsService, KatGuiUtil, $interval, $log, ConfigService, ControlService, $timeout) {

        var vm = this;

        vm.resourcesNames = {};
        vm.guid = KatGuiUtil.generateUUID();
        vm.disconnectIssued = false;
        vm.connectInterval = null;
        vm.detailedProcesses = { nm_monctl: {}, nm_proxy: {}};
        vm.sensorsToDisplay = {};
        vm.nodemans = ['nm_monctl', 'nm_proxy'];
        ControlService.connectListener();

        ConfigService.getSystemConfig().then(function (systemConfig) {
           vm.systemConfig = systemConfig;
        });

        var sensorNameList = ['version*', 'build*'];

        vm.connectListeners = function () {
            SensorsService.connectListener()
                .then(function () {
                    vm.initSensors();

                    if (vm.connectInterval) {
                        $interval.cancel(vm.connectInterval);
                        vm.connectInterval = null;
                        if (!vm.disconnectIssued) {
                            $rootScope.showSimpleToast('Reconnected :)');
                        }
                    }
                }, function () {
                    $log.error('Could not establish sensor connection. Retrying every 10 seconds.');
                    if (!vm.connectInterval) {
                        vm.connectInterval = $interval(vm.connectListeners, 10000);
                    }
                });
            vm.handleSocketTimeout();
        };

        vm.handleSocketTimeout = function () {
            SensorsService.getTimeoutPromise()
                .then(function () {
                    if (!vm.disconnectIssued) {
                        $rootScope.showSimpleToast('Connection timeout! Attempting to reconnect...');
                        if (!vm.connectInterval) {
                            vm.connectInterval = $interval(vm.connectListeners, 10000);
                            vm.connectListeners();
                        }
                    }
                });
        };

        vm.initSensors = function () {
            SensorsService.resources = {};
            for (var i in vm.nodemans) {
                SensorsService.resources[vm.nodemans[i]] = {};
            }
            vm.listResourceSensors(vm.nodemans[0]);
            $timeout(function () {
                vm.listResourceSensors(vm.nodemans[1]);
            }, 1000);
        };

        vm.listResourceSensors = function (resource) {
            SensorsService.listResourceSensors(resource)
                .then(function (result) {
                    SensorsService.resources[result.resource].sensorsList.forEach(function (item) {
                        if (item.name.indexOf('.') > -1) {
                            var processName = item.name.split('.')[0];
                            if (!vm.detailedProcesses[result.resource][processName]) {
                                vm.detailedProcesses[result.resource][processName] = {sensors: {}};
                            }
                            vm.sensorsToDisplay[item.python_identifier] = item;
                            vm.detailedProcesses[result.resource][processName].sensors[item.python_identifier] = item;
                            if (item.python_identifier.indexOf('running') !== -1) {
                                SensorsService.connectResourceSensorNameLiveFeed(
                                    result.resource, item.python_identifier, vm.guid, 'event-rate', 3, 3);
                            } else {
                                SensorsService.connectResourceSensorNameLiveFeed(
                                    result.resource, item.python_identifier, vm.guid, 'event-rate', 3, 120);
                            }
                        }
                    });
                });
        };

        vm.processCommand = function (key, command) {
            if (vm.resourcesNames[key].nodeman) {
                ControlService.sendControlCommand(vm.resourcesNames[key].nodeman, command, key);
            } else {
                $rootScope.showSimpleDialog(
                    'Error Sending Request',
                    'Could not send process request because KATGUI does not know which node manager to use for ' + key + '.');
            }
        };

        vm.processNMCommand = function (nm, key, command) {
            ControlService.sendControlCommand(nm, command, key);
        };

        $timeout(vm.connectListeners, 500);

        var unbindUpdate = $rootScope.$on('sensorsServerUpdateMessage', function (event, sensor) {
            var strList = sensor.name.split(':');
            var sensorNameList = strList[1].split('.');
            $scope.$apply(function () {
                if (vm.sensorsToDisplay[sensorNameList[1]]) {
                    vm.sensorsToDisplay[sensorNameList[1]].value = sensor.value.value;
                    vm.sensorsToDisplay[sensorNameList[1]].timestamp = sensor.value.timestamp;
                    vm.sensorsToDisplay[sensorNameList[1]].date = moment.utc(sensor.value.timestamp, 'X').format('HH:mm:ss DD-MM-YYYY');
                    vm.sensorsToDisplay[sensorNameList[1]].received_timestamp = sensor.value.received_timestamp;
                    vm.sensorsToDisplay[sensorNameList[1]].status = sensor.value.status;
                    vm.sensorsToDisplay[sensorNameList[1]].name = sensorNameList[1];
                } else {
                    $log.error('Dangling sensor message');
                    $log.error(sensor);
                }
            });
        });

        $scope.objectKeys = function (obj) {
            return Object.keys(obj);
        };

        $scope.$on('$destroy', function () {
            //todo check katportal if this is neccesary
            for (var key in SensorsService.resources) {
                for (var i in sensorNameList) {
                    SensorsService.unsubscribe(key + '.*' + sensorNameList[i] + '*', vm.guid);
                }
                SensorsService.removeResourceListeners(key);
            }
            SensorsService.unsubscribe('sys.config_label', vm.guid);
            SensorsService.unsubscribe('sys.monitor*', vm.guid);
            unbindUpdate();
            vm.disconnectIssued = true;
            SensorsService.disconnectListener();
        });
    }
})();
