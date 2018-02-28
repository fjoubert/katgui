(function () {

    angular.module('katGui')
        .controller('SensorListCtrl', SensorListCtrl);

    function SensorListCtrl($scope, $rootScope, $timeout, KatGuiUtil, $interval, $stateParams, MonitorService,
                            $log, $mdDialog, MOMENT_DATETIME_FORMAT, NotifyService, ConfigService, $localStorage, $state) {

        var vm = this;
        vm.resources = ConfigService.resources;
        vm.resourcesNames = [];
        vm.sensorsToDisplay = [];
        vm.resourceSensorsBeingDisplayed = '';
        vm.searchFilter = $stateParams.filter? $stateParams.filter: '';
        vm.sensorsPlotNames = [];

        vm.showTips = false;
        vm.showContextZoom = false;
        vm.useFixedYAxis = false;
        vm.yAxisMinValue = 0;
        vm.yAxisMaxValue = 100;
        vm.hideNominalSensors = $stateParams.hideNominal? $stateParams.hideNominal === 'true': false;
        vm.sensorValues = {};
        vm.showValueTimestamp = false;
        vm.subscribedSensors = [];

        if ($localStorage.currentSensorNameColumnWidth) {
            vm.currentSensorNameColumnWidth = $localStorage.currentSensorNameColumnWidth;
        } else {
            vm.currentSensorNameColumnWidth = 400;
        }

        vm.sensorNameResizeClassName = '_sensor-list-name-resize';
        vm.sensorNameResizeStyle = document.getElementById(vm.sensorNameResizeClassName);
        if (!vm.sensorNameResizeStyle) {
            vm.sensorNameResizeStyle = document.createElement('style');
            vm.sensorNameResizeStyle.type = 'text/css';
            vm.sensorNameResizeStyle.id = vm.sensorNameResizeClassName;
            vm.sensorNameResizeStyle.innerHTML = '.' + vm.sensorNameResizeClassName + ' {min-width: ' + vm.currentSensorNameColumnWidth + 'px;}';
            document.getElementsByTagName('head')[0].appendChild(vm.sensorNameResizeStyle);
        }

        vm.sensorsOrderByFields = [
            {label: 'Name', value: 'shortName'},
            {label: 'Timestamp', value: 'timestamp'},
            {label: 'Received Timestamp', value: 'received_timestamp'},
            {label: 'Status', value: 'status'},
            {label: 'Value', value: 'value'}
        ];

        if ($localStorage.sensorListShowValueTimestamp) {
            vm.showValueTimestamp = $localStorage.sensorListShowValueTimestamp;
        }

        vm.saveLocalStorage = function () {
            $localStorage.sensorListShowValueTimestamp = vm.showValueTimestamp;
        };

        vm.initSensors = function () {
            if (vm.resourceSensorsBeingDisplayed.length > 0) {
                MonitorService.listSensorsHttp(vm.resourceSensorsBeingDisplayed, '.*').then(function(result) {
                    vm.showProgress = false;
                    result.data.forEach(function (sensor) {
                        vm.subscribedSensors.push(sensor);
                        if (sensor.original_name) {
                            sensor.shortName = sensor.original_name.replace(vm.resourceSensorsBeingDisplayed + '.', '');
                        } else {
                            sensor.shortName = sensor.name.replace(vm.resourceSensorsBeingDisplayed + '_', '');
                        }
                        sensor.timestamp = moment.utc(sensor.value_ts, 'X').format(MOMENT_DATETIME_FORMAT);
                        if (sensor.sample_ts) {
                            sensor.received_timestamp = moment.utc(sensor.sample_ts, 'X').format(MOMENT_DATETIME_FORMAT);
                        } else {
                            sensor.received_timestamp = moment.utc().format(MOMENT_DATETIME_FORMAT);
                        }
                        vm.sensorValues[sensor.name] = sensor;
                        vm.sensorsToDisplay.push(sensor);
                    });
                }, function(error) {
                    $log.error(error);
                });
                MonitorService.subscribeResource(vm.resourceSensorsBeingDisplayed);
            }
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

        vm.setSensorsOrderBy('shortName');

        vm.listResourceSensors = function (resourceName) {
            if (vm.resourceSensorsBeingDisplayed === resourceName) {
                return;
            }

            if (vm.resourceSensorsBeingDisplayed.length > 0) {
                vm.unsubscribeResource(vm.resourceSensorsBeingDisplayed);
                vm.sensorsToDisplay = [];
                vm.sensorValues = {};
            }
            vm.sensorsPlotNames.splice(0, vm.sensorsPlotNames.length);
            vm.clearChart();
            vm.showProgress = true;
            vm.resourceSensorsBeingDisplayed = resourceName;
            vm.initSensors();
            vm.updateURL();
        };

        vm.sensorClass = function (status) {
            return status + '-sensor-list-item';
        };

        vm.plotLiveSensorFeed = function (sensorName) {
            var sensor = vm.sensorValues[sensorName];
            var remove = sensor.selectedForChart;
            if (remove) {
                var sensorIndex = _.findIndex(vm.sensorsPlotNames, function (item) {
                    return item.name === sensorName;
                });
                if (sensorIndex > -1) {
                    vm.sensorsPlotNames.splice(sensorIndex, 1);
                    vm.removeSensorLine(sensorName);
                }
                sensor.selectedForChart = false;
            } else {
                vm.sensorsPlotNames.push({name: sensorName, class: sensorName});
                sensor.selectedForChart = true;
            }
        };

        vm.chipRemoved = function ($chip) {
            for (var i = 0; i < vm.sensorsToDisplay.length; i++) {
                if (vm.sensorsToDisplay[i].python_identifier === $chip.name.split('.')[1]) {
                    vm.sensorsToDisplay[i].selectedForChart = false;
                    break;
                }
            }
            vm.removeSensorLine($chip.name);
        };

        vm.chipAppended = function (chip) {
            if (chip.name) {
                var sensorPlotNameFound = false;
                for (var i = 0; i < vm.sensorsPlotNames.length; i++) {
                    if (vm.resourceSensorsBeingDisplayed + '_' + chip.python_identifier === vm.sensorsPlotNames[i].class) {
                        sensorPlotNameFound = true;
                        break;
                    }
                }
                if (!sensorPlotNameFound) {
                    chip.selectedForChart = true;
                    vm.plotLiveSensorFeed(chip, false);
                }
            }
            vm.sensorsPlotNames = vm.sensorsPlotNames.filter(function (item) {
                return item.name && item.name.length > 0;
            });
        };

        vm.chipsQuerySearch = function (query) {
            var results = query ? vm.sensorsToDisplay.filter(vm.createFilterFor(query)) : [];
            return results;
        };

        vm.createFilterFor = function (query) {
            return function filterFn(item) {
                return (item.name ? item.name.toLowerCase().indexOf(query.toLowerCase()) > -1 : item.indexOf(query) > -1);
            };
        };

        vm.clearChartData = function () {
            vm.sensorsToDisplay.forEach(function (sensor) {
                sensor.selectedForChart = false;
            });

            vm.sensorsPlotNames.splice(0, vm.sensorsPlotNames.length);
            vm.clearChart();
        };

        vm.maximiseSensorGraph = function () {
            var element = angular.element(document.querySelector('.sensor-list-chart-container'));
            element.css({top: '60px', left: '8px', width: 'calc(100% - 16px)', height: 'calc(100% - 68px)'});
        };

        vm.restoreSensorGraphSize = function () {
            var element = angular.element(document.querySelector('.sensor-list-chart-container'));
            element.css({top: 'auto', left: 'auto', right: '20px', bottom: '20px', width: '500px', height: '500px'});
        };

        vm.displaySensorValue = function ($event, sensor) {
            NotifyService.showHTMLPreSensorDialog(sensor.name + ' value at ' + sensor.received_timestamp, sensor, $event);
        };

        vm.keys = function(obj) {
            return Object.keys(obj);
        };

        vm.resetSensorNameColumnWidth  = function (newSize) {
            vm.setCurrentSensorNameColumnWidth(newSize);
        };

        vm.increaseSensorNameColumnWidth = function(columnClassId) {
            vm.setCurrentSensorNameColumnWidth(vm.currentSensorNameColumnWidth + 200);
        };

        vm.decreaseSensorNameColumnWidth = function(columnClassId) {
            vm.setCurrentSensorNameColumnWidth(vm.currentSensorNameColumnWidth - 200);
        };

        vm.setCurrentSensorNameColumnWidth = function(newSize) {
            vm.currentSensorNameColumnWidth = newSize;
            $localStorage.currentSensorNameColumnWidth = newSize;
            vm.sensorNameResizeStyle.innerHTML = '.' + vm.sensorNameResizeClassName + ' {min-width: ' + vm.currentSensorNameColumnWidth + 'px }';
        };

        var unbindUpdate = $rootScope.$on('sensorUpdateMessage', function (event, sensor, subject) {
            if (!vm.resourceSensorsBeingDisplayed) {
                return;
            }

            if (sensor.name.startsWith(vm.resourceSensorsBeingDisplayed)) {
                sensor.timestamp = moment.utc(sensor.value_ts, 'X').format(MOMENT_DATETIME_FORMAT);
                if (sensor.sample_ts) {
                    sensor.received_timestamp = moment.utc(sensor.sample_ts, 'X').format(MOMENT_DATETIME_FORMAT);
                } else {
                    sensor.received_timestamp = moment.utc().format(MOMENT_DATETIME_FORMAT);
                }
                if (!vm.sensorValues[sensor.name]) {
                    vm.sensorValues[sensor.name] = sensor;
                    vm.sensorsToDisplay.push(sensor);
                }
                vm.sensorValues[sensor.name].received_timestamp = sensor.received_timestamp;
                vm.sensorValues[sensor.name].timestamp = sensor.timestamp;
                vm.sensorValues[sensor.name].status = sensor.status;
                vm.sensorValues[sensor.name].value = sensor.value;
            }

            if (vm.sensorsPlotNames.length > 0 &&
                _.findIndex(vm.sensorsPlotNames,
                    function (item) {
                        return item.name === sensor.name;
                    }) > -1) {
                vm.redrawChart([{
                    sensor: sensor.name,
                    value_ts: sensor.value_ts * 1000,
                    sample_ts: sensor.time * 1000,
                    value: sensor.value
                }]);
            }
        });

        vm.showOptionsChanged = function () {
            if (!$scope.$$phase) {
                $scope.$apply();
            }
            vm.loadOptions({
                showGridLines: vm.showGridLines,
                hideContextZoom: !vm.showContextZoom,
                useFixedYAxis: vm.useFixedYAxis,
            });
        };

        $scope.filterByNotNominal = function (sensor) {
            return !vm.hideNominalSensors || vm.hideNominalSensors && vm.sensorValues[sensor].status !== 'nominal';
        };

        vm.updateURL = function () {
            $state.go('sensor-list', {
                component: vm.resourceSensorsBeingDisplayed? vm.resourceSensorsBeingDisplayed: null,
                filter: vm.searchFilter? vm.searchFilter: null,
                hideNominal: vm.hideNominalSensors? 'true': null},
                { notify: false, reload: false });
        };

        //create to function to bind to, but dont do anything with it yet
        vm.downloadAsCSV = function () {};

        if (vm.resourcesNames.length === 0) {
            vm.nodes = ConfigService.resourceGroups;
            ConfigService.listResourcesFromConfig()
                .then(function () {
                    for (var key in ConfigService.resources) {
                        vm.resourcesNames.push({name: key, node: ConfigService.resources[key].node});
                    }
                    if ($stateParams.component) {
                        vm.listResourceSensors($stateParams.component);
                    }
                });
        }

        var unbindReconnected = $rootScope.$on('websocketReconnected', vm.initSensors);

        vm.unsubscribeResource = function (resourceName) {
            if (resourceName) {
                vm.subscribedSensors = [];
                MonitorService.unsubscribeResource(resourceName);
            }
        };

        $scope.$on('$destroy', function () {
            vm.unsubscribeResource(vm.resourceSensorsBeingDisplayed);
            unbindUpdate();
            unbindReconnected();
        });
    }
})();
