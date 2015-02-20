angular.module('katGui.d3')

    .directive('receptorStatusList', function () {
        return {
            restrict: 'E',
            template: '<d3-treemap ng-repeat="receptor in vm.receptorList" ng-if="vm.receptorList.length > 0" class="treemap-container" datan="receptor" chart-size="vm.treeChartSize" map-type="vm.mapType" ></d3-treemap>',
            link: function (scope, element) {

            }
        };
    })

    .directive('d3Treemap', function ($window, d3Service, StatusService, $timeout, $rootScope) {
        return {
            restrict: 'EA',
            scope: {
                data: '=',
                datan: '=',
                chartSize: '=',
                mapType: '='
            },
            replace: false,
            link: function (scope, element) {

                d3Service.d3().then(function (d3) {

                    var cacheData = null;
                    if (scope.data) {
                        cacheData = scope.data;
                    } else {
                        cacheData = StatusService.statusData[scope.datan];
                    }

                    var width = scope.chartSize.width, height = scope.chartSize.height, inited = false, r = 720, node, root, padding = 5, duration = 500;
                    var arc;

                    var margin = {top: 8, right: 8, left: 8, bottom: 8},
                        transitioning;

                    scope.$watch('mapType', function (newVal, oldVal) {
                        if (oldVal !== newVal) {
                            inited = false;
                            d3.selectAll(".treemapHealthChart" + scope.datan).remove();
                            displayIfDataExists();
                        }
                    });

                    var tooltip = d3.select(element[0]).append("div")
                        .attr("class", "treemap-tooltip")
                        .style("visibility", "hidden")
                        .style("background-color", "#ffffff");

                    displayIfDataExists();

                    function displayIfDataExists() {
                        if (cacheData.children.length === 0) {
                            $timeout(function () {
                                displayIfDataExists();
                            }, 100);
                        } else {
                            chart(cacheData);
                        }
                    }

                    function chart(data) {
                        var radius = height / 2;
                        node = root = data;

                        if (!inited && scope.mapType === 'tree') {
                            inited = true;
                            data._children = data.children;
                        }

                        width = scope.chartSize.width;
                        height = scope.chartSize.height;

                        r = height - 10;

                        var x = d3.scale.linear()
                            .domain([0, width])
                            .range([0, width]);

                        var y = d3.scale.linear()
                            .domain([0, height])
                            .range([0, height]);

                        if (scope.mapType === 'pack') {
                            x = d3.scale.linear().range([0, r]);
                            y = d3.scale.linear().range([0, r]);
                        } else if (scope.mapType === 'partition' || scope.mapType === 'icicle') {
                            x = d3.scale.linear().range([0, width]);
                            y = d3.scale.linear().range([0, height]);
                        } else if (scope.mapType === 'sunburst') {
                            x = d3.scale.linear().range([0, 2 * Math.PI]);
                            y = d3.scale.linear().range([0, radius]);
                        }

                        var mapLayout;

                        if (scope.mapType === 'tree') {
                            mapLayout = d3.layout.treemap()
                                .children(function (d, depth) {
                                    return depth ? null : d._children;
                                })
                                .sort(function (a, b) {
                                    return a.name < b.name ? 1 : a.name > b.name ? -1 : 0;
                                })
                                .round(false)
                                .value(function (d) {
                                    return d.blockValue;
                                });
                        } else if (scope.mapType === 'pack') {
                            mapLayout = d3.layout.pack()
                                .size([r, r])
                                .value(function (d) {
                                    return d.blockValue;
                                });
                        } else if (scope.mapType === 'partition') {
                            mapLayout = d3.layout.partition()
                                .value(function (d) {
                                    return d.blockValue;
                                })
                                .sort(function (a, b) {
                                    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
                                });
                        } else if (scope.mapType === 'icicle') {
                            mapLayout = d3.layout.partition()
                                .value(function (d) {
                                    return d.blockValue;
                                })
                                .sort(function (a, b) {
                                    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
                                });
                        } else if (scope.mapType === 'sunburst') {
                            mapLayout = d3.layout.partition()
                                .value(function (d) {
                                    return d.blockValue;
                                })
                                .sort(function (a, b) {
                                    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
                                });
                        } else {
                            console.log('wrong maptype!');
                            return;
                        }

                        var svg;

                        if (scope.mapType === 'pack') {
                            svg = d3.select(element[0]).append("svg")
                                .attr("width", width)
                                .attr("height", height)
                                .attr("class", "health-chart md-whiteframe-z2 treemapHealthChart" + scope.datan)
                                .style("margin-left", margin.left + "px")
                                .style("margin-right", margin.right + "px")
                                .append("g");
                            svg.attr("transform", "translate(" + (width - r) / 2 + "," + (height - r) / 2 + ")");
                        } else if (scope.mapType === 'tree') {
                            svg = d3.select(element[0]).append("svg")
                                .attr("width", width)
                                .attr("height", height + margin.top + 18)
                                .attr("class", "health-chart md-whiteframe-z2 treemapHealthChart" + scope.datan)
                                .style("margin-left", margin.left + "px")
                                .style("margin-right", margin.right + "px")
                                .style("margin-top", margin.top + "px")
                                .append("g");
                            svg.style("shape-rendering", "crispEdges");
                            //svg.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
                            var grandparent = svg.append("g")
                                .attr("class", "grandparent");

                            grandparent.append("rect")
                                .attr("y", 0)
                                .attr("width", width)
                                .attr("height", 26);

                            grandparent.append("text")
                                .attr("x", 6)
                                .attr("y", margin.top)
                                .attr("dy", ".75em");
                        } else if (scope.mapType === 'partition' || scope.mapType === 'icicle') {
                            svg = d3.select(element[0]).append("svg")
                                .attr("width", width)
                                .attr("height", height)
                                .attr("class", "health-chart md-whiteframe-z2 treemapHealthChart" + scope.datan)
                                .style("margin-left", margin.left + "px")
                                .style("margin-right", margin.right + "px")
                                .style("margin-top", margin.top + "px")
                                .style("margin-bottom", margin.bottom + "px")
                                .append("g");
                        } else if (scope.mapType === 'sunburst') {
                            svg = d3.select(element[0]).append("svg")
                                .attr("class", "health-chart md-whiteframe-z2 treemapHealthChart" + scope.datan)
                                .attr("width", width + padding * 2)
                                .attr("height", height + padding * 2)
                                .append("g")
                                .attr("transform", "translate(" + [radius + padding, radius + padding] + ")");
                        }

                        if (scope.mapType === 'pack') {
                            displayPack(data);
                        } else if (scope.mapType === 'partition') {
                            displayPartition();
                        } else if (scope.mapType === 'icicle') {
                            displayIcicle();
                        } else if (scope.mapType === 'sunburst') {
                            displaySunburst(data);
                        } else {
                            initialize(data);
                            layout(data);
                            display(data);
                        }

                        $rootScope.$on('sensorUpdateReceived', function (event, sensor) {
                            updateStatus(sensor);
                        });

                        function initialize(data) {
                            data.x = data.y = 0;
                            data.dx = width;
                            data.dy = height;
                            data.depth = 0;
                        }

                        // Aggregate the values for internal nodes. This is normally done by the
                        // treemap layout, but not here because of our custom implementation.
                        // We also take a snapshot of the original children (_children) to avoid
                        // the children being overwritten when when layout is computed.
                        function accumulate(d) {
                            return (d._children = d.children) ? d.blockValue = d.children.reduce(function (p, v) {
                                return p + accumulate(v);
                            }, 0) : d.blockValue;
                        }

                        // Compute the treemap layout recursively such that each group of siblings
                        // uses the same size (1×1) rather than the dimensions of the parent cell.
                        // This optimizes the layout for the current zoom state. Note that a wrapper
                        // object is created for the parent node for each group of siblings so that
                        // the parent’s dimensions are not discarded as we recurse. Since each group
                        // of sibling was laid out in 1×1, we must rescale to fit using absolute
                        // coordinates. This lets us use a viewport to zoom.
                        function layout(d) {
                            if (d._children) {
                                mapLayout.nodes({_children: d._children});
                                d._children.forEach(function (c) {
                                    c.x = d.x + c.x * d.dx;
                                    c.y = d.y + c.y * d.dy;
                                    c.dx *= d.dx;
                                    c.dy *= d.dy;
                                    c.parent = d;
                                    layout(c);
                                });
                            }
                        }

                        function statusClassFromNumber(num) {
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
                            }
                        }

                        function display(d) {
                            grandparent
                                .datum(d)
                                .attr("id", createId(d))
                                .attr("class", statusClassFromNumber(d.sensorValue.status) + '-child')
                                .on("click", transition)
                                .select("text")
                                .text(name(d))
                                .attr("class", statusClassFromNumber(d.sensorValue.status) + '-child-text');

                            var g1 = svg.insert("g", ".grandparent")
                                .datum(d)
                                .attr("class", "depth")
                                .attr("transform", function (d) {
                                    return "translate(0,26)";
                                });

                            var g = g1.selectAll("g")
                                .data(d._children)
                                .enter().append("svg").append("g");

                            g.filter(function (d) {
                                return d._children;
                            })
                                .classed("children", true)
                                .on("click", transition);


                            g.selectAll(".child")
                                .data(function (d) {
                                    return d._children || [d];
                                })
                                .enter().append("rect")
                                .attr("class", function (d) {
                                    if (d.objValue) {
                                        return statusClassFromNumber(d.objValue.status) + '-child';
                                    } else if (d.sensorValue) {
                                        return statusClassFromNumber(d.sensorValue.status) + '-child parent';
                                    }
                                })
                                .call(rect);

                            g.append("rect")
                                .attr("class", "parent")
                                .attr("id", createId)
                                .attr("class", function (d) {
                                    if (d.objValue) {
                                        return statusClassFromNumber(d.objValue.status) + '-child';
                                    } else if (d.sensorValue) {
                                        return statusClassFromNumber(d.sensorValue.status) + '-child parent';
                                    }
                                })
                                .call(rect);

                            g.append("text")
                                .attr("dy", ".75em")
                                .text(trimmedName)
                                .attr("class", function (d) {
                                    if (d.objValue) {
                                        return statusClassFromNumber(d.objValue.status) + '-child-text partition-text';
                                    } else if (d.sensorValue) {
                                        return statusClassFromNumber(d.sensorValue.status) + '-child-text parent';
                                    }
                                })
                                .classed("text-parent-node", true)
                                .call(text);

                            function transition(d) {
                                tooltip.style("visibility", "hidden");

                                if (transitioning || !d) {
                                    return;
                                }
                                transitioning = true;

                                var g2 = display(d),
                                    t1 = g1.transition().duration(duration),
                                    t2 = g2.transition().duration(duration);

                                // Update the domain only after entering new elements.
                                x.domain([d.x, d.x + d.dx]);
                                y.domain([d.y, d.y + d.dy]);

                                // Enable anti-aliasing during the transition.
                                svg.style("shape-rendering", null);

                                // Draw child nodes on top of parent nodes.
                                svg.selectAll(".depth").sort(function (a, b) {
                                    //this sorts the data by name ascending, so ANT1 < ANT2 < ANT3 etc
                                    return a.name < b.name ? 1 : a.name > b.name ? -1 : 0;
                                });

                                // Fade-in entering text.
                                g2.selectAll("text").style("fill-opacity", 0);

                                // Transition to the new view.
                                t1.selectAll("text").call(text).style("fill-opacity", 0);
                                t2.selectAll("text").call(text).style("fill-opacity", 1);
                                t1.selectAll("rect").call(rect);
                                t2.selectAll("rect").call(rect);

                                // Remove the old node when the transition is finished.
                                t1.remove().each("end", function () {
                                    svg.style("shape-rendering", "crispEdges");
                                    transitioning = false;
                                });
                            }

                            return g;
                        }

                        function text(t) {
                            t.attr("x", function (d) {
                                return x(d.x) + 6;
                            })
                                .attr("y", function (d) {
                                    return y(d.y) + 6;
                                });
                        }

                        function rect(r) {
                            r
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

                            //r.on is not defined while transitioning, so check it!
                            applyTooltip(r);
                        }

                        function applyTooltip(d) {
                            if (d.on) {
                                d
                                    .on("mouseover", function (d) {
                                        if (d.objValue) {
                                            tooltip.html(trimmedName(d) + " - " + statusClassFromNumber(d.objValue.status));
                                        } else if (d.sensorValue) {
                                            tooltip.html(trimmedName(d) + " - " + statusClassFromNumber(d.sensorValue.status));
                                        }
                                        tooltip.style("visibility", "visible");
                                    })
                                    .on("mousemove", function () {
                                        tooltip
                                            .style("top", (d3.event.layerY + 10) + "px")
                                            .style("left", (d3.event.layerX + 10) + "px");
                                    })
                                    .on("mouseout", function () {
                                        tooltip.style("visibility", "hidden");
                                    });
                            }
                        }

                        function name(d) {
                            return d.parent ? name(d.parent) + "." + d.name : d.name;
                        }

                        function trimmedName(d) {
                            return d.name.replace('mon_proxy:agg_' + scope.datan + '_', '');
                        }

                        function displayPack(dataT) {

                            var nodes = mapLayout.nodes(dataT);

                            svg.selectAll("circle")
                                .data(nodes)
                                .enter().append("svg:circle")
                                .attr("class", function (d) {
                                    if (d.objValue) {
                                        return statusClassFromNumber(d.objValue.status) + '-child';
                                    } else if (d.sensorValue) {
                                        return statusClassFromNumber(d.sensorValue.status) + '-child parent';
                                    }
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
                                .attr("id", createId)
                                .call(applyTooltip);

                            svg.selectAll("text")
                                .data(nodes)
                                .enter().append("svg:text")
                                .attr("class", function (d) {
                                    if (d.objValue) {
                                        return statusClassFromNumber(d.objValue.status) + '-child-text partition-text';
                                    } else if (d.sensorValue) {
                                        return statusClassFromNumber(d.sensorValue.status) + '-child-text parent';
                                    }
                                })
                                .attr("x", function (d) {
                                    return d.x;
                                })
                                .attr("y", function (d) {
                                    if (d.objValue) {
                                        return d.y;
                                    } else {
                                        return d.y - height / 2 + 20;
                                    }
                                })
                                .attr("dy", ".35em")
                                .attr("text-anchor", "middle")
                                .style("opacity", function (d) {
                                    return d.r > 50 ? 1 : 0;
                                })
                                .text(trimmedName);

                            d3.select(window).on("click", function () {
                                zoomPack(root);
                            });
                        }

                        function zoomPack(d, i) {
                            if (scope.mapType !== 'pack') {
                                return;
                            }

                            var k = r / d.r / 2;
                            x.domain([d.x - d.r, d.x + d.r]);
                            y.domain([d.y - d.r, d.y + d.r]);

                            var t = svg.transition()
                                .duration(duration);

                            t.selectAll("circle")
                                .attr("cx", function (d) {
                                    return x(d.x);
                                })
                                .attr("cy", function (d) {
                                    return y(d.y);
                                })
                                .attr("r", function (d) {
                                    return k * d.r;
                                })
                                .call(applyTooltip);

                            t.selectAll("text")
                                .attr("x", function (d) {
                                    return x(d.x);
                                })
                                .attr("y", function (d) {
                                    return y(d.y);
                                })
                                .style("opacity", function (d) {
                                    return k * d.r > 50 ? 1 : 0;
                                });

                            node = d;
                            d3.event.stopPropagation();
                        }

                        function updateStatus(sensor) {
                            var selectionString = "#sensor-name-" + sensor.name.replace(':', '_').replace('.', '_');

                            svg.selectAll(selectionString).attr("class", function (d) {
                                if (d.objValue) {
                                    for (var sensorAttr in sensor.objValue) {
                                        d.objValue[sensorAttr] = sensor.objValue[sensorAttr];
                                    }
                                    return statusClassFromNumber(d.objValue.status) + '-child';
                                } else if (d.sensorValue) {
                                    for (var sensorValAttr in sensor.sensorValue) {
                                        d.sensorValue[sensorValAttr] = sensor.sensorValue[sensorValAttr];
                                    }
                                    return statusClassFromNumber(d.sensorValue.status) + '-child';
                                }

                            });
                        }

                        function displayPartition() {
                            var g = svg.selectAll("g")
                                .data(mapLayout.nodes(root))
                                .enter().append("svg:g")
                                .attr("transform", function (d) {
                                    return "translate(" + x(d.y) + "," + y(d.x) + ")";
                                })
                                .attr("id", createId)
                                .on("click", click);

                            var kx = (width) / root.dx,
                                ky = height / 1;

                            g.append("svg:rect")
                                .attr("width", function (d) {
                                    return root.dy * kx;
                                })
                                .attr("height", function (d) {
                                    return d.dx * ky;
                                })
                                .attr("class", function (d) {
                                    return d.children ? "part-parent" : "child";
                                })
                                .call(applyTooltip);

                            g.append("svg:text")
                                .attr("transform", transform)
                                .attr("dy", ".35em")
                                .style("opacity", function (d) {
                                    return d.dx * ky > 12 ? 1 : 0;
                                })
                                .attr("class", function (d) {
                                    if (d.objValue) {
                                        return statusClassFromNumber(d.objValue.status) + '-child-text partition-text';
                                    } else if (d.sensorValue) {
                                        return statusClassFromNumber(d.sensorValue.status) + '-child-text parent';
                                    }
                                })
                                .text(trimmedName);

                            g.attr("class", function (d) {
                                if (d.objValue) {
                                    return statusClassFromNumber(d.objValue.status) + '-child child';
                                } else if (d.sensorValue) {
                                    return statusClassFromNumber(d.sensorValue.status) + '-child child';
                                }
                            });

                            //d3.select(window)
                            //    .on("click", function () {
                            //        click(root);
                            //    });

                            function click(d) {
                                if (!d.children) {
                                    return;
                                }

                                kx = (d.y ? width - 40 : width) / (1 - d.y);
                                ky = height / d.dx;
                                x.domain([d.y, 1]).range([d.y ? 40 : 0, width]);
                                y.domain([d.x, d.x + d.dx]);

                                var t = g.transition()
                                    .duration(duration)
                                    .attr("transform", function (d) {
                                        return "translate(" + x(d.y) + "," + y(d.x) + ")";
                                    });

                                t.select("rect")
                                    .attr("width", d.dy * kx)
                                    .attr("height", function (d) {
                                        return d.dx * ky;
                                    })
                                    .call(applyTooltip);

                                t.select("text")
                                    .attr("transform", transform)
                                    .style("opacity", function (d) {
                                        return d.dx * ky > 12 ? 1 : 0;
                                    });

                                d3.event.stopPropagation();
                            }

                            function transform(d) {
                                return "translate(8," + d.dx * ky / 2 + ")";
                            }
                        }

                        function displayIcicle() {

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
                                .attr("id", createId)
                                .attr("class", function (d) {
                                    if (d.objValue) {
                                        return statusClassFromNumber(d.objValue.status) + '-child child';
                                    } else if (d.sensorValue) {
                                        return statusClassFromNumber(d.sensorValue.status) + '-child child';
                                    }
                                })
                                .call(applyTooltip)
                                .on("click", icicleClicked);

                            var kx = width / root.dx;

                            var t = svg.selectAll("g")
                                .data(mapLayout.nodes(root)).enter()
                                .append("svg:text")
                                .attr("x", function (d) {
                                    return x(d.x) - 23;
                                })
                                .attr("y", function (d) {
                                    return y(d.y);
                                })
                                .attr("dy", ".2em")
                                .style("opacity", function (d) {
                                    return x(d.x + d.dx) - x(d.x) > 14.5 ? 1 : 0;
                                })
                                .text(trimmedName)
                                .attr("class", function (d) {
                                    if (d.objValue) {
                                        return statusClassFromNumber(d.objValue.status) + '-child-text partition-text';
                                    } else if (d.sensorValue) {
                                        return statusClassFromNumber(d.sensorValue.status) + '-child-text parent';
                                    }
                                })
                                .attr("text-anchor", "start")
                                .attr("transform", function (d) {
                                    var halfWidth = (x(d.x + d.dx) - x(d.x)) / 2,
                                        halfHeight = (y(d.y + d.dy) - y(d.y)) / 2;

                                    var strTranslate = "translate(" + halfWidth + "," + halfHeight + ")";
                                    if (halfWidth < 60) {
                                        strTranslate += "rotate(90, " + x(d.x) + ", " + y(d.y) + ")";
                                        strTranslate += "translate(-60,0)";
                                    }
                                    return strTranslate;
                                });

                            function icicleClicked(d) {
                                x.domain([d.x, d.x + d.dx]);
                                y.domain([d.y, 1]).range([d.y ? 20 : 0, height]);

                                g.transition()
                                    .duration(duration)
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
                                    .duration(duration)
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
                                        if (halfWidth < 60) {
                                            strTranslate += "rotate(90, " + x(d.x) + ", " + y(d.y) + ")";
                                        }
                                        return strTranslate;
                                    });
                                d3.event.stopPropagation();
                            }
                        }

                        function createId(d) {
                            if (d.sensor) {
                                return "sensor-name-" + d.name.replace(':', '_') + "_" + d.sensor.replace('.', '_');
                            } else {
                                return "sensor-name-" + d.name.replace(':', '_');
                            }
                        }

                        function displaySunburst(data) {
                            var arc = d3.svg.arc()
                                .startAngle(function (d) {
                                    return Math.max(0, Math.min(2 * Math.PI, x(d.x)));
                                })
                                .endAngle(function (d) {
                                    return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx)));
                                })
                                .innerRadius(function (d) {
                                    return Math.max(0, y(d.y));
                                })
                                .outerRadius(function (d) {
                                    return Math.max(0, y(d.y + d.dy));
                                });

                            var g = svg.selectAll("g")
                                .data(mapLayout.nodes(data))
                                .enter().append("g");

                            var path = g.append("path")
                                .attr("d", arc)
                                //.style("fill", function (d) {
                                //    return (d.children ? "#259b24" : "transparent");
                                //})
                                .attr("id", createId)
                                .attr("class", function (d) {
                                    if (d.objValue) {
                                        return statusClassFromNumber(d.objValue.status) + '-child child';
                                    } else if (d.sensorValue) {
                                        return statusClassFromNumber(d.sensorValue.status) + '-child child';
                                    }
                                })
                                .call(applyTooltip)
                                .on("click", click);

                            var text = g.append("text")
                                .attr("transform", function (d) {
                                    if (d.depth > 0) {
                                        return "rotate(" + computeTextRotation(d) + ")";
                                    } else {
                                        return "translate(-30,3)";
                                    }
                                })
                                .attr("x", function (d) {
                                    return y(d.y);
                                })
                                .attr("dx", "4") // margin
                                .attr("dy", ".35em") // vertical-align
                                .attr("class", function (d) {
                                    if (d.objValue) {
                                        return statusClassFromNumber(d.objValue.status) + '-child-text partition-text';
                                    }  else if (d.sensorValue) {
                                        return statusClassFromNumber(d.sensorValue.status) + '-child-text parent';
                                    }
                                })
                                .text(trimmedName);

                            function click(d) {
                                // fade out all text elements
                                text.transition().attr("opacity", 0);

                                path.transition()
                                    .duration(750)
                                    .attrTween("d", arcTween(d))
                                    .each("end", function (e, i) {
                                        // check if the animated element's data e lies within the visible angle span given in d
                                        if (e.x >= d.x && e.x < (d.x + d.dx)) {
                                            // get a selection of the associated text element
                                            var arcText = d3.select(this.parentNode).select("text");
                                            // fade in the text element and recalculate positions
                                            arcText.transition().duration(250)
                                                .attr("opacity", 1)
                                                .attr("transform", function () {
                                                    return "rotate(" + computeTextRotation(e) + ")";
                                                })
                                                .attr("x", function (d) {
                                                    return y(d.y);
                                                });
                                        }
                                    });
                            }

                            function arcTween(d) {
                                var xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
                                    yd = d3.interpolate(y.domain(), [d.y, 1]),
                                    yr = d3.interpolate(y.range(), [d.y ? 20 : 0, radius]);
                                return function (d, i) {
                                    return i ? function (t) {
                                        return arc(d);
                                    }
                                        : function (t) {
                                        x.domain(xd(t));
                                        y.domain(yd(t)).range(yr(t));
                                        return arc(d);
                                    };
                                };
                            }

                            function computeTextRotation(d) {
                                return (x(d.x + d.dx / 2) - Math.PI / 2) / Math.PI * 180;
                            }
                        }
                    }

                });
            }
        };
    });
