(function () {

    angular.module('katGui')
        .controller('ProcessControlCtrl', ProcessControlCtrl);

    function ProcessControlCtrl($rootScope, $scope, SensorsService, KatGuiUtil, $interval, $log, ConfigService, ControlService) {

        var vm = this;

        vm.resourcesNames = {};
        vm.guid = KatGuiUtil.generateUUID();
        vm.disconnectIssued = false;
        vm.connectInterval = null;
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
            SensorsService.listResources()
                .then(function () {
                    for (var key in SensorsService.resources) {
                        vm.resourcesNames[key] = {
                            name: key,
                            sensors: {},
                            address: SensorsService.resources[key].address,
                            connected: false
                        };
                        vm.resourcesNames[key].nodeman = vm.systemConfig['monitor:monctl'][key]? 'nm_monctl' : 'nm_proxy';
                        SensorsService.connectResourceSensorNamesLiveFeedWithListSurroundSubscribeWithWildCard(
                            key, sensorNameList[0], vm.guid, 'event', 0, 0);
                        SensorsService.connectResourceSensorNamesLiveFeedWithListSurroundSubscribeWithWildCard(
                            key, sensorNameList[1], vm.guid, 'event', 0, 0);
                    }

                    SensorsService.connectResourceSensorNameLiveFeed(
                        'sys', 'monitor_*', vm.guid, 'event', 0, 0);
                    SensorsService.connectResourceSensorNameLiveFeed(
                        'sys', 'config_label', vm.guid, 'event', 0, 0);
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

        vm.connectListeners();


        var unbindUpdate = $rootScope.$on('sensorsServerUpdateMessage', function (event, sensor) {
            var strList = sensor.name.split(':');
            var sensorNameList = strList[1].split('.');
            $scope.$apply(function () {
                if (sensorNameList[1].indexOf('monitor_') === 0) {
                    var resource = sensorNameList[1].split('monitor_')[1];
                    vm.resourcesNames[resource].connected = sensor.value.value;
                } else {

                    vm.resourcesNames[sensorNameList[0]].sensors[sensorNameList[1]] = {
                        name: sensorNameList[1],
                        value: sensor.value.value
                    };
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
