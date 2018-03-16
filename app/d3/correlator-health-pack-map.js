angular.module('katGui.d3')

    .directive('correlatorHealthPackMap', function (StatusService, $localStorage, $rootScope, d3Util) {
        return {
            restrict: 'E',
            scope: {
                dataMapName: '=correlator',
                sizeStorageKey: '@'
            },
            link: function (scope, element) {

                var data = StatusService.statusData[scope.dataMapName];
                var node, root, transitionDuration = 250;
                var margin = {top: 8, right: 8, left: 8, bottom: 8};
                var tooltip = d3.select(angular.element(document.querySelector('.treemap-tooltip'))[0]);
                var containerSvg, svg;
                scope.sizeStorageKey = scope.sizeStorageKey? scope.sizeStorageKey : 'correlatorHealthDisplaySize';

                if ($localStorage[scope.sizeStorageKey]) {
                    scope.chartSize = JSON.parse($localStorage[scope.sizeStorageKey]);
                } else {
                    scope.chartSize = {width: 480, height: 480};
                }

                var unbindRedraw = $rootScope.$on('redrawChartMessage', function (event, message) {
                    if (message.size.width) {
                        scope.chartSize.width = message.size.width;
                    }
                    if (message.size.height) {
                        scope.chartSize.height = message.size.height;
                    }
                    containerSvg.remove();
                    scope.redraw();
                });

                scope.data = function () {
                    if (scope.dataMapName instanceof Object) {
                        return scope.dataMapName;
                    } else {
                        return StatusService.statusData[scope.dataMapName];
                    }
                };

                scope.dataName = function () {
                    if (scope.dataMapName instanceof Object) {
                        return scope.dataMapName.name;
                    } else {
                        return scope.dataMapName;
                    }
                };

                scope.$on('$destroy', function () {
                    unbindRedraw();
                });

                scope.redraw = function () {
                    if (!scope.data()) {
                        return;
                    }

                    var width = scope.chartSize.width;
                    var height = scope.chartSize.height;
                    var radius = height;
                    node = root = scope.data();

                    //create our maplayout for the data and sort it alphabetically
                    //the bockvalue is the relative size of each child element, it is
                    //set to a static 100 when we get our monitor data in the StatusService
                    var mapLayout = d3.layout.pack()
                        .size([radius, radius])
                        .value(function () {
                            return 1;
                        });

                    //create our x,y axis linear scales
                    var x = d3.scale.linear().range([0, radius]);
                    var y = d3.scale.linear().range([0, radius]);

                    //create the main svg element
                    containerSvg = d3.select(element[0]).append("svg")
                        .attr("width", width)
                        .attr("height", height)
                        .attr("class", "health-chart treemapHealthChart" + scope.dataName())
                        .style("margin-left", margin.left + "px")
                        .style("margin-right", margin.right + "px");
                    svg = containerSvg.append("g");
                    containerSvg.attr("transform", "translate(" + (width - radius) / 2 + "," + (height - radius) / 2 + ")");

                    var nodes = mapLayout.nodes(scope.data());

                    //create a svg:circle element for each child node
                    svg.selectAll("circle")
                        .data(nodes)
                        .enter().append("circle")
                        .attr("class", function (d) {
                            var prefix = d.prefix? d.prefix : '';
                            var classStr = '';
                            var dataName = '';
                            if (scope.dataMapName instanceof Object) {
                                classStr = dataName = d.sensor;
                            } else {
                                classStr = d3Util.createSensorId(d, scope.dataName());
                                dataName = prefix + scope.dataName() + '_' + d.sensor;
                            }
                            classStr += ' ' + (StatusService.sensorValues[dataName] ?
                                    StatusService.sensorValues[dataName].status : 'inactive') + '-child child';
                            return classStr;
                        })
                        .attr("cx", function (d) {
                            return d.x;
                        })
                        .attr("cy", function (d) {
                            return d.y;
                        })
                        .attr("r", function (d) {
                            return d.r;
                        })
                        .on("click", function (d) {
                            return zoomPack(node === d ? root : d);
                        })
                        .call(function (d) {
                            d3Util.applyTooltipValues(d, tooltip, scope.dataName());
                        });

                    //create a svg:text element for each child node
                    svg.selectAll("text")
                        .data(nodes)
                        .enter().append("text")
                        .attr("x", function (d) {
                            if (d.depth > 0) {
                                return d.x;
                            } else {
                                return width / 2 - 10;
                            }
                        })
                        .attr("y", function (d) {
                            if (d.depth > 0) {
                                return d.y;
                            } else {
                                return 18;
                            }
                        })
                        .attr("dy", ".35em")
                        .attr("text-anchor", "middle")
                        .style("opacity", function (d) {
                            return d.r > 50 ? 1 : 0;
                        })
                        .text(function (d) {
                            return d.name;
                        });

                    //zoom functionality when clicking a child element
                    function zoomPack(d) {

                        var k = radius / d.r / 2;
                        x.domain([d.x - d.r, d.x + d.r]);
                        y.domain([d.y - d.r, d.y + d.r]);

                        var transition = svg.transition()
                            .duration(transitionDuration);

                        transition.selectAll("circle")
                            .attr("cx", function (d) {
                                return x(d.x);
                            })
                            .attr("cy", function (d) {
                                return y(d.y);
                            })
                            .attr("r", function (d) {
                                return k * d.r;
                            })
                            .call(function (d) {
                                d3Util.applyTooltipValues(d, tooltip, scope.dataName());
                            });

                        transition.selectAll("text")
                            .attr("x", function (d) {
                                if (d.depth > 0) {
                                    return x(d.x);
                                } else {
                                    return width / 2 - 10;
                                }
                            })
                            .attr("y", function (d) {
                                if (d.depth > 0) {
                                    return y(d.y);
                                } else {
                                    return 17;
                                }
                            })
                            .style("opacity", function (d) {
                                return k * d.r > 50 ? 1 : 0;
                            });

                        node = d;
                        d3.event.stopPropagation();
                    }
                };
                scope.redraw();
            }
        };
    });
