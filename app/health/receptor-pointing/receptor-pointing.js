(function() {

    angular.module('katGui.health')
        .controller('ReceptorPointingCtrl', ReceptorPointingCtrl);

    function ReceptorPointingCtrl($rootScope, $scope, KatGuiUtil, ConfigService, MonitorService, $interval, $log,
        NotifyService, $timeout) {

        var vm = this;
        vm.receptors = {};
        vm.skyPlotData = [];
        vm.subscribedSensors = [];
        vm.targets = [];
        vm.targetsToDisplay = [];
        vm.filters = [];
        vm.selectedMinElevation = 15;
        vm.sensorValues = {};
        vm.trailDots = 30;

        // map subarray number to a colour
        vm.subarrayColors = d3.scale.category20().domain(d3.range(1,20));
        vm.subarrayNrs = [];

        vm.sensorsToConnectRegex = [
            'pos_actual_pointm_azim',
            'pos_actual_pointm_elev',
            'pos_request_pointm_azim',
            'pos_request_pointm_elev',
            'pos_request_base_dec',
            'pos_request_base_ra',
            'pos_delta_azim',
            'pos_delta_elev',
            'pos_delta_sky',
            'mode$',
            'inhibited$',
            'lock$',
            'target$',
            'windstow_active',
            'pool_resources$'
        ].join('|');

        vm.initSensors = function() {
            ConfigService.getSystemConfig()
                .then(function(systemConfig) {
                    systemConfig.system.ants.split(',').forEach(function(receptorName) {
                        var receptor = {
                            name: receptorName,
                            showHorizonMask: false,
                            subarrayColor: "#d7d7d7"
                        };
                        vm.receptors[receptorName] = receptor;
                        vm.subarrayNrs = systemConfig.system.subarray_nrs.split(',');
                    });
                    //systemConfig.system.ants example: m000,m001,m002
                    MonitorService.listSensorsHttp(systemConfig.system.ants, vm.sensorsToConnectRegex, true).then(function(result) {
                        result.data.forEach(function(sensor) {
                            MonitorService.subscribeSensor(sensor);
                            vm.subscribedSensors.push(sensor);
                            vm.sensorUpdateMessage(null, sensor);
                        });
                    }, function(error) {
                        $log.error(error);
                    });
                    var subarrayNames = systemConfig.subarrayNrs.map(function(subNr) {
                        return 'subarray_' + subNr;
                    });
                    MonitorService.listSensorsHttp(subarrayNames.join(','), 'pool_resources$', true).then(function(result) {
                        result.data.forEach(function(sensor) {
                            MonitorService.subscribeSensor(sensor);
                            vm.subscribedSensors.push(sensor);
                            vm.sensorUpdateMessage(null, sensor);
                        });
                    }, function(error) {
                        $log.error(error);
                    });
                });
        };

        vm.getSources = function() {
            if (vm.targets.length === 0) {
                ConfigService.getSources()
                    .then(function(result) {
                        vm.targets = result.data;
                        vm.filterChanged();

                        for (var i in vm.targets) {
                            for (var j in vm.targets[i].tags) {
                                vm.filters[vm.targets[i].tags[j]] = {
                                    name: vm.targets[i].tags[j]
                                };
                            }
                        }
                    }, function(error) {
                        $log.error(error);
                    });
            }
        };

        vm.filterChanged = function(filter) {
            vm.selectedTarget = null;
            vm.targetsToDisplay.splice(0, vm.targetsToDisplay.length);
            var namesAdded = [];
            for (var i in vm.targets) {
                if (namesAdded.indexOf(vm.targets[i].name) === -1 && (filter === '' || vm.targets[i].tags.indexOf(filter) > -1)) {
                    namesAdded.push(vm.targets[i].name);
                    vm.targetsToDisplay.push(vm.targets[i].name);
                }
            }
        };

        vm.drawSkyPlot = function(drawAll) {
            vm.skyPlotData = [];
            if (vm.selectedTarget || drawAll) {
                for (var i in vm.targets) {
                    if ((vm.selectedFilter === '' || vm.targets[i].tags.indexOf(vm.selectedFilter) > -1) &&
                        drawAll || vm.selectedTarget === vm.targets[i].name) {
                        var azel = vm.targets[i].azel;
                        var radec = vm.targets[i].radec;
                        var az = azel[0] * (180 / Math.PI);
                        if (az > 180) {
                            az = az - 360;
                        }
                        var el = azel[1] * (180 / Math.PI);
                        vm.skyPlotData.push({
                            name: vm.targets[i].name,
                            pos_actual_pointm_azim: {
                                value: az
                            },
                            pos_actual_pointm_elev: {
                                value: el
                            }
                        });
                    }
                }
                vm.redraw(true);
            }
        };

        vm.clearSkyPlot = function() {
            vm.redraw(true);
        };

        vm.sensorUpdateMessage = function(event, sensor, subject) {
            // we're only interestested in this displays sensors
            if (sensor.name.search(vm.sensorsToConnectRegex) < 0) {
                return;
            }

            if (sensor.name.endsWith('pool_resources')) {
                // e.g. subarray_1_pool_resources
                var sensorNameSplit = sensor.name.split('_');
                var subNr = parseInt(sensorNameSplit[1]);
                for (var receptorName in vm.receptors) {
                    if (sensor.value.indexOf(receptorName) > -1) {
                        vm.receptors[receptorName].subarrayColor = subNr ? vm.subarrayColors(subNr) : null;
                        vm.receptors[receptorName].sub_nr = subNr;
                    } else if (vm.receptors[receptorName].sub_nr === subNr) {
                        // receptor was unassigned
                        vm.receptors[receptorName].subarrayColor = "#d7d7d7";
                        vm.receptors[receptorName].sub_nr = null;
                    }
                }
            } else {
                // e.g. m011_<sensor>
                var receptor = sensor.name.split('_')[0];
                sensor.name = sensor.name.replace(receptor + '_', '');
                vm.receptors[receptor][sensor.name] = sensor;

                // work out the class for the receptor
                var classNames = receptor + '_actual receptor-legend-item md-whiteframe-z1 unselectable';
                if (vm.receptors[receptor]['mode'] && vm.receptors[receptor]['mode'].value==='POINT'
                    && vm.receptors[receptor]['lock'] && !vm.receptors[receptor]['lock'].value)
                  classNames += ' unlocked';

                vm.receptors[receptor]['class_names'] = classNames;
            }
        };

        vm.redraw = function(horizonMaskToggled) {
            vm.redrawChart(
                vm.receptors, vm.skyPlotData, vm.showNames, vm.showTrails,
                vm.showGridLines, vm.trailDots, horizonMaskToggled, vm.selectedMinElevation);
        };

        vm.toggleHorizonMask = function(receptor) {
            if (!receptor.horizonMask) {
                ConfigService.getHorizonMask(receptor.name)
                    .then(function(result) {
                        if (!result.data.error) {
                            receptor.showHorizonMask = true;
                            receptor.horizonMask = "az el\r" + JSON.parse(result.data);
                            vm.redraw(true);
                        } else {
                            NotifyService.showSimpleDialog('Error Retrieving Horizon Mask', result.data.error);
                        }

                    }, function() {
                        NotifyService.showSimpleDialog('Error Retrieving Horizon Mask', 'Could not retrieve a horizon mask for ' + receptor.name);
                    });
            } else {
                receptor.showHorizonMask = !receptor.showHorizonMask;
                vm.redraw(true);
            }
        };

        vm.delayedRedrawAfterViewChange = function() {
            $timeout(function() {
                vm.redraw(false);
            }, 1000);
        };

        var bgColor = angular.element(document.querySelector("md-content")).css('background-color');
        angular.element(document.querySelector(".sky-plot-options-containter")).css({
            'background-color': bgColor
        });

        vm.unbindSensorUpdates = $rootScope.$on('sensorUpdateMessage', vm.sensorUpdateMessage);
        vm.unbindReconnected = $rootScope.$on('websocketReconnected', vm.initSensors);

        vm.initSensors();
        vm.updatePlotInterval = $interval(function() {
            vm.redraw(false);
        }, 1000);

        $scope.$on('$destroy', function() {
            vm.subscribedSensors.forEach(function(sensor) {
                MonitorService.unsubscribeSensor(sensor);
            });
            vm.unbindSensorUpdates();
            vm.unbindReconnected();
            $interval.cancel(vm.updatePlotInterval);
        });
    }
})();
