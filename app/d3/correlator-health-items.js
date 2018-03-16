/*jshint loopfunc: true */
angular.module('katGui.d3')

    .directive('correlatorHealthList', function ($rootScope, d3Util, $timeout, $interval, $log, StatusService) {
        return {
            restrict: 'E',
            template: [
                '<div ng-repeat="correlator in vm.correlatorList track by correlator" ng-if="vm.correlatorList.length > 0" ng-switch="vm.mapType" style="display: inline-block" ng-class="{\'in-maintenance-correlator\':getReceptorInMaintenance(correlator)}">',
                    '<correlator-health-pack-map class="treemap-container" correlator="correlator" ng-switch-when="Pack"></correlator-health-pack-map>',
                    '<correlator-health-partition-map class="treemap-container" correlator="correlator" ng-switch-when="Partition"></correlator-health-partition-map>',
                    '<correlator-health-icicle-map class="treemap-container" correlator="correlator" ng-switch-when="Icicle"></correlator-health-icicle-map>',
                    '<correlator-health-sunburst-map class="treemap-container" correlator="correlator" ng-switch-when="Sunburst"></correlator-health-sunburst-map>',
                '</div>'
            ].join(''),
            link: function (scope) {

                scope.vm.redrawCharts = function () {
                    $rootScope.$emit('redrawChartMessage', {size: scope.vm.treeChartSize});
                };

                scope.getReceptorInMaintenance = function (correlator) {
                    var maintenanceSensor = StatusService.sensorValues[correlator + '_marked_in_maintenance'];
                    return maintenanceSensor? maintenanceSensor.value: false;
                };
            }
        };
    });
