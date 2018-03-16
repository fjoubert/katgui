(function() {

    angular.module('katGui.health')
        .controller('CustomHealthViewCtrl', CustomHealthViewCtrl);

    function CustomHealthViewCtrl($scope, $rootScope, $interval, MonitorService, KatGuiUtil, $location, $stateParams,
        $timeout, $log, $mdDialog, $state, NotifyService, ConfigService, StatusService) {

        var vm = this;
        StatusService.sensorValues = {};
        vm.customStatusTrees = [];
        vm.regexStrings = [];
        vm.subscribedSensors = [];
        vm.debounceUpdateUrl = _.debounce(vm.updateUrl, 500);
        vm.CBFCustomViewFilter = ConfigService.CBFCustomViewFilter;
        vm.allowedDimensions = [{
            height: 400,
            width: 200
        }, {
            height: 600,
            width: 200
        }, {
            height: 800,
            width: 200
        }, {
            height: 1000,
            width: 200
        }, {
            height: 1200,
            width: 200
        }, {
            height: 600,
            width: 400
        }, {
            height: 800,
            width: 400
        }, {
            height: 1000,
            width: 400
        }, {
            height: 1200,
            width: 400
        }];

        vm.initSensors = function() {
            vm.customStatusTrees = [];
            vm.regexStrings = [];
            vm.subscribedSensors = [];
            vm.updateUrl();
            console.log(vm.CBFCustomViewFilter);
            if (vm.CBFCustomViewFilter) {
                var layouts = vm.CBFCustomViewFilter.split(';');
                layouts.forEach(function(layout) {
                    if (layout) {
                        var colonSplit = layout.split(':');
                        var component = colonSplit[0];
                        var regex = colonSplit[1];
                        //left,top,width,height
                        var layoutParams = colonSplit[2].split(',');
                        var offset = {
                            left: parseInt(layoutParams[0]),
                            top: parseInt(layoutParams[1])
                        };
                        var size = {
                            width: parseInt(layoutParams[2]),
                            height: parseInt(layoutParams[3])
                        };
                        vm.buildView(component, regex, offset, size);
                    }
                });
                vm.debounceUpdateUrl();
            }
        };

        vm.buildView = function(component, regex, offset, size) {
            if (!component || component.length === 0 || !regex || regex.length === 0) {
                return;
            }
            var sensorRegex = {
                name: component + ':' + regex,
                size: {
                    width: size.width,
                    height: size.height
                },
                offset: {
                    left: offset.left,
                    top: offset.top
                }
            };
            var existingItem = _.findWhere(vm.regexStrings, {
                name: sensorRegex.name
            });
            if (!existingItem) {
                vm.regexStrings.push(sensorRegex);
                MonitorService.listSensorsHttp(component, regex, true).then(function(result) {
                    var newView = {
                        name: component + ':' + regex,
                        resource: regex,
                        size: size,
                        offset: offset,
                        sensor: '',
                        elementId: 'tree-' + KatGuiUtil.generateUUID(), // for the resize handle
                        children: []
                    };
                    result.data.forEach(function(sensor) {
                        newView.children.push({
                            name: sensor.name,
                            sensor: sensor.name,
                            sensorValue: sensor
                        });
                        MonitorService.subscribeSensor(sensor);
                        vm.subscribedSensors.push(sensor);
                        StatusService.sensorValues[sensor.name] = sensor;
                    });
                    vm.customStatusTrees.push(newView);
                    vm.debounceUpdateUrl();
                }, function(error) {
                    $log.error(error);
                });
            } else {
                NotifyService.showSimpleToast('Expression already exists, not adding ' + regex);
            }
        };

        vm.removeStatusTree = function(tree) {
            var existingIndex = _.findIndex(vm.regexStrings, {
                name: tree.name
            });
            if (existingIndex > -1) {
                var splitName = tree.name.split(':');
                var treeElementId = tree.elementId;
                var component = splitName[0];
                var regex = splitName[1];
                var pattern = new RegExp(regex);
                if (tree.children && tree.children.length > 0) {
                    tree.children.forEach(function (sensor) {
                        if (document.querySelectorAll('rect.' + sensor.name).length === 1) {
                            // only unsubscribe from a sensor if there are no duplicates
                            MonitorService.unsubscribeSensorName(component, sensor.name);
                        }
                    });
                }
                vm.regexStrings.splice(existingIndex, 1);
                vm.customStatusTrees.splice(vm.customStatusTrees.indexOf(tree), 1);
                vm.debounceUpdateUrl();
            }
        };

        vm.exportToUrl = function() {
            NotifyService.showSimpleDialog('Exported URL', $location.absUrl());
        };

        vm.updateUrl = function() {
            $state.go('customHealth', {
                layout: vm.CBFCustomViewFilter? vm.CBFCustomViewFilter: null},
                {notify: false, reload: true
                });
        };

        vm.showEnterSensorRegexDialog = function(event) {
            $mdDialog
                .show({
                    controller: function($rootScope, $scope, $mdDialog) {
                        $scope.title = "Enter custom regex";
                        $scope.regex = null;
                        $scope.component = null;
                        $scope.dimensions = vm.allowedDimensions;
                        $scope.dimension = $scope.dimensions[1];
                        $scope.hide = function() {
                            $mdDialog.hide();
                        };
                        $scope.createView = function() {
                            var offset = {
                                top: 0,
                                left: 0
                            };
                            if (vm.regexStrings.length > 0) {
                                var lastViewItem = vm.regexStrings[vm.regexStrings.length - 1];
                                offset = {
                                    top: lastViewItem.offset.top,
                                    left: lastViewItem.offset.left + lastViewItem.size.width + 8
                                };
                            }
                            vm.buildView($scope.component, $scope.regex, offset, $scope.dimension);
                            vm.debounceUpdateUrl();
                            $mdDialog.hide();
                        };
                    },
                    template: [
                        '<md-dialog style="padding: 0; max-width: 95%; max-height: 95%" md-theme="{{$root.themePrimary}}" layout="column">',
                        '<md-toolbar class="md-primary" layout="row" layout-align="center center"><span>{{title}}</span></md-toolbar>',
                        '<div style="padding:0; margin: 8px; overflow: auto; width: 400px" layout="column" layout-padding layout-align="start center" md-theme="{{$root.themePrimaryButtons}}">',
                        '<md-input-container class="md-primary" title="Start typing to find sensors" style="padding: 2px; margin-bottom: 0; height: 40px; width: 380px">',
                        '<input placeholder="Enter a component or \'all\'..." ng-model="component" md-autofocus maxlength="80">',
                        '</md-input-container>',
                        '<md-input-container class="md-primary" title="Start typing to find sensors" style="padding: 2px; margin-bottom: 0; height: 40px; width: 380px">',
                        '<input placeholder="Enter a regex..." ng-model="regex" maxlength="80">',
                        '</md-input-container>',
                        '<div layout="row" layout-align="space-between center" style="min-width: 100%">',
                        '<span flex>View Dimensions <i>(width x height)</i>:</span>',
                        '<md-select ng-model="dimension" placeholder="Select dimensions..." style="margin: 0">',
                        '<md-option ng-repeat="dimension in dimensions" ng-value="dimension">',
                        '{{dimension.width + "x" + dimension.height}}',
                        '</md-option>',
                        '</div>',
                        '</div>',
                        '<div layout="row" layout-align="end" style="margin-top: 8px; margin-right: 8px; margin-bottom: 8px; min-height: 40px;" md-theme="{{$root.themePrimaryButtons}}">',
                        '<md-button style="margin-left: 8px;" class="md-primary" ng-click="hide()">Cancel</md-button>',
                        '<md-button ng-disabled="!component || !regex" style="margin-left: 8px;" class="md-primary md-raised" ng-click="createView()">Create View</md-button>',
                        '</div>',
                        '</md-dialog>'
                    ].join(''),
                    targetEvent: event
                });
        };

        var unbindUpdate = $rootScope.$on('sensorUpdateMessage', function(event, sensor, subject) {
            StatusService.sensorValues[sensor.name] = sensor;
            d3.selectAll('.' + sensor.name).attr('class', sensor.status + '-child ' + sensor.name);
        });

        var unbindReconnected = $rootScope.$on('websocketReconnected', vm.initSensors);
        vm.initSensors();

        $scope.$on('$destroy', function() {
            vm.subscribedSensors.forEach(function(sensor) {
                MonitorService.unsubscribeSensor(sensor);
            });
            unbindUpdate();
            unbindReconnected();
            StatusService.sensorValues = {};
        });
    }
})();
