(function () {

    angular.module('katGui.health')
        .controller('CorrelatorHealthCtrl', CorrelatorHealthCtrl);

    function CorrelatorHealthCtrl($log, $timeout, $interval, $rootScope, $scope, $localStorage, MonitorService,
                                ConfigService, StatusService, NotifyService) {

        var vm = this;
        vm.correlatorHealthTree = ConfigService.correlatorHealthTree;
        vm.correlatorList = StatusService.correlators;
        vm.subscribedSensors = [];
        vm.mapTypes = ['Pack', 'Partition', 'Icicle', 'Sunburst'];
        vm.correlatorSensorsRegex = '';
        vm.correlatorAggSensorsRegex = '';

        if ($localStorage['correlatorHealthDisplayMapType']) {
            vm.mapType = $localStorage['correlatorHealthDisplayMapType'];
        }

        if ($localStorage['correlatorHealthDisplaySize']) {
            vm.treeChartSize = JSON.parse($localStorage['correlatorHealthDisplaySize']);
        } else {
            vm.treeChartSize = {width: 480, height: 480};
        }

        if (!vm.mapType) {
            vm.mapType = 'Sunburst';
        }

        vm.populateTree = function (parent, correlator) {
            if (parent.prefix) {
                StatusService.correlatorAggSensors[parent.sensor] = 1;
            } else {
                StatusService.correlatorSensors[parent.sensor] = 1;
            }
            if (parent.children && parent.children.length > 0) {
                parent.children.forEach(function (child) {
                    vm.populateTree(child, correlator);
                });
            } else if (parent.subs && parent.subs.length > 0) {
                parent.subs.forEach(function (sub) {
                    if (!parent.children) {
                        parent.children = [];
                    }
                    parent.children.push({name: sub, sensor: sub, hidden: true});
                    StatusService.correlatorSensors[sub] = 1;
                });
            }
        };

        vm.chartSizeChanged = function () {
            //this function is implemented in correlator-health-items
            //this works because correlator-health-items inherits scope
            $localStorage['correlatorHealthDisplaySize'] = JSON.stringify(vm.treeChartSize);
            vm.redrawCharts();
        };

        vm.mapTypeChanged = function () {
            $localStorage['correlatorHealthDisplayMapType'] = vm.mapType;
            vm.redrawCharts();
        };

        ConfigService.getSystemConfig().then(function (systemConfig) {
            StatusService.controlledResources = systemConfig.katobs.controlled_resources.split(',');
            ConfigService.getStatusTreeForCorrelator()
                .then(function (result) {
                    ConfigService.getCorrelatorList()
                        .then(function (correlators) {
                            StatusService.correlatorSensors = {'marked_in_maintenance': 1};
                            StatusService.correlatorAggSensors = {};
                            StatusService.setCorrelatorsAndStatusTree(result.data, correlators);
                            StatusService.correlators.forEach(function (correlator) {
                                vm.populateTree(StatusService.statusData[correlator], correlator);
                            });
                            vm.initSensors();
                            vm.redrawCharts();
                        });
                });
        });

        vm.initSensors = function () {
            if (StatusService.correlatorSensors) {
                ConfigService.getSystemConfig().then(function(systemConfig) {
                    vm.correlatorAggSensorsRegex = Object.keys(StatusService.correlatorAggSensors).join('|');
                    var monitorNodes = systemConfig.monitor.system_nodes.split(',').map(function (nodeName) {
                        return 'mon_' + nodeName;
                    });
                    MonitorService.listSensorsHttp(monitorNodes.join(','), vm.correlatorAggSensorsRegex, true).then(function (result) {
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

                vm.correlatorSensorsRegex = Object.keys(StatusService.correlatorSensors).join('|');
                MonitorService.listSensorsHttp(StatusService.correlators.join(','), vm.correlatorSensorsRegex, true).then(function (result) {
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
            if (sensor.name.search(vm.correlatorSensorsRegex) < 0 && sensor.name.search(vm.correlatorAggSensorsRegex) < 0) {
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
