(function () {

    angular.module('katGui.health')
        .controller('ReceptorHealthCtrl', ReceptorHealthCtrl);

    function ReceptorHealthCtrl($log, $timeout, $interval, $rootScope, $stateParams, $scope, $localStorage, MonitorService,
                                ConfigService, StatusService, NotifyService) {

        var vm = this;
        vm.receptorHealthTree = ConfigService.receptorHealthTree;
        vm.receptorList = StatusService.receptors;
        vm.subscribedSensors = [];
        vm.mapTypes = ['Pack', 'Partition', 'Icicle', 'Sunburst'];
        vm.receptorSensorsRegex = '';
        vm.receptorAggSensorsRegex = '';
        vm.selectedHealthView = $stateParams.healthView ? $stateParams.healthView : '';
        if ($localStorage['receptorHealthDisplayMapType']) {
            vm.mapType = $localStorage['receptorHealthDisplayMapType'];
        }

        if ($localStorage['receptorHealthDisplaySize']) {
            vm.treeChartSize = JSON.parse($localStorage['receptorHealthDisplaySize']);
        } else {
            vm.treeChartSize = {width: 480, height: 480};
        }

        if (!vm.mapType) {
            vm.mapType = 'Sunburst';
        }

        vm.openMenuItems = function($event) {
            var sunburstScopeTooltip = angular.element($event.currentTarget)
                                        .prop('sunburstScopeTooltip');
            vm.sensor = sunburstScopeTooltip.attr("sensor");
            vm.sensorValue = StatusService.sensorValues[vm.sensor];
        }

        vm.openUserLog = function() {
            var content = '';
            var endTime = '';
            var compoundTags = [];
            var startTime = $rootScope.utcDateTime;

            content = "Sensor: " + vm.sensor +
            "\nStatus: " + vm.sensorValue.status +
            "\nValue: " + vm.sensorValue.value

            if (vm.sensorValue) {
                sensorArray = []
                componentName = vm.sensor.split(/_(.+)/)[0]
                deviceName = vm.sensor.split(/_(.+)/)[1].split(/_(.+)/)[0]
                sensorName = vm.sensor.split(/_(.+)/)[1].split(/_(.+)/)[1]
                sensorArray.push(componentName)
                sensorArray.push(deviceName)
                sensorArray.push(sensorName)
                if (componentName && deviceName && sensorName) {
                    var fullSensorName = sensorArray.join('.')
                }
                compoundTag = $rootScope.deriveCompoundTag(fullSensorName)
                if (compoundTag) {
                    compoundTags.push(compoundTag)
                }
            }

            var newUserLog = {
                start_time: startTime,
                end_time: endTime,
                tags: [],
                compound_tags: compoundTags,
                user_id: $rootScope.currentUser.id,
                content: content,
                attachments: []
            };
            $rootScope.editUserLog(newUserLog, event);
        };

        vm.menuItems = [
            {
              text:"Add user log...",
              callback: vm.openUserLog
            },
        ];

        vm.populateTree = function (parent, receptor) {
            if (parent.prefix) {
                StatusService.receptorAggSensors[parent.sensor] = 1;
            } else {
                StatusService.receptorSensors[parent.sensor] = 1;
            }
            if (parent.children && parent.children.length > 0) {
                parent.children.forEach(function (child) {
                    vm.populateTree(child, receptor);
                });
            } else if (parent.subs && parent.subs.length > 0) {
                parent.subs.forEach(function (sub) {
                    if (!parent.children) {
                        parent.children = [];
                    }
                    parent.children.push({name: sub, sensor: sub, hidden: true});
                    StatusService.receptorSensors[sub] = 1;
                });
            }
        };

        vm.chartSizeChanged = function () {
            //this function is implemented in receptor-health-items
            //this works because receptor-health-items inherits scope
            $localStorage['receptorHealthDisplaySize'] = JSON.stringify(vm.treeChartSize);
            vm.redrawCharts();
        };

        vm.mapTypeChanged = function () {
            $localStorage['receptorHealthDisplayMapType'] = vm.mapType;
            vm.redrawCharts();
        };

        ConfigService.getSystemConfig().then(function (systemConfig) {
            StatusService.controlledResources = systemConfig.katobs.controlled_resources.split(',');
            ConfigService.getStatusTreeForReceptor(vm.selectedHealthView)
                .then(function (result) {
                    ConfigService.getReceptorList()
                        .then(function (receptors) {
                            StatusService.receptorSensors = {'marked_in_maintenance': 1};
                            StatusService.receptorAggSensors = {};
                            StatusService.setReceptorsAndStatusTree(result.data, receptors);
                            StatusService.receptors.forEach(function (receptor) {
                                vm.populateTree(StatusService.statusData[receptor], receptor);
                            });
                            vm.initSensors();
                            vm.redrawCharts();
                        });
                });
        });

        vm.initSensors = function () {
            if (StatusService.receptorSensors) {
                ConfigService.getSystemConfig().then(function(systemConfig) {
                    vm.receptorAggSensorsRegex = Object.keys(StatusService.receptorAggSensors).join('|');
                    var monitorNodes = systemConfig.monitor.system_nodes.split(',').map(function (nodeName) {
                        return 'mon_' + nodeName;
                    });
                    MonitorService.listSensorsHttp(monitorNodes.join(','), vm.receptorAggSensorsRegex, true).then(function (result) {
                        result.data.forEach(function (sensor) {
                            MonitorService.subscribeSensor(sensor);
                            vm.subscribedSensors.push(sensor);
                            // replace mon_proxyN with agg_
                            if (sensor.name.startsWith('mon_')) {
                              sensor.name = sensor.name.replace(/^mon_.*agg_/, 'agg_');
                            }
                            StatusService.sensorValues[sensor.name] = sensor;
                            d3.select('.' + sensor.name).attr('class', sensor.status + '-child ' + sensor.name);
                        });
                    }, function (error) {
                        $log.error(error);
                    });
                });

                vm.receptorSensorsRegex = Object.keys(StatusService.receptorSensors).join('|');
                MonitorService.listSensorsHttp(StatusService.receptors.join(','), vm.receptorSensorsRegex, true).then(function (result) {
                    result.data.forEach(function (sensor) {
                        MonitorService.subscribeSensor(sensor);
                        vm.subscribedSensors.push(sensor);
                        StatusService.sensorValues[sensor.name] = sensor;
                        d3.select('.' + sensor.name).attr('class', sensor.status + '-child ' + sensor.name);
                    });
                }, function (error) {
                    $log.error(error);
                });
            }
        };

        var unbindUpdate = $rootScope.$on('sensorUpdateMessage', function (event, sensor, subject) {
            if (sensor.name.search(vm.receptorSensorsRegex) < 0 && sensor.name.search(vm.receptorAggSensorsRegex) < 0) {
                return;
            }
            // remove the mon_proxyN from the sensor name
            if (sensor.name.startsWith('mon_')) {
              sensor.name = sensor.name.replace(/^mon_.*agg_/, 'agg_');
            }
            StatusService.sensorValues[sensor.name] = sensor;
            d3.select('.' + sensor.name).attr('class', sensor.status + '-child ' + sensor.name);
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
