angular.module('katGui.d3')

    .factory('d3Util', function ($q, $timeout, $rootScope, $log, StatusService, ConfigService, MOMENT_DATETIME_FORMAT,
                                 NotifyService, MonitorService) {

        var api = {};

        // Compute the treemap layout recursively such that each group of siblings
        // uses the same size (1×1) rather than the dimensions of the parent cell.
        // This optimizes the layout for the current zoom state. Note that a wrapper
        // object is created for the parent node for each group of siblings so that
        // the parent’s dimensions are not discarded as we recurse. Since each group
        // of sibling was laid out in 1×1, we must rescale to fit using absolute
        // coordinates. This lets us use a viewport to zoom.
        api.layout = function (d, mapLayout) {
            if (d._children) {
                mapLayout.nodes({_children: d._children});
                d._children.forEach(function (c) {
                    c.x = d.x + c.x * d.dx;
                    c.y = d.y + c.y * d.dy;
                    c.dx *= d.dx;
                    c.dy *= d.dy;
                    c.parent = d;
                    api.layout(c);
                });
            }
        };

        //the status class in the sensor objects that we get are numbers but we need
        //these string values so that we can apply proper class names to the html sensor elements
        api.statusClassFromNumber = function (num) {
            switch (num) {
                case 0:
                    return 'unknown';
                case 1:
                    return 'nominal';
                case 2:
                    return 'warn';
                case 3:
                    return 'error';
                case 4:
                    return 'failure';
                case 5:
                    return 'unreachable';
                case 6:
                    return 'inactive';
                default:
                    return 'inactive';
            }
        };

        //trim unnecessary characters from sensor names and bind to the new attribute in the directive classes
        api.trimmedReceptorName = function (d, argName) {
            if (d.depth > 0) {
                d.sensorValue.trimmedName = d.sensorValue.trimmedName.replace(argName + '_', '');
                return d.sensorValue.trimmedName;
            } else {
                return d.name;
            }
        };

        //convenience function to create the id's for the html elements that needs to be styled
        api.createSensorId = function (d, rootName) {
            if (!d.prefix) {
                d.prefix = '';
            }
            if (d.depth > 0) {
                return d.prefix + rootName + "_" + (d.sensor || d.name);
            } else {
                return d.prefix + d.name + "_" + (d.sensor || d.name);
            }
        };

        //convenience function to populate every item's tooltip
        api.applyTooltipValues = function (node, tooltip, rootName) {
            //d.on is not defined while transitioning
            if (node.on) {
                node.on("mouseover", function (d) {
                    api.updateTooltipValues(d, tooltip, rootName);
                    tooltip.style("visibility", "visible");
                }).on("mousemove", function (d) {
                    var fullSensorName = api.updateTooltipValues(d, tooltip, rootName);
                    var uiViewDiv = document.querySelector('#ui-view-container-div');
                    var offset = d3.mouse(uiViewDiv);
                    var x = offset[0];
                    var y = offset[1];

                    if (window.innerWidth - x < 320) {
                        x = window.innerWidth - 320;
                    }
                    if (window.innerHeight - y < 225) {
                        y = window.innerHeight - 225;
                    }
                    tooltip
                        .style("top", (y + 15 + angular.element(uiViewDiv).scrollTop()) + "px")
                        .style("left", (x + 5 + angular.element(uiViewDiv).scrollLeft()) + "px");
<<<<<<< HEAD

=======
                    tooltip.attr("sensor", fullSensorName);
>>>>>>> e502a832... Merge pull request #518 from ska-sa/user/xinyuwu/MT-1037/add_userlog_context_menu_on_starburst_page
                }).on("mouseout", function () {
                    tooltip.style("visibility", "hidden");
                });
            }
        };

        api.updateTooltipValues = function (d, tooltip, rootName) {
            var sensorValue;
            var pythonIdentifier = (d.sensor || d.name).replace(/\./g, '_');
            var prefix = d.prefix? d.prefix : '';
            var fullSensorName = prefix + (rootName? rootName + '_' : '') + (d.sensor || d.name);
            if ((d.sensor || d.name) && StatusService.sensorValues[pythonIdentifier]) {
                sensorValue = StatusService.sensorValues[pythonIdentifier];
            }
            else if (StatusService.sensorValues && StatusService.sensorValues[fullSensorName]) {
                sensorValue = StatusService.sensorValues[fullSensorName];
            } else  {
                sensorValue = d.sensorValue;
            }
            if (!d.sensor) {
                tooltip.html(
                    "<div style='font-size: 14px'>" +
                    "<div><b>" + fullSensorName + "</b></div>" +
                    "<div>No sensor defined</div>" +
                    "</div>"
                );
            } else if (sensorValue) {
                tooltip.html(
                    "<div style='font-size: 14px'>" +
                    "<div><b>" + fullSensorName + "</b></div>" +
                    //"<div>" + prefix+","+rootName+","+d.component+","+d.sensor+"</div>" +
                    "<div><span style='width: 100px; display: inline-block; font-style: italic'>value:</span>" + sensorValue.value + "</div>" +
                    "<div><span style='width: 100px; display: inline-block; font-style: italic'>status:</span>" + sensorValue.status + "</div>" +
                    "<div><span style='width: 100px; display: inline-block; font-style: italic'>timestamp:</span>" + moment.utc(sensorValue.time, 'X').format(MOMENT_DATETIME_FORMAT) + "</div>" +
                    "</div>"
                );
            } else {
                tooltip.html(
                    "<div style='font-size: 14px'>Error Reading Sensor Value: "+fullSensorName+"</div>"
                );
            }

            return fullSensorName;
        };

        api.updateGraphTooltipValues = function (d, tooltip) {
            var html = "<div class='chart-tooltip'>";
            if (d.name) {
                html += "<i>" + d.name + "</i>";
            }
            html += "<br/><b>" + d.TooltipValue + "</b>" +
            "<br/>"+ moment.utc(d.Timestamp, 'X').format(MOMENT_DATETIME_FORMAT) +
            "</div>";
            tooltip.html(html);
        };

        //convenience function to create the tooltip div on the given element
        api.createTooltip = function (element) {
            return d3.select(element).append('div')
                .attr('class', 'treemap-tooltip')
                .style('visibility', 'hidden')
                .style('background-color', '#ffffff');
        };

        //because we subscribe to monitor for our data and have to wait for our data to trickle in
        //we cant just immediately bind to our data, this convenience function waits until we have
        //data that we can bind to and returns a promise that the client can wait on
        //only applicable to the receptor status tree map, other directive's bindings works properly
        api.waitUntilDataExists = function (data) {
            var deferred = $q.defer();
            var retries = 0, maxRetries = 50;

            //start checking later so that the promise is always returned before it can be resolved
            $timeout(function () {
                checkIfDataExists();
            }, 1);

            function checkIfDataExists() {
                if (data.children.length === 0 && retries < maxRetries) {
                    $timeout(function () {
                        checkIfDataExists();
                    }, 500);
                    retries++;
                } else if (retries >= maxRetries) {
                    deferred.reject();
                } else {
                    deferred.resolve();
                }
            }

            return deferred.promise;
        };

        api.displayInitErrorMessage = function (dataMapName) {
            NotifyService.showSimpleDialog('Error displaying data', 'Could not display the Receptor Status data, contact the katGUI support team.');
            $log.error('Error binding to StatusService data for receptor ' + dataMapName);
        };

        api.showDialogForAggregateSensorInfo = function (sensor) {
            if (ConfigService.aggregateSensorDetail[sensor.sensor]) {
                MonitorService.showAggregateSensorsDialog(
                    'Aggregate Sensor ' + sensor.sensor + ' Details',
                    JSON.stringify(ConfigService.aggregateSensorDetail[sensor.sensor], null, 4));
            } else {
                $log.error('No such aggregate sensor in ConfigService ' + sensor.sensor);
            }
        };

        return api;
    });
