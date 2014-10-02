//angular.module('katGui.d3', [])
//
//    .directive('d3WindRose', function ($window, d3Service) {
//        return{
//            restrict: 'EA',
//            scope: {
//                data: '='
//            },
//            replace: false,
//            link: function (scope, elem) {
//
//                d3Service.d3().then(function (d3) {
//
////                    var arcWidth = 2,
////                        arcInner = 34,
////                        months = [true, true, true, true, true, true, true, true, true, true, true, true],   // false -> deactive month
////                        speedMinColor = "moccasin",
////                        speedMaxColor = "green",
////                        speedInterpolate = d3.interpolateHcl,
////                        probMinColor = "lavender",
////                        probMaxColor = "darkslategray",
////                        probInterpolate = d3.interpolateHcl,
////                        textStyle = {
////                            "letter-spacing": "1px",
////                            fill: "#333",
////                            "font-size": "12px",
////                            "font-weight": "bold",
////                            "text-anchor": "middle"
////                        };
////
////                    var data = scope.data;
////                    var svg = d3.select(elem[0])
////                        .append("svg")
////                        .attr("width", 1500)
////                        .attr("height", 800);
////
////                    var big = svg.append("g")
////                        .attr("id", "windrose")
////                        .attr("transform", "translate(" + [35, 100] + ")");
////
////                    var avg = svg.append("g")
////                        .attr("id", "avg")
////                        .attr("transform", "translate(" + [464, 100] + ")");
////
////                    var arc = function (o) {
////                        return d3.svg.arc()
////                            .startAngle(function (d) {
////                                return (d.d - o.width) * Math.P
////                            })
////                            .endAngle(function (d) {
////                                return (d.d + o.width) * Math.PI / 180;
////                            })
////                            .innerRadius(o.from)
////                            .outerRadius(function (d) {
////                                return o.to(d);
////                            });
////                    };
////
////                    /** Code for data manipulation **/
////
////// Convert a dictionary of {direction: total} to frequencies
////// Output is an array of objects with three parameters:
//////   d: wind direction
//////   p: probability of the wind being in this direction
//////   s: average speed of the wind in this direction
////                    function totalsToFrequencies(totals, speeds) {
////                        var sum = 0;
////                        // Sum all the values in the dictionary
////                        for (var dic in totals) {
////                            sum += totals[dic];
////                        }
////                        if (sum === 0) {  // total hack to work around the case where no months are selected
////                            sum = 1;
////                        }
////
////                        // Build up an object containing frequencies
////                        var ret = {};
////                        ret.dirs = [];
////                        ret.sum = sum;
////                        for (var dir in totals) {
////                            var freq = totals[dir] / sum;
////                            var avgspeed;
////                            if (totals[dir] > 0) {
////                                avgspeed = speeds[dir] / totals[dir];
////                            } else {
////                                avgspeed = 0;
////                            }
////                            if (dir == "null") {   // winds calm is a special case
////                                ret.calm = { d: null, p: freq, s: null };
////                            } else {
////                                ret.dirs.push({ d: parseInt(dir), p: freq, s: avgspeed });
////                            }
////                        }
////                        return ret;
////                    }
////
////// Filter input data, giving back frequencies for the selected month
////                    function rollupForMonths(d, months) {
////                        var totals = {}, speeds = {};
////                        for (var i = 10; i < 361; i += 10) {
////                            totals["" + i] = 0;
////                            speeds["" + i] = 0;
////                        }
////                        totals["null"] = 0;
////                        speeds["null"] = 0;
////
////                        for (var key in d.data) {
////                            var s = key.split(":");
////                            var direction;
////                            var month;
////                            if (s.length === 1) {
////                                direction = s[0];
////                            } else {
////                                month = s[0];
////                                direction = s[1];
////                            }
////
////                            if (months && !months[month - 1]) {
////                                continue;
////                            }
////
////                            // count up all samples with this key
////                            totals[direction] += d.data[key][0];
////                            // add in the average speed * count from this key
////                            speeds[direction] += d.data[key][0] * d.data[key][1];
////                        }
////                        return totalsToFrequencies(totals, speeds);
////                    }
////
////                    /** Code for big visualization **/
////
////// Transformation to place a mark on top of an arc
////                    function probArcTextT(d) {
////                        var tr = probabilityToRadius(d);
////                        return "translate(" + visWidth + "," + (visWidth - tr) + ")" +
////                            "rotate(" + d.d + ",0," + tr + ")";
////                    }
////
////                    function speedArcTextT(d) {
////                        var tr = speedToRadius(d);
////                        return "translate(" + visWidth + "," + (visWidth - tr) + ")" +
////                            "rotate(" + d.d + ",0," + tr + ")";
////                    }
////
////// Return a string representing the wind speed for this datum
////                    function speedText(d) {
////                        return d.s < 10 ? "" : d.s.toFixed(0);
////                    }
////
////// Return a string representing the probability of wind coming from this direction
////                    function probabilityText(d) {
////                        return d.p < 0.02 ? "" : (100 * d.p).toFixed(0);
////                    }
////
////// Map a wind speed to a color
////                    var speedToColorScale = d3.scale.linear()
////                        .domain([5, 15])
////                        .range([speedMinColor, speedMaxColor])
////                        .interpolate(speedInterpolate);
////
////                    function speedToColor(d) {
////                        return speedToColorScale(d.s);
////                    }
////
////// Map a wind probability to a color
////                    var probabilityToColorScale = d3.scale.linear()
////                        .domain([0, 0.15])
////                        .range([probMinColor, probMaxColor])
////                        .interpolate(probInterpolate);
////
////                    function probabilityToColor(d) {
////                        return probabilityToColorScale(d.p);
////                    }
////
////// Width of the whole visualization; used for centering
////                    var visWidth = 200;
////
////// Map a wind probability to an outer radius for the chart
////                    var probabilityToRadiusScale = d3.scale.linear().domain([0, 0.15]).range([34, visWidth - 20]).clamp(true);
////
////                    function probabilityToRadius(d) {
////                        return probabilityToRadiusScale(d.p);
////                    }
////
////// Map a wind speed to an outer radius for the chart
////                    var speedToRadiusScale = d3.scale.linear().domain([0, 20]).range([34, visWidth - 20]).clamp(true);
////
////                    function speedToRadius(d) {
////                        return speedToRadiusScale(d.s);
////                    }
////
////// Options for drawing the complex arc chart
////                    var windroseArcOptions = {
////                        width: arcWidth,
////                        from: arcInner,
////                        to: probabilityToRadius
////                    };
////                    var windspeedArcOptions = {
////                        width: arcWidth,
////                        from: arcInner,
////                        to: speedToRadius
////                    };
////// Draw a complete wind rose visualization, including axes and center text
////                    function drawComplexArcs(parent, plotData, colorFunc, arcTextFunc, complexArcOptions, arcTextT) {
////                        // Draw the main wind rose arcs
////                        parent.append("svg:g")
////                            .attr("class", "arcs")
////                            .selectAll("path")
////                            .data(plotData.dirs)
////                            .enter().append("svg:path")
////                            .attr("d", arc(complexArcOptions))
////                            .style("fill", colorFunc)
////                            .attr("transform", "translate(" + visWidth + "," + visWidth + ")")
////                            .append("svg:title")
////                            .text(function (d) {
////                                return d.d + "\u00b0 " + (100 * d.p).toFixed(1) + "% " + d.s.toFixed(0) + "kts";
////                            });
////
////                        // Annotate the arcs with speed in text
////                        if (false) {    // disabled: just looks like chart junk
////                            parent.append("svg:g")
////                                .attr("class", "arctext")
////                                .selectAll("text")
////                                .data(plotData.dirs)
////                                .enter().append("svg:text")
////                                .text(arcTextFunc)
////                                .attr("dy", "-3px")
////                                .attr("transform", arcTextT);
////                        }
////
////                        // Add the calm wind probability in the center
////                        var cw = parent.append("svg:g").attr("class", "calmwind")
////                            .selectAll("text")
////                            .data([plotData.calm.p])
////                            .enter();
////                        cw.append("svg:text")
////                            .attr("transform", "translate(" + visWidth + "," + visWidth + ")")
////                            .text(function (d) {
////                                return Math.round(d * 100) + "%";
////                            });
////                        cw.append("svg:text")
////                            .attr("transform", "translate(" + visWidth + "," + (visWidth + 14) + ")")
////                            .attr("class", "calmcaption")
////                            .text("calm");
////                    }
////
////// Update the page text after the data has been loaded
////// Lots of template substitution here
////                    function updatePageText(d) {
////                        if (!('info' in d)) {
////                            // workaround for stations missing in the master list
////                            d3.selectAll(".stationid").text("????");
////                            d3.selectAll(".stationname").text("Unknown station");
////                            return;
////                        }
////                        document.title = "Wind History for " + d.info.id;
////                        d3.selectAll(".stationid").text(d.info.id);
////                        d3.selectAll(".stationname").text(d.info.name.toLowerCase());
////
////                        var mapurl = 'map.html#10.00/' + d.info.lat + "/" + d.info.lon;
////                        d3.select("#maplink").html('<a href="' + mapurl + '">' + d.info.lat + ', ' + d.info.lon + '</a>');
////                        d3.select("#whlink").attr("href", mapurl);
////
////                        var wsurl = 'http://weatherspark.com/#!dashboard;loc=' + d.info.lat + ',' + d.info.lon + ';t0=01/01;t1=12/31';
////                        d3.select("#wslink").attr("href", wsurl);
////
////                        var wuurl = 'http://www.wunderground.com/cgi-bin/findweather/getForecast?query=' + d.info.id;
////                        d3.select("#wulink").attr("href", wuurl);
////
////                        var vmurl = 'http://vfrmap.com/?type=vfrc&lat=' + d.info.lat + '&lon=' + d.info.lon + '&zoom=10';
////                        d3.select("#vmlink").attr("href", vmurl);
////
////                        var rfurl = 'http://runwayfinder.com/?loc=' + d.info.id;
////                        d3.select("#rflink").attr("href", rfurl);
////
////                        var nmurl = 'http://www.navmonster.com/apt/' + d.info.id;
////                        d3.select("#nmlink").attr("href", nmurl);
////                    }
////
////// Update all diagrams to the newly selected months
////                    function updateWindVisDiagrams(d) {
////                        updateBigWindrose(d, "#windrose");
////                        updateBigWindrose(d, "#windspeed");
////                    }
////
////// Update a specific digram to the newly selected months
////                    function updateBigWindrose(windroseData, container) {
////                        var vis = d3.select(container).select("svg");
////                        var rollup = rollupForMonths(windroseData, months);
////
////                        if (container === "#windrose") {
////                            updateComplexArcs(vis, rollup, speedToColor, speedText, windroseArcOptions, probArcTextT);
////                        } else {
////                            updateComplexArcs(vis, rollup, probabilityToColor, probabilityText, windspeedArcOptions, speedArcTextT);
////                        }
////                    }
////
////// Update drawn arcs, etc to the newly selected months
////                    function updateComplexArcs(parent, plotData, colorFunc, arcTextFunc, complexArcOptions, arcTextT) {
////                        // Update the arcs' shape and color
////                        parent.select("g.arcs").selectAll("path")
////                            .data(plotData.dirs)
////                            .transition().duration(200)
////                            .style("fill", colorFunc)
////                            .attr("d", arc(complexArcOptions));
////
////                        // Update the arcs' title tooltip
////                        parent.select("g.arcs").selectAll("path").select("title")
////                            .text(function (d) {
////                                return d.d + "\u00b0 " + (100 * d.p).toFixed(1) + "% " + d.s.toFixed(0) + "kts";
////                            });
////
////                        // Update the calm wind probability in the center
////                        parent.select("g.calmwind").select("text")
////                            .data([plotData.calm.p])
////                            .text(function (d) {
////                                return Math.round(d * 100) + "%";
////                            });
////                    }
////
////// Top level function to draw all station diagrams
////                    function makeWindVis(station) {
////                        var url = "data/" + station + ".json";
////                        var stationData = null;
////                        d3.json(url, function (d) {
////                            stationData = d;
////                            updatePageText(d);
////                            drawBigWindrose(d, "#windrose", "Frequency by Direction");
////                            drawBigWindrose(d, "#windspeed", "Average Speed by Direction");
////                        });
////                    }
////
////// Draw a big wind rose, for the visualization
////                    function drawBigWindrose(windroseData, container, captionText) {
////                        // Various visualization size parameters
////                        var w = 400,
////                            h = 400,
////                            r = Math.min(w, h) / 2,      // center; probably broken if not square
////                            p = 20,                      // padding on outside of major elements
////                            ip = 34;                     // padding on inner circle
////
////                        // The main SVG visualization element
////                        var vis = d3.select(container)
////                            .append("svg:svg")
////                            .attr("width", w + "px").attr("height", (h + 30) + "px");
////
////                        var ticks;
////                        var tickmarks;
////                        var radiusFunction;
////                        var tickLabel;
////
////                        // Set up axes: circles whose radius represents probability or speed
////                        if (container === "#windrose") {
////                            ticks = d3.range(0.025, 0.151, 0.025);
////                            tickmarks = d3.range(0.05, 0.101, 0.05);
////                            radiusFunction = probabilityToRadiusScale;
////                            tickLabel = function (d) {
////                                return "" + (d * 100).toFixed(0) + "%";
////                            };
////                        } else {
////                            ticks = d3.range(5, 20.1, 5);
////                            tickmarks = d3.range(5, 15.1, 5);
////                            radiusFunction = speedToRadiusScale;
////                            tickLabel = function (d) {
////                                return "" + d + "kts";
////                            };
////                        }
////
////                        // Circles representing chart ticks
////                        vis.append("svg:g")
////                            .attr("class", "axes")
////                            .selectAll("circle")
////                            .data(ticks)
////                            .enter().append("svg:circle")
////                            .attr("cx", r).attr("cy", r)
////                            .attr("r", radiusFunction);
////                        // Text representing chart tickmarks
////                        vis.append("svg:g").attr("class", "tickmarks")
////                            .selectAll("text")
////                            .data(tickmarks)
////                            .enter().append("svg:text")
////                            .text(tickLabel)
////                            .attr("dy", "-2px")
////                            .attr("transform", function (d) {
////                                var y = visWidth - radiusFunction(d);
////                                return "translate(" + r + "," + y + ") ";
////                            });
////
////                        // Labels: degree markers
////                        vis.append("svg:g")
////                            .attr("class", "labels")
////                            .selectAll("text")
////                            .data(d3.range(30, 361, 30))
////                            .enter().append("svg:text")
////                            .attr("dy", "-4px")
////                            .attr("transform", function (d) {
////                                return "translate(" + r + "," + p + ") rotate(" + d + ",0," + (r - p) + ")";
////                            })
////                            .text(function (dir) {
////                                return dir;
////                            });
////
////                        //var rollup = rollupForMonths(windroseData, selectedMonthControl.selected());
////                        var rollup = rollupForMonths(windroseData, months);
////
////
////                        if (container === "#windrose") {
////                            drawComplexArcs(vis, rollup, speedToColor, speedText, windroseArcOptions, probArcTextT);
////                        } else {
////                            drawComplexArcs(vis, rollup, probabilityToColor, probabilityText, windspeedArcOptions, speedArcTextT);
////                        }
////                        vis.append("svg:text")
////                            .text(captionText)
////                            .attr("class", "caption")
////                            .attr("transform", "translate(" + w / 2 + "," + (h + 20) + ")");
////                    }
////
////                    /** Code for small wind roses **/
////
////// Plot a small wind rose with the specified percentage data
//////   parent: the SVG element to put the plot on
//////   plotData: a list of 12 months, each a list of 13 numbers. plotData[month][0] is winds calm percentage,
//////     plotData[month][1, 2, 3...] is percentage of winds at 30 degrees, 60, 90, ...
////                    var smallArcScale = d3.scale.linear().domain([0, 0.15]).range([5, 30]).clamp(true);
////                    var smallArcOptions = {
////                        width: 15,
////                        from: 5,
////                        to: function (d) {
////                            return smallArcScale(d.p);
////                        }
////                    };
////
////                    function plotSmallRose(parent, plotData) {
////                        var winds = [];
////                        //var months = selectedMonthControl.selected();
////
////                        // For every wind direction (note: skip plotData[0], winds calm)
////                        for (var dir = 1; dir < 13; dir++) {
////                            // Calculate average probability for all selected months
////                            var n = 0, sum = 0;
////                            for (var month = 0; month < 12; month++) {
////                                if (months[month]) {
////                                    n += 1;
////                                    sum += plotData[month][dir];
////                                }
////                            }
////                            var avg = sum / n;
////                            winds.push({d: dir * 30, p: avg / 100});
////                        }
////                        parent.append("svg:g")
////                            .selectAll("path")
////                            .data(winds)
////                            .enter().append("svg:path")
////                            .attr("d", arc(smallArcOptions));
////                        parent.append("svg:circle")
////                            .attr("r", smallArcOptions.from);
////                    }
////
////
////                    drawBigWindrose(data, "#windrose", "caption");
////                    drawBigWindrose(data, "#avg", "caption");
////
//////need to reformat the data to get smallPlot to work, not sure how yet
//////var rollup = rollupForMonths(data, months);
//////var small = svg.append("g")
//////.attr("id", "small");
//////plotSmallRose(small, rollup)
////
////
//////Style the plots, this doesn't capture everything from windhistory.com
////                    svg.selectAll("text").style(textStyle);
////
////                    svg.selectAll(".arcs").style({  stroke: "#000", "stroke-width": "0.5px", "fill-opacity": 0.9 });
////                    svg.selectAll(".caption").style({ font: "18px sans-serif" });
////                    svg.selectAll(".axes").style({ stroke: "#aaa", "stroke-width": "0.5px", fill: "none" });
////                    svg.selectAll("text.arctext").style({ "font-size": "9px" });
//
//                });
//            }
//        };
//    });
//
