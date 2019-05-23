angular.module('katGui.d3')

    .directive('receptorPointingHorizontal', function ($timeout) {
        return {
            restrict: 'EA',
            scope: {
                redrawFunction: '='
            },
            link: function (scope, element) {

                //precisionMultiplicative
                var pm = 100;
                //handle resizing
                var unbindResize = scope.$watch(function () {
                    return element[0].clientHeight + ', ' + element[0].clientWidth;
                }, function (newVal, oldVal) {
                    if (newVal !== oldVal && !scope.drawingSvg) {
                        //allow for some time for the dom elements to complete resizing
                        $timeout(function () {
                            drawSvg();
                            drawValues();
                        }, 750);
                    }
                });

                var color = d3.scale.category20();
                //create a mouseover tooltip element
                var tooltip = d3.select(element[0]).append("div")
                    .attr("class", "receptor-pointing-tooltip")
                    .style("opacity", 0);
                var horizonMaskDsv = d3.dsv(" ", "text/plain");

                var margin = {top: 10, right: 20, bottom: 60, left: 60},
                    width, height, chart, focus;
                var svg, x, y, xAxis, yAxis, xAxisElement, yAxisElement;

                scope.skyPlotData = [];
                scope.receptorData = [];
                scope.elevationLimit = 0;

                scope.redrawFunction = function (receptors, skyPlot, showNames, showTrails,
                                                 showGridLines, trailDots, horizonMaskToggled,
                                                 elevationLimit) {
                    scope.trailDots = trailDots;
                    scope.showTrails = showTrails;
                    scope.receptorData = [];
                    scope.skyPlotData = skyPlot;

                    //parse the horizon mask data and sort it
                    var newHorizonData = false;
                    Object.keys(receptors).forEach(function (receptorName) {
                        var receptor = receptors[receptorName];
                        if (receptor.horizonMask && !receptor.horizonMaskData) {
                            receptor.horizonMaskData = [];
                            horizonMaskDsv.parse(receptor.horizonMask, function (d) {
                                receptor.horizonMaskData.push([parseFloat(d.az), parseFloat(d.el)]);
                            });
                            receptor.horizonMaskData = _.sortBy(receptor.horizonMaskData, function (d) {
                                return d[0];
                            });
                            newHorizonData = true;
                        }
                        scope.receptorData.push(receptor);
                    });

                    if (!svg || scope.showGridLines !== showGridLines || newHorizonData ||
                            horizonMaskToggled || scope.showNames !== showNames
                          || scope.elevationLimit != elevationLimit) {
                        scope.showGridLines = showGridLines;
                        scope.showNames = showNames;
                        scope.elevationLimit = elevationLimit;
                        drawSvg();
                    }

                    drawValues();
                };

                function drawSvg() {

                    scope.redrawSkyPlot = true;
                    scope.drawingSvg = true;

                    width = element[0].clientWidth - margin.left - margin.right;
                    height = element[0].clientHeight - margin.top - margin.bottom - 10;

                    if (height < 0) {
                        height = 0;
                    }

                    //remove because we are redrawing the entire svg
                    if (svg) {
                        svg.remove();
                    }
                    svg = d3.select(element[0]).append("svg")
                        .attr("width", width + margin.left + margin.right)
                        .attr("height", height + margin.top + margin.bottom);

                    chart = svg.append("g")
                        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                    // set the ranges
                    x = d3.scale.linear().range([0, width]);
                    y = d3.scale.linear().range([height, 0]);

                    // define the axes
                    xAxis = d3.svg.axis().scale(x).orient("bottom").ticks(10);
                    yAxis = d3.svg.axis().scale(y).orient("left").ticks(10);

                    if (scope.showGridLines) {
                        xAxis.tickSize(-height);
                        yAxis.tickSize(-width);
                    }

                    xAxisElement = chart.append("g")
                        .attr("class", "x axis")
                        .attr("transform", "translate(0," + height + ")");

                    yAxisElement = chart.append("g")
                        .attr("class", "y axis y-axis");

                    x.domain([-190, 190]);
                    y.domain([scope.elevationLimit-5, 100]);

                    //create the axis
                    xAxisElement.call(xAxis);
                    yAxisElement.call(yAxis);

                    focus = svg.append("g")
                        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                    //define the line for horizon masks
                    var line = d3.svg.line()
                        .interpolate("cubic")
                        .x(function (d) {
                            return x(d[0]);
                        })
                        .y(function (d) {
                            return y(d[1]);
                        });

                    //draw the horizon masks
                    chart.selectAll(".horizon-mask")
                        .data(scope.receptorData)
                        .enter().append("path")
                        .attr("class", function (d) {
                            return d.name + "-horizon-mask horizon-mask " + d.name + "_actual";
                        })
                        .style("fill", "transparent")
                        .style("stroke-width", "2px")
                        .style("stroke-dasharray", "10, 5")
                        .attr("d", function (d) {
                            if (d.horizonMaskData && d.showHorizonMask) {
                                return line(d.horizonMaskData);
                            } else {
                                return null;
                            }
                        });

                    scope.drawingSvg = false;
                }

                function drawValues() {

                    svg.selectAll(".name-pos-text").remove();
                    if (!scope.showTrails) {
                        svg.selectAll(".receptor-circle").remove();
                        svg.selectAll("g.requested-pos").remove();
                    } else {
                        svg.selectAll("g.requested-pos").remove();
                    }
                    scope.positions = {};
                    scope.positions_requested = {};

                    var dataToDraw = [];
                    scope.receptorData.forEach(function (receptor) {
                        dataToDraw.push(receptor);
                    });
                    if (scope.redrawSkyPlot) {
                        scope.skyPlotData.forEach(function (skyPlot) {
                            skyPlot.skyPlot = true;
                            dataToDraw.push(skyPlot);
                        });
                        scope.redrawSkyPlot = false;
                    }

                    //calculate and save the projection data to display points in the same position as bigger circles
                    //and to group tooltip values for points in the same position
                    dataToDraw.forEach(function (d) {
                        if (d.pos_actual_pointm_azim && d.pos_actual_pointm_elev) {
                            d.proj_requested_az_x = Math.floor(x(d.pos_actual_pointm_azim.value) * pm) / pm;
                            d.proj_requested_el_y = Math.floor(y(d.pos_actual_pointm_elev.value) * pm) / pm;
                            d.proj_actual = round(d.proj_requested_az_x, 5) + ',' + round(d.proj_requested_el_y, 5);
                            if (!scope.positions[d.proj_actual]) {
                                scope.positions[d.proj_actual] = [];
                            }
                            scope.positions[d.proj_actual].push(d);
                        }

                        if (d.pos_request_pointm_azim && d.pos_request_pointm_elev) {
                            d.proj_requested = Math.floor(x(d.pos_request_pointm_azim.value)) + ',' + Math.floor(y(d.pos_request_pointm_elev.value));
                            if (!scope.positions_requested[d.proj_requested]) {
                                scope.positions_requested[d.proj_requested] = [];
                            }
                            scope.positions_requested[d.proj_requested].push(d);
                        }
                        d.tooltipHtml = null;
                    });

                    //compute tooltip values for points in the same position
                    dataToDraw.forEach(function (d) {
                        if (!d.tooltipHtml) {
                            var items = scope.positions[d.proj_actual];
                            d.tooltipHtml = "<div>";
                            for (var i in items) {

                                d.tooltipHtml += "<b>" + items[i].name + " </b>";
                                if (items[i].pos_actual_pointm_azim && items[i].pos_actual_pointm_elev) {
                                    d.tooltipHtml += "<br/>az: " + Math.round(items[i].pos_actual_pointm_azim.value * pm) / pm + ", el: " + Math.round(items[i].pos_actual_pointm_elev.value * pm) / pm;
                                }
                                if (items[i].pos_request_pointm_azim && items[i].pos_request_pointm_elev) {
                                    d.tooltipHtml += "<br/>az: " + Math.round(items[i].pos_request_pointm_azim.value * pm) / pm + ", el: " + Math.round(items[i].pos_request_pointm_elev.value * pm) / pm + " (requested)";
                                }
                                if (items[i].pos_request_base_ra && items[i].pos_request_base_dec) {
                                    d.tooltipHtml += "<br/>ra: " + Math.round(items[i].pos_request_base_ra.value * pm) / pm + ", dec: " + Math.round(items[i].pos_request_base_dec.value * pm) / pm + " (requested)";
                                }
                                if (items[i].pos_delta_sky) {
                                    d.tooltipHtml += "<br/>Delta sky: " + Math.round(items[i].pos_delta_sky.value * pm) / pm;
                                }
                                if (items[i].pos_delta_azim && items[i].pos_delta_elev) {
                                    d.tooltipHtml += "<br/>Delta azim: " + Math.round(items[i].pos_delta_azim.value * pm) / pm + ", Delta elev: " + Math.round(items[i].pos_delta_elev.value * pm) / pm;
                                }
                                if (items[i].target) {
                                    d.tooltipHtml += "<br/>Target: " + items[i].target.value;
                                }
                                d.tooltipHtml += "<br/>";
                            }
                            d.tooltipHtml += "</div>";
                        }
                    });


                    //draw a crosshair where the requested position is
                    focus.selectAll("g.requested-pos")
                        .data(dataToDraw)
                        .enter().append('g')
                        .attr("class", "requested-pos")
                        .attr("transform", function (d) {
                            if (d.proj_requested) {
                                return "translate(" + (x(d.pos_request_pointm_azim.value) - 8.3) + "," + (y(d.pos_request_pointm_elev.value) + 6.7) + ")";
                            } else {
                                return 'translate(-100, -100)';
                            }
                        })
                        .append('text')
                        .attr('font-family', 'FontAwesome')
                        .attr('font-size', '19px')
                        .attr('stroke-width', '0.5px')
                        .on("mouseover", mouseOver)
                        .on("mouseout", mouseOut)
                        .text('\uf00d');

                    //draw a color circle where the actual position is
                    //and setup tooltip behaviour
                    focus.selectAll("g.actual-pos")
                        .data(dataToDraw)
                        .enter().append("circle")
                        .attr("class", function (d) {
                            var c = color(d.name + '_actual');
                            if (d.skyPlot) {
                                c = 'black';
                            } else if (d.subarrayColor) {
                                c = d.subarrayColor;
                            }
                            var style = document.getElementById(d.name + '_actual_style_tag');
                            if (style && style.parentNode) {
                                style.parentNode.removeChild(style);
                            }
                            style = document.createElement('style');
                            style.type = 'text/css';
                            style.id = d.name + '_actual_style_tag';
                            style.innerHTML = '.' + d.name + '_actual {color:' + c + '; stroke:' + c + '; fill:' + c + '}';
                            document.getElementsByTagName('head')[0].appendChild(style);

                            var classStr = "actual-pos " + d.name + "_actual";
                            if (d.proj_actual && scope.positions[d.proj_actual].length > 1) {
                                classStr += " actual-pos-border";
                            }
                            if (!d.skyPlot) {
                                classStr += " receptor-circle";
                            }
                            return classStr;
                        })
                        .attr("r", function (d) {
                            if (d.proj_actual) {
                                if (scope.positions[d.proj_actual].length > 1) {
                                    return 8;
                                } else {
                                    return 4;
                                }
                            } else {
                                return 0;
                            }
                        })
                        .attr("cx", function (d) {
                            if (d.pos_actual_pointm_azim) {
                                return x(d.pos_actual_pointm_azim.value);
                            } else {
                                return -1000;
                            }
                        })
                        .attr("cy", function (d) {
                            if (d.pos_actual_pointm_elev) {
                                return y(d.pos_actual_pointm_elev.value);
                            } else {
                                return -1000;
                            }
                        })
                        .on("mouseover", mouseOver)
                        .on("mouseout", mouseOut);

                    //reduce the radius of the trail circles
                    if (scope.showTrails) {
                        scope.receptorData.forEach(function (d) {
                            var itemsList = svg.selectAll("." + d.name + "_actual")[0];

                            for (var i = itemsList.length - 1; i >= 0; i--) {
                                if (i !== itemsList.length - 1 && itemsList.length - 1 - i >= scope.trailDots) {
                                    itemsList[i].remove();
                                } else if (i !== itemsList.length - 1) {
                                    angular.element(itemsList[i]).attr("r", 2);
                                }
                            }
                        });
                    }

                    //draw the names of the receptor name
                    if (scope.showNames) {
                        focus.selectAll("g.name-pos-text")
                            .data(dataToDraw)
                            .enter().append("g")
                            .attr("class", function (d) {
                                if (d.skyPlot) {
                                    return "";
                                }
                                return "name-pos-text";
                            })
                            .append("text")
                            .attr("transform", function (d) {
                                if (d.proj_actual) {
                                    var proj = d.proj_actual.split(',');
                                    proj[0] = parseInt(proj[0]);
                                    proj[1] = parseInt(proj[1]);
                                    var i;
                                    for (i = 0; i < scope.positions[d.proj_actual].length; i++) {
                                        if (scope.positions[d.proj_actual][i].name === d.name) {
                                            break;
                                        }
                                    }
                                    proj[0] += 8;
                                    proj[1] += 12 * i;
                                    return "translate(" + proj + ")";
                                } else {
                                    return 'translate(-100, -100)';
                                }
                            })
                            .text(function (d) {
                                return d.name;
                            });
                    }

                    function mouseOver(d) {
                        var mouse = d3.mouse(element[0]);
                        var elementBR = element[0].getBoundingClientRect();
                        tooltip.html(d.tooltipHtml);
                        var tooltipWidth = tooltip[0][0].offsetWidth;
                        var tooltipHeight = tooltip[0][0].offsetHeight;

                        var x = mouse[0];
                        var y = mouse[1];
                        if (y + tooltipHeight > elementBR.bottom) {
                            y = elementBR.bottom - tooltipHeight - 80;
                        } else if (y < elementBR.top) {
                            y = elementBR.top + 80;
                        }

                        if (x + tooltipWidth > elementBR.right) {
                            x = elementBR.right - tooltipWidth - 80;
                        } else if (x < elementBR.left) {
                            x = elementBR.left + 80;
                        }

                        tooltip
                            .style("top", y + "px")
                            .style("left", x + "px");
                        tooltip.style("opacity", 0.9);
                    }

                    function mouseOut(d) {
                        tooltip.style("opacity", 0);
                    }

                    function round(i, v) {
                        return Math.round(i / v) * v;
                    }
                }

                scope.$on('$destroy', function () {
                    unbindResize();
                });
            }
        };
    });
