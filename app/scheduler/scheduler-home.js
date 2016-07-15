(function () {

    angular.module('katGui.scheduler', ['ui.bootstrap.datetimepicker',
        'katGui.services',
        'katGui.util',
        'ngAnimate'])
        .constant('SCHEDULE_BLOCK_TYPES', [
            'MAINTENANCE',
            'OBSERVATION',
            'MANUAL'])
        .controller('SchedulerHomeCtrl', SchedulerHomeCtrl);

    function SchedulerHomeCtrl($state, $rootScope, $scope, $interval, $log, SensorsService, ObsSchedService, $timeout, KatGuiUtil,
                               UserLogService, NotifyService, MonitorService, ConfigService, $stateParams, $q, $mdDialog, UserService) {

        var vm = this;
        vm.childStateShowing = $state.current.name !== 'scheduler';
        vm.subarrays = ObsSchedService.subarrays;
        vm.disconnectIssued = false;
        vm.connectInterval = null;
        vm.connectionLost = false;
        vm.subarray = null;
        vm.products = [];
        vm.bands = [];
        vm.users = [];
        vm.iAmCA = false;

        if (!$stateParams.subarray_id) {
            $state.go($state.current.name, {subarray_id: '1'});
        }

        UserService.listUsers().then(function () {
            for (var i = 0; i < UserService.users.length; i++) {
                vm.users.push(UserService.users[i]);
            }
        });

        UserLogService.listTags();

        ConfigService.getSystemConfig()
            .then(function (systemConfig) {
                if (systemConfig.system.bands) {
                    vm.bands = systemConfig.system.bands.split(',');
                } else {
                    NotifyService.showSimpleDialog('Error loading bands and products',
                        'Bands and products were not found in the system\'s config.');
                }
            });

        ConfigService.getProductConfig()
            .then(function (productConfig) {
                vm.products = [];
                var productKeys = Object.keys(productConfig);
                productKeys.forEach(function (product) {
                    vm.products.push(product)
                });
            });

        vm.iAmAtLeastCA = function () {
            return $rootScope.expertOrLO || vm.iAmCA;
        };

        vm.stateGo = function (newState, subarray_id) {
            if (subarray_id) {
                $state.go(newState, {subarray_id: subarray_id});
                vm.subarray = _.findWhere(ObsSchedService.subarrays, {id: subarray_id});
            } else if (vm.subarray) {
                $state.go(newState, {subarray_id: vm.subarray.id});
            } else if (newState === 'scheduler.observations' || newState === 'scheduler.drafts') {
                $state.go(newState);
            } else {
                $state.go('scheduler');
            }
        };

        vm.unbindStateChangeStart = $rootScope.$on('$stateChangeStart', function (event, toState) {
            vm.childStateShowing = (toState.name === 'scheduler.drafts' ||
                toState.name === 'scheduler.resources' ||
                toState.name === 'scheduler.execute' ||
                toState.name === 'scheduler.subarrays' ||
                toState.name === 'scheduler.observations' ||
                toState.name === 'scheduler.observations.detail');

            if (toState.name === 'scheduler.observations' ||
                toState.name === 'scheduler.drafts' ||
                toState.name === 'scheduler') {
                vm.subarray = null;
            }
        });

        vm.currentState = function () {
            return $state.current.name;
        };

        MonitorService.subscribe('sched');
        ObsSchedService.getScheduleBlocks();
        ObsSchedService.getScheduledScheduleBlocks();

        vm.checkCASubarrays = function () {
            vm.subarray = _.findWhere(ObsSchedService.subarrays, {id: $stateParams.subarray_id});
            if (vm.subarray) {
                vm.iAmCA = vm.subarray.delegated_ca === $rootScope.currentUser.email && $rootScope.currentUser.req_role === 'control_authority';
            }
        };

        vm.checkCASubarrays();
        if (!vm.subarray) {
            vm.unbindWatchSubarrays = $scope.$watchCollection('vm.subarrays', function () {
                vm.checkCASubarrays();
            });
        }

        vm.unbindDelegateWatch = $scope.$watch('vm.subarray.delegated_ca', function (newVal) {
            vm.checkCASubarrays();
        });

        vm.unbindLoginSuccess = $rootScope.$on('loginSuccess', function () {
            vm.checkCASubarrays();
        });

        vm.waitForSubarrayToExist = function () {
            vm.waitForSubarrayToExistDeferred = $q.defer();
            if (vm.subarray) {
                $timeout(function () {
                    vm.waitForSubarrayToExistDeferred.resolve($stateParams.subarray_id);
                }, 1);
            } else {
                vm.waitForSubarrayToExistInterval = $interval(function () {
                    if (!vm.subarray && $stateParams.subarray_id) {
                        vm.checkCASubarrays();
                    }
                    if (vm.subarray) {
                        vm.waitForSubarrayToExistDeferred.resolve($stateParams.subarray_id);
                        $interval.cancel(vm.waitForSubarrayToExistInterval);
                        vm.waitForSubarrayToExistInterval = null;
                    }
                }, 50);
            }
            return vm.waitForSubarrayToExistDeferred.promise;
        };

        vm.openConfigLabelDialog = function (event) {
            $mdDialog
                .show({
                    controller: function ($rootScope, $scope, $mdDialog) {
                        $scope.title = 'Select a Config Label';
                        $scope.configLabels = ObsSchedService.configLabels;
                        ObsSchedService.listConfigLabels();
                        $scope.configLabelsFields = [
                            {label: 'date', value: 'date'},
                            {label: 'name', value: 'name'}
                        ];
                        $scope.hide = function () {
                            $mdDialog.hide();
                        };
                        $scope.setConfigLabel = function (configLabel) {
                            ObsSchedService.setConfigLabel(vm.subarray.id, configLabel);
                        };
                    },
                    template:
                        '<md-dialog style="padding: 0;" md-theme="{{$root.themePrimary}}">' +
                        '   <div style="padding: 0; margin: 0; overflow: auto" layout="column">' +
                        '       <md-toolbar class="md-primary" layout="row" layout-align="center center">' +
                        '           <span flex style="margin-left: 8px;">{{::title}}</span>' +
                        '           <input type="search" style="font-size: 14px; margin-left: 8px; width: 140px; background: transparent; border: 0" ng-model="q" placeholder="Search Labels..."/>' +
                        '       </md-toolbar>' +
                        '       <div flex layout="column" style="overflow-x: auto; overflow-y: scroll">' +
                        '           <div style="text-align: center" class="config-label-list-item" ng-click="setConfigLabel(\'\');  hide()">Clear Config Label</div>' +
                        '           <div layout="row" ng-repeat="configLabel in configLabels | regexSearch:configLabelsFields:q track by $index" ng-click="setConfigLabel(configLabel); hide()" class="config-label-list-item">' +
                        '               <div>{{configLabel}}</div>' +
                        '           </div>' +
                        '       </div>' +
                        '       <div layout="row" layout-align="end" style="margin-top: 8px; margin-right: 8px; margin-bottom: 8px; min-height: 40px;">' +
                        '           <md-button style="margin-left: 8px;" class="md-primary md-raised" md-theme="{{$root.themePrimaryButtons}}" aria-label="OK" ng-click="hide()">Close</md-button>' +
                        '       </div>' +
                        '   </div>' +
                        '</md-dialog>',
                    targetEvent: event
                });
        };

        vm.setBand = function (band) {
            ObsSchedService.setBand(vm.subarray.id, band);
        };

        vm.openBandsDialog = function (event) {
            $mdDialog
                .show({
                    controller: function ($rootScope, $scope, $mdDialog) {
                        $scope.title = 'Select a Band';
                        $scope.bands = vm.bands;

                        $scope.hide = function () {
                            $mdDialog.hide();
                        };
                        $scope.setBand = function (band) {
                            vm.setBand(band);
                        };
                    },
                    template:
                        '<md-dialog style="padding: 0;" md-theme="{{$root.themePrimary}}">' +
                        '   <div style="padding: 0; margin: 0; overflow: auto" layout="column">' +
                        '       <md-toolbar class="md-primary" layout="row" layout-align="center center">' +
                        '           <span flex style="margin-left: 8px;">{{::title}}</span>' +
                        '       </md-toolbar>' +
                        '       <div flex layout="column" style="overflow-x: auto; overflow-y: scroll">' +
                        '           <div layout="row" layout-align="center center" ng-repeat="band in bands track by $index" ng-click="setBand(band); hide()" class="config-label-list-item">' +
                        '               <b>{{band}}</b>' +
                        '           </div>' +
                        '       </div>' +
                        '       <div layout="row" layout-align="end" style="margin-top: 8px; margin-right: 8px; margin-bottom: 8px; min-height: 40px;">' +
                        '           <md-button style="margin-left: 8px;" class="md-primary md-raised" md-theme="{{$root.themePrimaryButtons}}" aria-label="OK" ng-click="hide()">Close</md-button>' +
                        '       </div>' +
                        '   </div>' +
                        '</md-dialog>',
                    targetEvent: event
                });
        };

        vm.setProduct = function (product) {
            ObsSchedService.setProduct(vm.subarray.id, product);
        };

        vm.openProductsDialog = function (event) {
            $mdDialog
                .show({
                    controller: function ($rootScope, $scope, $mdDialog) {
                        $scope.title = 'Select a Product';
                        $scope.products = vm.products;

                        $scope.hide = function () {
                            $mdDialog.hide();
                        };
                        $scope.setProduct = function (product) {
                            vm.setProduct(product);
                        };
                    },
                    template:
                    '<md-dialog style="padding: 0;" md-theme="{{$root.themePrimary}}">' +
                    '   <div style="padding: 0; margin: 0; overflow: auto" layout="column">' +
                    '       <md-toolbar class="md-primary" layout="row" layout-align="center center">' +
                    '           <span flex style="margin-left: 8px;">{{::title}}</span>' +
                    '       </md-toolbar>' +
                    '       <div flex layout="column" style="overflow-x: auto; overflow-y: scroll">' +
                    '           <div layout="row" layout-align="center center" ng-repeat="product in products track by $index" ng-click="setProduct(product); hide()" class="config-label-list-item">' +
                    '               <b>{{product}}</b>' +
                    '           </div>' +
                    '       </div>' +
                    '       <div layout="row" layout-align="end" style="margin-top: 8px; margin-right: 8px; margin-bottom: 8px; min-height: 40px;">' +
                    '           <md-button style="margin-left: 8px;" class="md-primary md-raised" md-theme="{{$root.themePrimaryButtons}}" aria-label="OK" ng-click="hide()">Close</md-button>' +
                    '       </div>' +
                    '   </div>' +
                    '</md-dialog>',
                    targetEvent: event
                });
        };

        vm.openCADialog = function (event) {
            $mdDialog
                .show({
                    controller: function ($rootScope, $scope, $mdDialog) {
                        $scope.title = 'Select a Control Authority';
                        UserService.listUsers();
                        $scope.users = UserService.users;

                        $scope.hide = function () {
                            $mdDialog.hide();
                        };
                        $scope.setCA = function (userName) {
                            ObsSchedService.delegateControl(vm.subarray.id, userName);
                        };
                        $scope.hasCARole = function (user) {
                            return user.roles.indexOf('control_authority') > -1;
                        };
                    },
                    template:
                    '<md-dialog style="padding: 0;" md-theme="{{$root.themePrimary}}">' +
                    '   <div style="padding: 0; margin: 0; overflow: auto" layout="column">' +
                    '       <md-toolbar class="md-primary" layout="row" layout-align="center center">' +
                    '           <span flex style="margin-left: 8px;">{{::title}}</span>' +
                    '       </md-toolbar>' +
                    '       <div flex layout="column" style="overflow-x: auto; overflow-y: scroll">' +
                    '           <div layout="row" layout-align="center center" ng-click="setCA(\'lo\'); hide()" class="config-label-list-item">' +
                    '               <b>Lead Operator</b>' +
                    '           </div>' +
                    '           <div ng-if="hasCARole(user)" layout="row" layout-align="center center" ng-repeat="user in users track by $index" ng-click="setCA(user.email); hide()" class="config-label-list-item">' +
                    '               <b>{{user.email}}</b>' +
                    '           </div>' +
                    '       </div>' +
                    '       <div layout="row" layout-align="end" style="margin-top: 8px; margin-right: 8px; margin-bottom: 8px; min-height: 40px;">' +
                    '           <md-button style="margin-left: 8px;" class="md-primary md-raised" md-theme="{{$root.themePrimaryButtons}}" aria-label="OK" ng-click="hide()">Close</md-button>' +
                    '       </div>' +
                    '   </div>' +
                    '</md-dialog>',
                    targetEvent: event
                });
        };

        vm.setPriority = function (sb, event) {
            $mdDialog
                .show({
                    controller: function ($rootScope, $scope, $mdDialog) {
                        $scope.title = 'Set Priority - ' + sb.id_code + ' (current: ' + sb.priority + ')';
                        $scope.priorities = ["LOW", "HIGH"];
                        $scope.currentPriority = sb.priority;

                        $scope.hide = function () {
                            $mdDialog.hide();
                        };
                        $scope.setPriority = function (priority) {
                            ObsSchedService.setSchedulePriority(sb.id_code, priority);
                        };
                    },
                    template:
                    '<md-dialog style="padding: 0;" md-theme="{{$root.themePrimary}}">' +
                    '   <div style="padding: 0; margin: 0; overflow: auto" layout="column">' +
                    '       <md-toolbar class="md-primary" layout="row" layout-align="center center">' +
                    '           <span flex style="margin: 8px;">{{::title}}</span>' +
                    '       </md-toolbar>' +
                    '       <div flex layout="column">' +
                    '           <div layout="row" layout-align="center center" ng-repeat="priority in priorities track by $index" ng-click="setPriority(priority); hide()" class="config-label-list-item">' +
                    '               <b>{{priority}}</b>' +
                    '           </div>' +
                    '       </div>' +
                    '       <div layout="row" layout-align="end" style="margin-top: 8px; margin-right: 8px; margin-bottom: 8px; min-height: 40px;">' +
                    '           <md-button style="margin-left: 8px;" class="md-primary md-raised" md-theme="{{$root.themePrimaryButtons}}" aria-label="OK" ng-click="hide()">Close</md-button>' +
                    '       </div>' +
                    '   </div>' +
                    '</md-dialog>',
                    targetEvent: event
                });
        };

        vm.setSubarrayInMaintenance = function () {
            ObsSchedService.setSubarrayMaintenance(vm.subarray.id, vm.subarray.maintenance ? 'clear' : 'set');
        };

        vm.markResourceFaulty = function (resource) {
            ObsSchedService.markResourceFaulty(resource.name, resource.faulty? 'clear' : 'set');
        };

        vm.markResourceInMaintenance = function (resource) {
            ObsSchedService.markResourceInMaintenance(resource.name, resource.maintenance ? 'clear' : 'set');
        };

        vm.isResourceInMaintenance = function (resource) {
            if (ObsSchedService.resources_in_maintenance) {
                resource.maintenance = ObsSchedService.resources_in_maintenance.indexOf(resource.name) !== -1;
                return resource.maintenance;
            } else {
                resource.maintenance = false;
                return false;
            }
        };

        vm.isResourceFaulty = function (resource) {
            resource.faulty = ObsSchedService.resources_faulty.indexOf(resource.name) !== -1;
            return resource.faulty;
        };

        vm.activateSubarray = function () {
            vm.subarray.showProgress = true;
            ObsSchedService.activateSubarray(vm.subarray.id)
                .then(function (result) {
                    var splitMessage = result.data.result.split(' ');
                    var message = KatGuiUtil.sanitizeKATCPMessage(result.data.result);
                    if (splitMessage.length > 2 && splitMessage[1] !== 'ok') {
                        NotifyService.showPreDialog('Error activating subarray', message);
                    } else {
                        NotifyService.showSimpleToast(result.data.result);
                    }
                    vm.subarray.showProgress = false;
                }, function (error) {
                    NotifyService.showSimpleDialog('Could not activate Subarray', error.data.result);
                    vm.subarray.showProgress = false;
                });
        };

        vm.freeSubarray = function () {
            vm.subarray.showProgress = true;
            // var dataResource = _.find(vm.subarray.allocations, function(resource) {
            //     return resource.name.startsWith('data_');
            // });
            var dataResource = {name: 'data_' + vm.subarray.id};

            ObsSchedService.freeSubarray(vm.subarray.id).then(function (success) {
                if (dataResource) {
                    $timeout(function () {
                        if (vm.subarray.state === 'inactive') {
                            ObsSchedService.assignResourcesToSubarray(vm.subarray.id, dataResource.name).then(function () {
                                vm.subarray.showProgress = false;
                            });
                        } else {
                            $log.error('Could not assign ' + dataResource.name + ', because subarray_' + vm.subarray.id + ' was still in state: ' + vm.subarray.state);
                        }
                    }, 1000);
                }
                vm.subarray.showProgress = false;
            }, function () {
                vm.subarray.showProgress = false;
            });
        };

        vm.listResourceMaintenanceDevicesDialog = function (resource, $event) {
            ObsSchedService.listResourceMaintenanceDevicesDialog(vm.subarray.id, resource.name, $event);
        };

        vm.delegateControl = function (email) {
            ObsSchedService.delegateControl(vm.subarray.id, email);
        };

        vm.executeSchedule = function (item) {
            ObsSchedService.executeSchedule(vm.subarray.id, item.id_code);
        };

        vm.stopExecuteSchedule = function (item) {
            ObsSchedService.stopSchedule(vm.subarray.id, item.id_code);
        };

        vm.cancelExecuteSchedule = function (item) {
            ObsSchedService.cancelExecuteSchedule(vm.subarray.id, item.id_code);
        };

        vm.cloneSchedule = function (item) {
            ObsSchedService.cloneSchedule(item.id_code);
        };

        vm.cloneAndAssignSchedule = function (item) {
            ObsSchedService.cloneAndAssignSchedule(item.id_code, vm.subarray.id);
        };

        vm.viewSBTasklog = function (sb, mode) {
            ObsSchedService.viewTaskLogForSBIdCode(sb.id_code, mode);
        };

        vm.moveScheduleRowToFinished = function (item) {
            ObsSchedService.scheduleToComplete(vm.subarray.id, item.id_code);
        };

        vm.moveScheduleRowToDraft = function (item) {
            ObsSchedService.scheduleToDraft(vm.subarray.id, item.id_code);
        };

        vm.setSchedulerMode = function (mode) {
            ObsSchedService.setSchedulerModeForSubarray(vm.subarray.id, mode);
        };

        vm.verifySB = function (sb) {
            ObsSchedService.verifyScheduleBlock(vm.subarray.id, sb.id_code);
        };

        $scope.$on('$destroy', function () {
            MonitorService.unsubscribe('sched', '*');
            vm.unbindStateChangeStart();

            if (vm.connectInterval) {
                $interval.cancel(vm.connectInterval);
            }
            if (vm.unbindWatchSubarrays) {
                vm.unbindWatchSubarrays();
            }
            if (vm.waitForSubarrayToExistInterval) {
                $interval.cancel(vm.waitForSubarrayToExistInterval);
            }
            SensorsService.disconnectListener();
            vm.disconnectIssued = true;
        });
    }
})();
