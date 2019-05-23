(function () {

    angular.module('katGui.scheduler')
        .controller('SubArrayResourcesCtrl', SubArrayResourcesCtrl);

    function SubArrayResourcesCtrl($state, $scope, ObsSchedService, $rootScope, $stateParams,
                                   NotifyService, ConfigService, $mdDialog) {

        var vm = this;
        vm.poolResourcesFree = ObsSchedService.poolResourcesFree;
        $scope.parent = $scope.$parent;

        vm.initLastKnownConfig = function () {
            vm.lastKnownSubarrayConfig = ObsSchedService.getLastKnownSubarrayConfig(vm.subarray.id);
        };

        vm.loadLastKnownSubarrayConfig = function () {
            ObsSchedService.loadLastKnownSubarrayConfig(vm.subarray.id);
        };

        $scope.$parent.vm.waitForSubarrayToExist().then(function (subarrayId) {
            vm.subarray = _.findWhere(ObsSchedService.subarrays, {id: subarrayId});
            vm.initLastKnownConfig();
        });

        vm.toggleSelectAllUnassignedResources = function () {
            var anySelected = _.any(vm.poolResourcesFree, function(resource) {
                return resource.selected;
            });
            var select = !anySelected;
            vm.poolResourcesFree.forEach(function (item) {
                item.selected = select;
            });
        };

        vm.assignSelectedResources = function () {
            var selectedResources = vm.poolResourcesFree.filter(function(resource) {
                return resource.selected;
            });
            var selectedResourceNames = selectedResources.map(function(resource) {
                return resource.name;
            });
            if (selectedResourceNames) {
                ObsSchedService.assignResourcesToSubarray(vm.subarray.id, selectedResourceNames.join(','));
            }
        };

        vm.assignResource = function (resourceName) {
            ObsSchedService.assignResourcesToSubarray(vm.subarray.id, resourceName);
        };

        vm.freeAssignedResource = function (resourceName) {
            ObsSchedService.unassignResourcesFromSubarray(vm.subarray.id, resourceName);
        };

        vm.reactivateReceptor = function (receptors) {
            ObsSchedService.reactivateSubarrayReceptor(vm.subarray.id, receptors);
        };

        vm.openTemplateListDialog = function ($event) {
            $mdDialog
                .show({
                    controller: function ($rootScope, $scope, $mdDialog) {
                        $scope.title = 'Select a Template';
                        $scope.templates = ObsSchedService.resourceTemplates;
                        ObsSchedService.listResourceTemplates();

                        $scope.hide = function () {
                            $mdDialog.hide();
                        };
                        $scope.templateSelected = function (template) {
                            $mdDialog.hide();
                            ObsSchedService.loadResourceTemplate(vm.subarray, template);
                        };
                    },
                    template:
                        '<md-dialog style="padding: 0; min-width: 800px" md-theme="{{$root.themePrimary}}">' +
                        '   <div style="padding: 0; margin: 0; overflow: hidden" layout="column">' +
                        '       <md-toolbar class="md-primary" layout="row" layout-align="center center">' +
                        '           <span flex style="margin-left: 16px;">{{::title}}</span>' +
                        '           <div layout="row" style="position: absolute; left: 8px; right: 0; bottom: 0; font-size: 12px">' +
                        '               <span style="min-width: 300px; max-width: 300px;">Name</span>' +
                        '               <span style="min-width: 35px; max-width: 35px;">Band</span>' +
                        '               <span style="min-width: 100px; max-width: 100px;">Product</span>' +
                        '               <span style="min-width: 350px; max-width: 350px;">Resources</span>' +
                        '           </div>' +
                        '       </md-toolbar>' +
                        '       <div flex layout="column" layout-align="center center" style="overflow: auto;">' +
                        '           <div flex layout="row" layout-align="center center" ng-repeat="template in displayedTemplates = (templates | filter:{activated: true} | orderBy:name:true) track by $index" ng-click="templateSelected(template); hide()" class="config-label-list-item span-text-overflow-hidden-ellipsis">' +
                        '               <span style="min-width: 300px; max-width: 300px;" title="{{template.name}}">{{template.name}}</span>' +
                        '               <span style="min-width: 35px; max-width: 35px;">{{template.band}}</span>' +
                        '               <span style="min-width: 100px; max-width: 100px;" title="{{template.product}}">{{template.product}}</span>' +
                        '               <span style="min-width: 350px; max-width: 350px;" title="{{template.resources}}">{{template.resources}}</span>' +
                        '           </div>' +
                        '           <i flex ng-show="displayedTemplates.length === 0">No templates found, create one first.</i>' +
                        '       </div>' +
                        '       <div layout="row" layout-align="end end" style="margin-top: 8px; margin-right: 8px; margin-bottom: 8px; min-height: 40px;">' +
                        '           <md-button style="margin-left: 8px;" class="md-primary md-raised" md-theme="{{$root.themePrimaryButtons}}" aria-label="OK" ng-click="hide()">Cancel</md-button>' +
                        '       </div>' +
                        '   </div>' +
                        '</md-dialog>',
                    targetEvent: event
                });
        };

        vm.saveTemplateDialog = function ($event) {

            var allocations = ObsSchedService.sensorValues[vm.subarray.name + '_allocations'].parsedValue;
            var resourceNames = allocations.map(function (allocation) {
                return allocation[0];
            });
            resourceNames = resourceNames.join(',');

            $mdDialog
                .show({
                    controller: function ($rootScope, $scope, $mdDialog) {
                        $scope.title = 'Update an Existing Template...';
                        $scope.templates = ObsSchedService.resourceTemplates;
                        $scope.template = {
                            name: "",
                            resources: resourceNames,
                            band: vm.subarray.band,
                            product: vm.subarray.product};
                        ObsSchedService.listResourceTemplates();

                        $scope.hide = function () {
                            $mdDialog.hide();
                        };
                        $scope.templateSelected = function (template) {
                            NotifyService.showImportantConfirmDialog(event, 'Confirm Overwrite',
                                'Are you sure you want to overwrite the template?',
                                'Yes', 'Cancel')
                                    .then(function () {
                                        $scope.template = template;
                                        $scope.template.resources = resourceNames;
                                        $scope.template.band = vm.subarray.band;
                                        $scope.template.product = vm.subarray.product;
                                        ObsSchedService.modifyResourceTemplate($scope.template);
                                    });
                        };
                        $scope.createNewTemplate = function () {
                            ObsSchedService.addResourceTemplate($scope.template);
                            $mdDialog.hide();
                        };
                        $scope.deactivateResourceTemplate = function (template) {
                            NotifyService.showImportantConfirmDialog(event, 'Confirm Delete',
                                'Are you sure you want to delete the template ' + template.name + '?',
                                'Yes', 'Cancel')
                                    .then(function () {
                                        $scope.template = template;
                                        $scope.template.activated = false;
                                        ObsSchedService.modifyResourceTemplate($scope.template);
                                    });
                        };
                    },
                    template:
                        '<md-dialog style="padding: 0;" md-theme="{{$root.themePrimary}}">' +
                        '   <div style="padding: 0; margin: 0; overflow: hidden" layout="column">' +
                        '       <md-toolbar class="md-primary" layout="row" layout-align="center center">' +
                        '           <span flex style="margin-left: 16px;">{{::title}}</span>' +
                        '           <div layout="row" style="position: absolute; left: 8px; right: 0; bottom: 0; font-size: 12px">' +
                        '               <span style="min-width: 300px; max-width: 300px;">Name</span>' +
                        '               <span style="min-width: 35px; max-width: 35px;">Band</span>' +
                        '               <span style="min-width: 100px; max-width: 100px;">Product</span>' +
                        '               <span style="min-width: 350px; max-width: 350px;">Resources</span>' +
                        '           </div>' +
                        '       </md-toolbar>' +
                        '       <div flex layout="column" style="overflow: auto;">' +
                        '           <div layout="row" layout-align="center center" ng-repeat="template in templates | filter:{activated: true} | orderBy:name:true track by $index" ng-click="templateSelected(template); hide()" class="config-label-list-item">' +
                        '               <span style="min-width: 300px; max-width: 300px;" title="{{template.name}}">{{template.name}}</span>' +
                        '               <span style="min-width: 35px; max-width: 35px;">{{template.band}}</span>' +
                        '               <span style="min-width: 100px; max-width: 100px;" title="{{template.product}}">{{template.product}}</span>' +
                        '               <span style="min-width: 350px; max-width: 350px;" title="{{template.resources}}">{{template.resources}}</span>' +
                        '               <md-button ng-if="$root.expertOrLO" class="md-icon-button inline-action-button"' +
                        '                   ng-click="deactivateResourceTemplate(template); $event.stopPropagation()"' +
                        '                   title="Delete Template" style="margin: 0;padding: 0;max-height: 20px;min-height: 20px;width: 20px;">' +
                        '                   <md-icon class="fa" md-font-icon="fa-trash"></md-icon>' +
                        '               </md-button>' +
                        '           </div>' +
                        '       </div>' +
                        '       <div layout="row" layout-align="center center" style="margin: 0px 8px; min-height: 40px; border-top: 1px dashed #d7d7d7;border-bottom: 1px dashed #d7d7d7;">' +
                        '           <i style="font-size: 18px;">OR create a new template...</i>' +
                        '       </div>' +
                        '       <div layout="row" layout-align="end center" style="margin-top: 0px; min-height: 40px;">' +
                        '           <md-input-container md-no-float md-theme="{{themePrimary}}" flex style="margin: 4px 8px; min-width: 300px;"><input placeholder="Template Name..." ng-model="template.name"></md-input-container>' +
                        '           <md-button ng-disabled="template.name.length < 3" style="margin-left: 8px;" class="md-primary md-raised" md-theme="{{$root.themePrimaryButtons}}" aria-label="OK" ng-click="createNewTemplate()">Create New</md-button>' +
                        '           <md-button style="margin-left: 8px;" class="md-primary md-raised" md-theme="{{$root.themePrimaryButtons}}" aria-label="OK" ng-click="hide()">Cancel</md-button>' +
                        '       </div>' +
                        '   </div>' +
                        '</md-dialog>',
                    targetEvent: event
                });
        };

        vm.unbindShortcuts = $rootScope.$on("keydown", function (e, key) {
            if (key === 27) {
                //clear selection when pressing escape
                ObsSchedService.poolResourcesFree.forEach(function (item) {
                    item.selected = false;
                });
            } else if (key === 13) {
                vm.assignSelectedResources();
            }
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        });

        $scope.$on('$destroy', function () {
            vm.unbindShortcuts('keydown');
        });

        vm.sensorClass = function(status) {
            return status + '-sensor-list-item';
        };
    }

})();
