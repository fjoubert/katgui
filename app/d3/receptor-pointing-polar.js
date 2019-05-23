angular.module('katGui.d3')

    .directive('receptorPointingPolar', function ($timeout) {
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
                    if (newVal !== oldVal) {
                        //allow for some time for the dom elements to complete resizing
                        $timeout(function () {
                            drawSvg();
                            drawValues();
                        }, 750);
                    }
                });

                var svg, x, y, path;
                var color = d3.scale.category20();
                scope.showGridLines = true;
                var horizonMaskDsv = d3.dsv(" ", "text/plain");
                scope.skyPlotData = [];
                scope.receptorData = [];
                scope.elevationLimit = 0;

                scope.redrawFunction = function (receptors, skyPlot, showNames, showTrails,
                                                 showGridLines, trailDots, horizonMaskToggled,
                                                 elevationLimit) {

                    scope.showTrails = showTrails;
                    scope.trailDots = trailDots;
                    scope.skyPlotData = skyPlot;
                    scope.receptorData = [];

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

                    if (!svg ||
                        scope.showGridLines !== showGridLines ||
                        newHorizonData ||
                        horizonMaskToggled ||
                        scope.showNames !== showNames||
                        (scope.elevationLimit != elevationLimit)) {
                        scope.elevationLimit = elevationLimit;
                        scope.showGridLines = showGridLines;
                        scope.showNames = showNames;
                        drawSvg();
                    }

                    drawValues();
                };

                //create a mouseover tooltip element
                var tooltip = d3.select(element[0]).append("div")
                    .attr("class", "receptor-pointing-tooltip")
                    .style("opacity", 0);

                var margin = {top: 10, right: 20, bottom: 10, left: 10},
                    width, height, projection, ticksAzimuth, scale;

                drawSvg();

                function drawSvg() {

                    scope.redrawSkyPlot = true;
                    //remove because we are redrawing the entire svg
                    if (svg) {
                        svg.remove();
                    }

                    width = element[0].clientWidth - margin.left - margin.right;
                    height = element[0].clientHeight - margin.top - margin.bottom - 5;
                    scale = height * 0.45;

                    if (height < 0) {
                        height = 0;
                    }

                    // 90deg projection
                    var x2 = flippedStereographic(0, Math.PI/2);
                    var x1 = flippedStereographic(0, Math.PI * (90 - scope.elevationLimit)/180);
                    var scaleFactor = x2[1]/x1[1];

                    //setup d3 projection for stereographic display
                    projection = d3.geo.projection(flippedStereographic)
                        .clipAngle(90-scope.elevationLimit)
                        .scale(scale * scaleFactor)
                        .rotate([0, -90])
                        .translate([width / 2 + 0.5, height / 2 + 0.5])
                        .precision(0.01);

                    path = d3.geo.path()
                        .projection(projection);

                    //add the svg canvas
                    svg = d3.select(element[0]).append("svg")
                        .attr("width", width + margin.left + margin.right)
                        .attr("height", height + margin.top + margin.bottom);

                    svg.append("defs").append("clipPath")
                        .attr("id", "clip")
                        .append("path")
                        .datum(d3.geo.circle().origin([0, 90]).angle(90))
                        .attr("d", path);

                    //draw the horizon circle
                    svg.append("path")
                        .datum(d3.geo.circle().origin([0, 90]).angle(90))
                        .attr("class", "horizon")
                        .attr("d", path);

                    //draw all of the horizon masks that are selected to be shown
                    svg.selectAll("path.horizon-mask")
                        .data(scope.receptorData)
                        .enter().append("path")
                        .attr("class", function (d) {
                            return "horizon-mask " + d.name + "_actual";
                        })
                        .style("fill", "transparent")
                        .style("stroke-width", "2px")
                        .style("stroke-dasharray", "10, 5")
                        .attr("d", function (d) {
                            if (d.horizonMaskData && d.showHorizonMask) {
                                return path({type: 'LineString', coordinates: d.horizonMaskData});
                            } else {
                                return null;
                            }
                        });

                    //draw the graticule (grid lines)
                    if (scope.showGridLines) {
                        svg.append("path")
                            .datum(d3.geo.graticule())
                            .attr("class", "graticule")
                            .attr("d", path)
                            .attr("clip-path", "url(#clip)");
                    }

                    ticksAzimuth = svg.append("g")
                        .attr("class", "ticks ticks--azimuth");

                    //draw the azimuth tick lines
                    ticksAzimuth.selectAll("line")
                        .data(d3.range(360))
                        .enter().append("line")
                        .each(function (d) {
                            var p0 = projection([d, scope.elevationLimit]),
                                p1 = projection([d, scope.elevationLimit + (d % 10 ? -1 : -2)]);

                            d3.select(this)
                                .style('opacity', 0.5)
                                .attr("x1", p0[0])
                                .attr("y1", p0[1])
                                .attr("x2", p1[0])
                                .attr("y2", p1[1]);
                        });

                    //draw the azimuth tick values
                    ticksAzimuth.selectAll("text")
                        .data(d3.range(0, 360, 10))
                        .enter().append("text")
                        .each(function (d) {
                            var p = projection([d, scope.elevationLimit-4]);
                            d3.select(this)
                                .attr("x", p[0])
                                .attr("y", p[1]);
                        })
                        .attr("dy", ".35em")
                        .text(function (d) {
                            return d === 0 ? "N" : d === 90 ? "E" : d === 180 ? "S" : d === 270 ? "W" : d + "°";
                        });

                    //draw the elevation circle text
                    svg.append("g")
                        .attr("class", "ticks ticks--elevation")
                        .selectAll("text")
                        .data(d3.range(10, 91, 10))
                        .enter().append("text")
                        .each(function (d) {
                            var p = projection([0, d]);

                            d3.select(this)
                                .attr("x", p[0])
                                .attr("y", p[1]);
                        })
                        .attr("dy", ".35em")
                        .style('fill', function(d) {
                          if (scope.elevationLimit == d)
                            return '#3D5AFE';
                        })
                        .style('font-weight', function(d) {
                          if (scope.elevationLimit == d)
                            return 'bold';
                        })
                        .style('font-size', function(d) {
                          if (scope.elevationLimit == d)
                            return '16px';
                        })
                        .text(function (d) {
                            return d + "°";
                        });
                }

                function drawValues() {

                    //remove old positions before drawing new positions
                    svg.selectAll(".name-pos-text").remove();
                    if (!scope.showTrails) {
                        svg.selectAll(".receptor-circle").remove();
                        svg.selectAll("g.requested-pos").remove();
                    } else {
                        svg.selectAll("g.requested-pos").remove();
                    }

                    //calculate and save the projection data to display points in the same position as bigger circles
                    //and to group tooltip values for points in the same position
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

                    dataToDraw.forEach(function (d) {
                        if (d.pos_actual_pointm_azim && d.pos_actual_pointm_elev) {
                            var proj_actual = projection([d.pos_actual_pointm_azim.value, d.pos_actual_pointm_elev.value]);
                            d.proj_actual_az_x = Math.floor(proj_actual[0] * pm) / pm;
                            d.proj_actual_el_y = Math.floor(proj_actual[1] * pm) / pm;

                            // round to 0.5 deg az and el for grouping purposes
                            var group_azel = [round(d.pos_actual_pointm_azim.value, 5),
                                                round(d.pos_actual_pointm_elev.value, 5)];
                            var group_xy = projection(group_azel);
                            d.proj_actual = Math.round(group_xy[0]) + ',' + Math.round(group_xy[1]);

                            if (!scope.positions[d.proj_actual]) {
                                scope.positions[d.proj_actual] = [];
                            }
                            scope.positions[d.proj_actual].push(d);
                        }
                        if (d.pos_request_pointm_azim && d.pos_request_pointm_elev) {
                            var proj_requested = projection([d.pos_request_pointm_azim.value, d.pos_request_pointm_elev.value]);
                            d.proj_requested_az_x = Math.floor(proj_requested[0] * pm) / pm;
                            d.proj_requested_el_y = Math.floor(proj_requested[1] * pm) / pm;
                            d.proj_requested = d.proj_requested_az_x + ',' + d.proj_requested_el_y;

                            // // TODO: Requested positions are not grouped. We should
                            // // check with operators if they would like to group requested
                            // // positions as well. Then implement as actual position grouping.
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
                            }
                            d.tooltipHtml += "</div>";
                        }
                    });

                    //draw the names of the receptor name
                    if (scope.showNames) {
                        svg.selectAll("g.name-pos-text")
                            .data(Object.keys(scope.positions))
                            .enter().append("g")
                            .attr("class", function (d) {
                                if (d.skyPlot) {
                                    return "";
                                }
                                return "name-pos-text";
                            })
                            .append("foreignObject")
                            .attr("transform", function (d) {
                                    var proj = d.split(',');
                                    proj[0] = parseInt(proj[0]) - 12;
                                    proj[1] = parseInt(proj[1]) + 4;
                                    return "translate(" + proj + ")\n";
                            })
                            .append('xhtml:div')
                            .html(function(d){
                                var val = scope.positions[d];
                                var names = val.map(function(a) {return a.name;} );
                                var combinedNames = [];
                                var list = [];

                                for (var i = 0; i < names.length; i++) {
                                    var name = names[i];
                                    if (list.length == 0)
                                        list.push(name);
                                    else {
                                        var last = list[list.length - 1];
                                        var x = Number(last.substr(1));
                                        var y = Number(name.substr(1));
                                        if (y-x>1) {
                                            combinedNames.push(list);
                                            list = [name];
                                        } else
                                            list.push(name);
                                    }
                                }
                                combinedNames.push(list);
                                var result = '';
                                for (i = 0; i < combinedNames.length; i++) {
                                    list = combinedNames[i];
                                    if (list.length == 1) {
                                        result += list[0] + ', ';
                                    } else if (list.length == 2) {
                                        result += list[0] + ', ' + list[1] + ', ';
                                    } else
                                        result += '[' + list[0] + '-' + list[list.length -1] + '], ';

                                }
                                return result.slice(0, -2);
                            });

                    }

                    //draw a crosshair where the requested position is
                    svg.selectAll("g.requested-pos")
                        .data(dataToDraw)
                        .enter().append('g')
                        .attr("class", "requested-pos")
                        .attr("transform", function (d) {
                            if (d.proj_requested) {
                                return "translate(" + (d.proj_requested_az_x - 8.3) + "," + (d.proj_requested_el_y + 6.7) + ")";
                            } else {
                                return 'translate(-100, -100)';
                            }
                        })
                        .append('text')
                        .attr('font-family', 'FontAwesome')
                        .attr('font-size', '19px')
                        .attr('stroke-width', '0.5px')
                        .attr('opacity', 0.5)
                        .attr('fill', 'black')
                        .text('\uf00d')
                        .on("mouseover", mouseOver)
                        .on("mouseout", mouseOut);

                    //draw a color circle where the actual position is
                    //and setup tooltip behaviour
                    svg.selectAll("g.actual-pos")
                        .data(Object.keys(scope.positions))
                        .enter().append("circle")
                        .attr("class", function (d) {
                            for (var i=0; i<scope.positions[d].length; i++) {
                                var name = scope.positions[d][i].name;
                                var c = scope.positions[d][i].subarrayColor;

                                var style = document.getElementById(name + '_actual_style_tag');
                                if (style && style.parentNode) {
                                    style.parentNode.removeChild(style);
                                }
                                style = document.createElement('style');
                                style.type = 'text/css';
                                style.id = name + '_actual_style_tag';
                                style.innerHTML = '.' + name + '_actual {color:' + c + '; stroke:' + c + '; fill:' + c + '}';
                                document.getElementsByTagName('head')[0].appendChild(style);
                            }
                            var classStr = "actual-pos " + name + "_actual";
                            if (scope.positions[d].length > 1) {
                                classStr += " actual-pos-border";
                            };
                            classStr += " receptor-circle";
                            return classStr;
                        })
                        .style("opacity", function(d) {
                            if (scope.positions[d].length > 1) {
                                return 0.7;
                            } else {
                                return 1;
                            }
                        })
                        .attr("transform", function (d) {
                            if (scope.positions[d].length > 1)
                                return "translate(" + d + ")";
                            else
                                return "translate(" + scope.positions[d][0].proj_actual_az_x
                                        + ',' + scope.positions[d][0].proj_actual_el_y + ")";
                        })
                        .attr("r", function (d) {
                            //for points in the same position, draw overlapping big circles
                                if (scope.positions[d].length > 1) {
                                    return 10;
                                } else {
                                    return 4;
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
                                    angular.element(itemsList[i]).attr("r", 1);
                                }
                            }
                        });
                    }
                }

                function flippedStereographic(λ, φ) {
                    var cosλ = Math.cos(λ),
                        cosφ = Math.cos(φ),
                        k = 1 / (1 + cosλ * cosφ);
                    return [
                        k * cosφ * Math.sin(λ),
                        -k * Math.sin(φ)
                    ];
                }

                function mouseOver(d) {
                    var mouse = d3.mouse(element[0]);
                    var elementBR = element[0].getBoundingClientRect();
                    var names = scope.positions[d];
                    tooltipHtml = "<div>";
                    for (var i in names) {
                        name = names[i].name;
                        tooltipHtml += "<b>" + name + " </b>";
                    }
                    tooltipHtml += "<div>";

                    tooltip.html(tooltipHtml);
                    var tooltipWidth = tooltip[0][0].offsetWidth;
                    var tooltipHeight = tooltip[0][0].offsetHeight;

                    var x = mouse[0];
                    var y = mouse[1];
                    if (y + tooltipHeight > elementBR.bottom) {
                        y = elementBR.bottom - tooltipHeight - 80;
                    } else if (y < elementBR.top) {
                        y = elementBR.top + 80;
                    } else
                        y = y + 80;

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
                    tooltip
                        .style("opacity", 0);
                }

                function round(i, v) {
                    return Math.round(i / v) * v;
                }

                scope.$on('$destroy', function () {
                    unbindResize();
                });
            }
        };
    });
