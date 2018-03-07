/*jshint loopfunc: true */
(function() {

    angular.module('katGui.services')
        .service('StatusService', StatusService);

    function StatusService($rootScope, $interval) {

        var api = {};
        api.statusData = {};
        api.receptors = [];
        /*api.StatusTrees = {};
        api.StatusTrees["top"] = {};
        api.StatusTrees["sub"] = {};
        api.StatusTrees["cbf"] = {};
        api.topStatusTrees = api.StatusTrees["top"];*/
        api.topStatusTrees = []; 
        api.subStatusTrees = []; 
        api.cbfStatusTrees = []; 
        api.itemsToUpdate = {};
        api.sensorValues = {};
        api.resourcesInMaintenance = '';
        api.controlledResources = [];
        api.receptorTreesSensors = {};
        api.configHealthSensors = {};
        api.customHealthSensors = {};
        api.updateQueue = [];

        api.addToUpdateQueue = function(sensor) {
            api.updateQueue.push(sensor);
        };

        api.setReceptorsAndStatusTree = function(statusTree, receptors) {
            api.receptors.splice(0, api.receptors.length);
            receptors.forEach(function(receptor) {
                api.receptors.push(receptor);
            });

            api.controlledResources.forEach(function(resource) {
                var newStatusDataResource = {};
                if (api.statusData[resource]) {
                    newStatusDataResource = api.statusData[resource];
                }
                newStatusDataResource.name = resource;

                newStatusDataResource.sensor = statusTree.sensor.replace('.', '_').replace('-', '_');
                if (api.receptors.indexOf(resource) > -1) {
                    newStatusDataResource.children = statusTree.children;
                }

                api.statusData[resource] = newStatusDataResource;
            });
        };

        api.setTopStatusTrees = function(statusTrees) {
            api.topStatusTrees.splice(0, api.topStatusTrees.length);

            for (var treeName in statusTrees) {
                var tree = statusTrees[treeName];
                api.topStatusTrees.push(tree);

                tree.children = [];
                tree.subs.forEach(function(sub) {
                    var newSub = {
                        prefix: sub.component + '_',
                        component: sub.component,
                        sensor: sub.sensor,
                        name: sub.name
                    };
                    tree.children.push(newSub);
                });
            }
        };

        api.setSubStatusTrees = function(statusTrees) {
            api.subStatusTrees.splice(0, api.subStatusTrees.length);

            for (var treeName in statusTrees) {
                var tree = statusTrees[treeName];
                api.subStatusTrees.push(tree);

                tree.children = [];
                tree.subs.forEach(function(sub) {
                    var newSub = {
                        prefix: sub.component + '_',
                        component: sub.component,
                        sensor: sub.sensor,
                        name: sub.name
                    };
                    tree.children.push(newSub);
                });
            }
        };


        api.setCbfStatusTrees = function(statusTrees) {
            api.cbfStatusTrees.splice(0, api.cbfStatusTrees.length);

            for (var treeName in statusTrees) {
                var tree = statusTrees[treeName];
                api.cbfStatusTrees.push(tree);

                tree.children = [];
                tree.subs.forEach(function(sub) {
                    var newSub = {
                        prefix: sub.component + '_',
                        component: sub.component,
                        sensor: sub.sensor,
                        name: sub.name
                    };
                    tree.children.push(newSub);
                });
            }
        };


        function applyValueToSensor(node, sensorName, value, rootName) {
            var prefix = node.prefix ? node.prefix : '';
            if (sensorName === prefix + rootName + '_' + node.sensor) {
                if (!node.sensorValue) {
                    node.sensorValue = {};
                }
                for (var attr in value) {
                    node.sensorValue[attr] = value[attr];
                }
            } else if (node.children && node.children.length > 0) {
                for (var child in node.children) {
                    applyValueToSensor(node.children[child], sensorName, value, rootName);
                }
            }
        }

        api.receptorMaintenanceMessageReceived = function(sensor) {
            // TODO redo
            api.resourcesInMaintenance = sensor.value;
            var attributes = Object.keys(api.sensorValues);
            for (var i = 0; i < attributes.length; i++) {
                var sensorName = attributes[i];
                d3.selectAll('rect.health-full-item.' + sensorName).attr('class', function(d) {
                    return api.getClassesOfSensor(d, attributes[i], true) + ' health-full-item';
                });
                d3.selectAll('g.health-full-item.' + sensorName).attr('class', function(d) {
                    return api.getClassesOfSensor(d, attributes[i], true) + ' health-full-item';
                });
            }
        };

        api.applyPendingUpdates = function() {
            while (api.updateQueue.length > 0) {
                var sensorName = api.updateQueue.pop();
                d3.select('.' + sensorName)
                    .attr('class', api.sensorValues[sensorName].status + '-child ' + sensorName);
            }
        };

        api.getClassesOfSensor = function(d, sensorToUpdateName, checkMaintenance) {
            if (!d) {
                return;
            }
            d.sensorValue = api.sensorValues[sensorToUpdateName];
            var statusClassResult = sensorToUpdateName;
            if (checkMaintenance && api.resourcesInMaintenance.indexOf(d.sensor.replace('agg_', '').split('_')[0]) > -1) {
                statusClassResult += ' in-maintenance-child ';
            } else if (d.sensorValue.status !== undefined) {
                statusClassResult += ' ' + d.sensorValue.status + '-child';
            } else if (api.itemsToUpdate[d.sensor]) {
                statusClassResult += ' ' + api.itemsToUpdate[d.sensor].status + '-child';
            }

            statusClassResult += d.dx > 300 ? " child-big-text" : " child";
            return statusClassResult;
        };

        return api;
    }
})();
