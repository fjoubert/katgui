angular.module('katGui.d3')

    .directive('receptorHealthIcicleMap', function (StatusService, $localStorage, $rootScope, d3Util) {
        return {
            restrict: 'E',
            scope: {
                dataMapName: '=receptor'
            },
            link: function (scope, element) {

                var data = StatusService.statusData[scope.dataMapName];
                var node, root, transitionDuration = 250;
                var margin = {top: 8, right: 8, left: 8, bottom: 8};
                var tooltip = d3.select(angular.element(document.querySelector('.treemap-tooltip'))[0]);
                var containerSvg, svg;
                //create our maplayout for the data and sort it alphabetically
                //the bockvalue is the relative size of each child element, it is
                //set to a static 100 when we get our monitor data in the StatusService
                var mapLayout = d3.layout.partition()
                    .value(function () {
                        return 10;
                    })
                    .sort(function (a, b) {
                        return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
                    });

                if ($localStorage['receptorHealthDisplaySize']) {
                    scope.chartSize = JSON.parse($localStorage['receptorHealthDisplaySize']);
                } else {
                    scope.chartSize = {width: 480, height: 480};
                }

                $rootScope.$on('redrawChartMessage', function (event, message) {
                    if (message.size.width) {
                        scope.chartSize.width = message.size.width;
                    }
                    if (message.size.height) {
                        scope.chartSize.height = message.size.height;
                    }
                    containerSvg.remove();
                    scope.redraw();
                });

                scope.redraw = function () {
                    var width = scope.chartSize.width;
                    var height = scope.chartSize.height;
                    node = root = data;

                    //create our x,y axis linear scales
                    var x = d3.scale.linear().range([0, width]);
                    var y = d3.scale.linear().range([0, height]);

                    //create the main svg element
                    containerSvg = d3.select(element[0]).append("svg")
                        .attr("width", width)
                        .attr("height", height)
                        .attr("class", "health-chart treemapHealthChart" + scope.dataMapName)
                        .style("margin-left", margin.left + "px")
                        .style("margin-right", margin.right + "px")
                        .style("margin-top", margin.top + "px")
                        .style("margin-bottom", margin.bottom + "px");
                    svg = containerSvg.append("g");

                    //create a svg:g element for each child node
                    var g = svg.selectAll("g")
                        .data(mapLayout.nodes(root))
                        .enter().append("rect")
                        .attr("x", function (d) {
                            return x(d.x);
                        })
                        .attr("y", function (d) {
                            return y(d.y);
                        })
                        .attr("width", function (d) {
                            return x(d.dx);
                        })
                        .attr("height", function (d) {
                            return y(d.dy);
                        })
                        .attr("id", function (d) {
                            return d3Util.createSensorId(d, scope.dataMapName);
                        })
                        //style each element according to its status
                        .attr("class", function (d) {
                            var classStr = d3Util.createSensorId(d, scope.dataMapName) + ' ';
                            classStr += (StatusService.sensorValues[scope.dataMapName + '_' + d.sensor] ?
                                StatusService.sensorValues[scope.dataMapName + '_' + d.sensor].status : 'inactive') + '-child child';
                            return classStr;
                        })
                        .call(function (d) {
                            d3Util.applyTooltipValues(d, tooltip, scope.dataMapName);
                        })
                        .on("click", icicleClicked);

                    //create text overlays for each svg element
                    var t = svg.selectAll("g")
                        .data(mapLayout.nodes(root)).enter()
                        .append("svg:text")
                        .attr("x", function (d) {
                            return x(d.x);
                        })
                        .attr("y", function (d) {
                            return y(d.y);
                        })
                        .attr("dy", ".2em")
                        .style("opacity", function (d) {
                            return x(d.x + d.dx) - x(d.x) > 14.5 ? 1 : 0;
                        })
                        .text(function (d) {
                            return d.name;
                        })
                        .attr("class", function (d) {
                            var classStr = d3Util.createSensorId(d, scope.dataMapName) + ' ';
                            classStr += (StatusService.sensorValues[scope.dataMapName + '_' + d.sensor] ?
                                StatusService.sensorValues[scope.dataMapName + '_' + d.sensor].status : 'inactive');
                            if (d.depth === 0) {
                                return classStr + '-child-text parent';
                            } else {
                                return classStr + '-child-text child';
                            }
                        })
                        .attr("text-anchor", "middle")
                        .attr("transform", function (d) {
                            var halfWidth = (x(d.x + d.dx) - x(d.x)) / 2,
                                halfHeight = (y(d.y + d.dy) - y(d.y)) / 2;

                            var strTranslate = "translate(" + halfWidth + "," + halfHeight + ")";
                            if (halfWidth < 120 && d.depth > 0) {
                                strTranslate += "rotate(90, " + x(d.x) + ", " + y(d.y) + ")";
                            }
                            return strTranslate;
                        });

                    //implement zoom functionality
                    function icicleClicked(d) {
                        x.domain([d.x, d.x + d.dx]);
                        y.domain([d.y, 1]).range([d.y ? 20 : 0, height]);

                        g.transition()
                            .duration(transitionDuration)
                            .attr("x", function (d) {
                                return x(d.x);
                            })
                            .attr("y", function (d) {
                                return y(d.y);
                            })
                            .attr("width", function (d) {
                                return x(d.x + d.dx) - x(d.x);
                            })
                            .attr("height", function (d) {
                                return y(d.y + d.dy) - y(d.y);
                            });

                        t.transition()
                            .duration(transitionDuration)
                            .attr("x", function (d) {
                                return x(d.x);
                            })
                            .attr("y", function (d) {
                                return y(d.y);
                            })
                            .style("opacity", function (d) {
                                return x(d.x + d.dx) - x(d.x) > 14.5 ? 1 : 0;
                            })
                            .attr("text-anchor", "middle")
                            .attr("transform", function (d) {
                                var halfWidth = (x(d.x + d.dx) - x(d.x)) / 2,
                                    halfHeight = (y(d.y + d.dy) - y(d.y)) / 2;

                                var strTranslate = "translate(" + halfWidth + "," + halfHeight + ")";
                                if (halfWidth < 120 && d.depth > 0) {
                                    strTranslate += "rotate(90, " + x(d.x) + ", " + y(d.y) + ")";
                                }
                                return strTranslate;
                            });
                        d3.event.stopPropagation();
                    }
                };
                scope.redraw();
            }
        };
    });
