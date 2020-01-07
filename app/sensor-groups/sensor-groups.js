(function () {

    angular.module('katGui')
        .controller('SensorGroupsCtrl', SensorGroupsCtrl);

    function SensorGroupsCtrl($scope, $rootScope, MonitorService, $timeout, $interval, NotifyService,
                              $stateParams, ConfigService, $log, MOMENT_DATETIME_FORMAT, KatGuiUtil) {

        var vm = this;
        vm.sensorGroups = {};
        vm.sensorGroupList = [];
        vm.subscribedSensors = [];
        vm.sensorsGroupBeingDisplayed = '';
        vm.sensorValues = {};
        vm.hideNominalSensors = false;
        vm.sensorsRegex = '';
        vm.band = $stateParams.band

        ConfigService.loadSensorGroups().then(function (result) {
            vm.sensorGroupList = Object.keys(result);
            vm.sensorGroups = result;
            /* We need to wait for the results first, before we automatically select
            the group, otherwise we will select from nothing.*/
            vm.selectSensorGroup();
        });

        vm.sensorsOrderByFields = [
            {label: 'Name', value: 'name'},
            {label: 'Timestamp', value: 'timestamp'},
            {label: 'Received Timestamp', value: 'received_timestamp'},
            {label: 'Status', value: 'status'},
            {label: 'Value', value: 'value'}
        ];

        vm.initSensors = function () {
            if (vm.sensorsGroupBeingDisplayed) {
                vm.showProgress = true;
                var sensorsRegex = vm.sensorGroups[vm.sensorsGroupBeingDisplayed].sensors.split('|');
                sensorsRegex.forEach(function(sensorRegex, index) {
                    var sensorSplitList = sensorRegex.split(':');
                    var component = sensorSplitList[0];
                    var regex = sensorSplitList[1];
                    if (index > 0) {
                        vm.sensorsRegex += '|';
                    }
                    vm.sensorsRegex += regex;
                    MonitorService.listSensorsHttp(component, regex).then(function (result) {
                        result.data.forEach(function(sensor) {
                            vm.showProgress = false;
                            MonitorService.subscribeSensor(sensor);
                            vm.subscribedSensors.push(sensor);
                            vm.sensorValues[sensor.name] = sensor;
                            vm.sensorValues[sensor.name].date = moment.utc(sensor.time, 'X').format(MOMENT_DATETIME_FORMAT);
                        }, function (error) {
                            vm.showProgress = false;
                            $log.error(error);
                        });
                    }, function(error) {
                        $log.error(error);
                    });
                });
            }
        };

        vm.setSensorGroupStrategy = function (sensorGroupName) {
            vm.sensorsRegex = '';
            vm.subscribedSensors.forEach(function (sensor) {
                MonitorService.unsubscribeSensor(sensor);
            });

            vm.subscribedSensors = [];
            vm.sensorValues = {};
            vm.sensorsGroupBeingDisplayed = sensorGroupName;
            vm.initSensors();
        };

        vm.selectSensorGroup = function() {
            /* Select the 'Dig BAND(l, x, s, u) Sync remaining' sensor group
            the only time the band will not be empty is when we are routing
            from the scheduler display. */

            if(vm.band && vm.band != '') {
               var sensorGroupName = 'Dig ' + vm.band + ' Sync remaining'
               vm.setSensorGroupStrategy(sensorGroupName)
            }
        };

        vm.displaySensorValue = function ($event, sensor) {
            NotifyService.showHTMLPreSensorDialog(sensor.python_identifier + ' value at ' + sensor.received_timestamp, sensor, $event);
        };

        vm.setSensorsOrderBy = function (column) {
            var newOrderBy = _.findWhere(vm.sensorsOrderByFields, {value: column});
            if ((vm.sensorsOrderBy || {}).value === column) {
                if (newOrderBy.reverse === undefined) {
                    newOrderBy.reverse = true;
                } else if (newOrderBy.reverse) {
                    newOrderBy.reverse = undefined;
                    newOrderBy = null;
                }
            }
            vm.sensorsOrderBy = newOrderBy;
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        };

        vm.setSensorsOrderBy('name');

        vm.sensorClass = function (status) {
            return status + '-sensor-list-item';
        };

        vm.filterByNotNominal = function (sensor) {
            return !vm.hideNominalSensors || vm.hideNominalSensors && sensor.status !== 'nominal';
        };

        var unbindSensorUpdates = $rootScope.$on('sensorUpdateMessage', function(event, sensor, subject) {
            if (!vm.sensorsRegex || sensor.name.search(vm.sensorsRegex) < 0) {
                return;
            }
            if (vm.sensorValues[sensor.name]) {
                for (var key in sensor) {
                    vm.sensorValues[sensor.name][key] = sensor[key];
                }
            } else {
                vm.sensorValues[sensor.name] = sensor;
            }
            vm.sensorValues[sensor.name].date = moment.utc(sensor.time, 'X').format(MOMENT_DATETIME_FORMAT);
        });

        var unbindReconnected = $rootScope.$on('websocketReconnected', vm.initSensors);

        vm.initSensors();

        $scope.$on('$destroy', function () {
            vm.subscribedSensors.forEach(function (sensor) {
                MonitorService.unsubscribeSensor(sensor);
            });
            unbindSensorUpdates();
            unbindReconnected();
        });
    }
})();
