(function() {

    angular.module('katGui.health')
        .controller('ConfigHealthViewCtrl', ConfigHealthViewCtrl);

    function ConfigHealthViewCtrl($log, $interval, $rootScope, $scope, $localStorage, MonitorService,
                                  ConfigService, StatusService, NotifyService, $stateParams) {

        var vm = this;
        vm.mapTypes = ['Pack', 'Partition', 'Icicle', 'Sunburst'];
        vm.configHealthViews = {};
        vm.configItemsSelect = [];
        vm.subscribedSensors = [];
        vm.selectedConfigView = $stateParams.configItem ? $stateParams.configItem : '';

        if ($localStorage['configHealthDisplayMapType']) {
            vm.mapType = $localStorage['configHealthDisplayMapType'];
        }

        if ($localStorage['configHealthDisplaySize']) {
            vm.treeChartSize = JSON.parse($localStorage['configHealthDisplaySize']);
        } else {
            vm.treeChartSize = {
                width: 720,
                height: 720
            };
        }

        if (!vm.mapType) {
            vm.mapType = 'Sunburst';
        }

        vm.populateSensorNames = function(viewName, parent) {
            if (!StatusService.configHealthSensors[viewName]) {
                StatusService.configHealthSensors[viewName] = {
                    component: parent.component,
                    sensors: []
                };
            };
            // Only populate if parent.sensor defined
            if (parent.sensor) {
                if (parent.component) {
                    if (parent.component != 'all' )
                        StatusService.configHealthSensors[viewName].sensors.push(parent.component+'_'+parent.sensor);
                    else
                        StatusService.configHealthSensors[viewName].sensors.push(parent.sensor);
                }
                else
                    StatusService.configHealthSensors[viewName].sensors.push(parent.sensor);
            };
            if (parent.children && parent.children.length > 0) {
                parent.children.forEach(function(child) {
                    vm.populateSensorNames(viewName, child);
                });
            }
        };

        vm.chartSizeChanged = function() {
            $localStorage['configHealthDisplaySize'] = JSON.stringify(vm.treeChartSize);
            vm.redrawCharts();
        };

        vm.mapTypeChanged = function() {
            $localStorage['configHealthDisplayMapType'] = vm.mapType;
            vm.redrawCharts();
        };

        ConfigService.getConfigHealthViews().then(
            function(result) {
                vm.configHealthViews = result.data;
                Object.keys(vm.configHealthViews).forEach(function (viewKey) {
                    vm.configHealthViews[viewKey].forEach(function (view) {
                        vm.populateSensorNames(viewKey, view);
                    });
                });
                $rootScope.configHealthViews = Object.keys(vm.configHealthViews);
                vm.redrawCharts();
                vm.initSensors();
            },
            function(error) {
                $log.error(error);
                NotifyService.showSimpleDialog("Error retrieving config health views from katconf-webserver, is the service running?");
            });

        vm.initSensors = function() {
            if (vm.selectedConfigView) {
                vm.subscribedSensors.forEach(function (sensor) {
                    MonitorService.unsubscribeSensor(sensor);
                });
                vm.subscribedSensors = [];
                var componentSensors = {};
                var view = StatusService.configHealthSensors[vm.selectedConfigView];
                if (StatusService.configHealthSensors[vm.selectedConfigView]) {
                    MonitorService.listSensorsHttp('all', view.sensors.join('|')).then(function (result) {
                        result.data.forEach(function (sensor) {
                            MonitorService.subscribeSensor(sensor);
                            vm.subscribedSensors.push(sensor);
                            StatusService.sensorValues[sensor.name] = sensor;
                            d3.selectAll('.' + sensor.name).attr('class', sensor.status + '-child ' + sensor.name);
                        });
                    }, function(error) {
                        $log.error(error);
                    });
                }
            }
        };

        vm.redrawCharts = function () {
            $rootScope.$emit('redrawChartMessage', {size: vm.treeChartSize});
        };

        vm.getJsonKey = function(jsonArray, jsonValue) {
            angular.forEach(jsonArray, function(value, index) {
            for(var key in value) {
                if (value.name === jsonValue) {
                    results = index;
                }
            }
            });
            return results;
        };

        vm.getDiffSensors = function (array1, array2) {
            names1 = [];
            names2 = [];
            sensors = [];

            array1.forEach(function (sensor) {
                names1.push(sensor.name)
            });
            array2.forEach(function (sensor) {
                names2.push(sensor.name)
            });
            diffNames = _.difference(names2, names1);
            for(var i in diffNames) {
                sensors.push(array2[vm.getJsonKey(array2, diffNames[i])])
            }
            return sensors;
        };

        vm.checkDiffSensors = function ()  {
            if (!vm.selectedConfigView.startsWith('cbf')) {
                return;
            }
            MonitorService.listSensorsHttp('cbf_1,cbf_2,cbf_3,cbf_4', 'device_status', true).then(function (result) {
                vm.newList = [];
                result.data.forEach(function (sensor) {
                    vm.newList.push(sensor);
                });

                if(vm.newList.length !== vm.subscribedSensors.length) {
                    if (vm.newList.length > vm.subscribedSensors.length) {
                        sensors = vm.getDiffSensors(vm.subscribedSensors, vm.newList);
                        sensors.forEach(function (sensor) {
                            MonitorService.subscribeSensor(sensor);
                            d3.selectAll('.' + sensor.name).attr('class', sensor.status + '-child ' + sensor.name);
                        });
                    }
                    else {
                        sensors = vm.getDiffSensors(vm.newList, vm.subscribedSensors);
                        sensors.forEach(function (sensor) {
                            MonitorService.unsubscribeSensor(sensor);
                            d3.selectAll('.' + sensor.name).attr('class', 'unknown' + '-child ' + sensor.name);
                        });
                    }
                    vm.subscribedSensors.forEach(function (sensor) {
                        MonitorService.unsubscribeSensor(sensor);
                    });
                    vm.subscribedSensors = [];
                    for( var sensor in vm.newList) {
                        MonitorService.subscribeSensor(vm.newList[sensor]);
                        vm.subscribedSensors.push(vm.newList[sensor]);
                    }
                }
            });
        };

        var unbindUpdate = $rootScope.$on('sensorUpdateMessage', function (event, sensor, subject) {
            vm.checkDiffSensors();
            var view = StatusService.configHealthSensors[vm.selectedConfigView];
            if (!view || sensor.name.search(view.sensors.join('|')) < 0) {
                return;
            }
            StatusService.sensorValues[sensor.name] = sensor;
            d3.selectAll('.' + sensor.name).attr('class', sensor.status + '-child ' + sensor.name);
        });

        var unbindReconnected = $rootScope.$on('websocketReconnected', vm.initSensors);

        $scope.$on('$destroy', function () {
            vm.subscribedSensors.forEach(function (sensor) {
                MonitorService.unsubscribeSensor(sensor);
            });
            unbindUpdate();
            unbindReconnected();
            StatusService.sensorValues = {};
        });
    }
})();
