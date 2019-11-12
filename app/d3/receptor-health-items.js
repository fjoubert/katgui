/*jshint loopfunc: true */
angular.module('katGui.d3')

    .directive('receptorHealthList', function ($rootScope, d3Util, $timeout, $interval, $log, StatusService) {
        return {
            restrict: 'E',
            template: [
                '<div ng-repeat="receptor in vm.receptorList track by receptor" ng-if="vm.receptorList.length > 0" ng-switch="vm.mapType" style="display: inline-block" ng-class="{\'in-maintenance-receptor\':getReceptorInMaintenance(receptor)}">',
                    '<receptor-health-pack-map class="treemap-container" receptor="receptor" ng-switch-when="Pack"></receptor-health-pack-map>',
                    '<receptor-health-partition-map class="treemap-container" receptor="receptor" ng-switch-when="Partition"></receptor-health-partition-map>',
                    '<receptor-health-icicle-map class="treemap-container" receptor="receptor" ng-switch-when="Icicle"></receptor-health-icicle-map>',
                    '<receptor-health-sunburst-map class="treemap-container" receptor="receptor" ng-right-click="vm.openMenuItems($event)" menu-items = "vm.menuItems" ng-class="{\'hide-menu\': !vm.sensorValue}" ng-switch-when="Sunburst"></receptor-health-sunburst-map>',
                '</div>'
            ].join(''),
            link: function (scope) {

                scope.vm.redrawCharts = function () {
                    $rootScope.$emit('redrawChartMessage', {size: scope.vm.treeChartSize});
                };

                scope.getReceptorInMaintenance = function (receptor) {
                    var maintenanceSensor = StatusService.sensorValues[receptor + '_marked_in_maintenance'];
                    return maintenanceSensor? maintenanceSensor.value: false;
                };
            }
        };
    });
