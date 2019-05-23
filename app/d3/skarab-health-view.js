angular.module('katGui.d3')

.directive('skarabHealthView', function($rootScope, $timeout, d3Util) {
    return {
        restrict: 'E',
        link: function(scope, element) {
            const format = d3.time.format.utc("%Y-%m-%d %X");

            var rectangles = null;
            var skarabTexts = null;

            var margin = {
                top: 10,
                right: 20,
                left: 60,
                bottom: 30
            };

            var svg;
            var width, height, radius;
            var border = 2;

            scope.vm.redrawStatus = function () {

              width = element[0].clientWidth - margin.left - margin.right;
              height = element[0].clientHeight - margin.top - margin.bottom;


              unitWidth = width/scope.vm.NUM_OF_RACKS - border;
              unitHeight = height/scope.vm.NUM_OF_SLOTS - border;

              d3.select('svg').remove();

              svg = d3.select(element[0]).append("svg")
                      .attr("width", element[0].clientWidth)
                      .attr("height", element[0].clientHeight);


              var area = svg.append("g")
                            .attr("transform","translate(" + margin.left + "," + margin.top + ")")
                            .attr("width", width)
                            .attr("height", height);

              area.append("rect")
                  .attr("x", 0)
                  .attr("y", 0)
                  .attr("width", width)
                  .attr("height", height)
                  .attr('fill', '#BDBDBD');

              var graph = area.append("g")
                              .attr("x", 0)
                              .attr("y", 0)
                              .attr("width", width-1)
                              .attr("height", height)
                              .attr("transform","translate(1,1)")

              var x = d3.scale.linear().domain([scope.vm.NUM_OF_RACKS, 0]).range([0, width]);
              var y = d3.scale.linear().domain([scope.vm.NUM_OF_SLOTS, 0]).range([0, height]);

              var xAxis = d3.svg.axis().scale(x).orient("top").ticks(10);
              var yAxis = d3.svg.axis().scale(y).orient("right").ticks(10);

              function draw_rectangles(selection) {
                 var rectangleAttributes =
                    selection.attr("x", function (d) { return x(d.rack); })
                            .attr("y", function (d) { return y(d.slot); })
                            .attr("ObjectID",function(d) { return d.id; })
                            .style("stroke", "white")
                            .style("stroke-width", 0)
                            .attr("width", function (d) {
                              return unitWidth;
                            })
                            .attr("height", function (d) {
                              return unitHeight;
                            })
                            .attr("class", function(d) {
                              return d.status + "-child";
                            })
                            .on('mouseover',function(d) {
                              d3.select(this)
                             	  .style("fill-opacity", .8)
                                .style("stroke-width", 5)
                                .style("cursor", function(d) {
                                  if (d.name)
                                    return "pointer";

                                  return 'default';
                                });
                            })
                            .on('mouseout',function (d) {
                              d3.select(this)
                               .style("fill-opacity", 1)
                               .style("stroke-width", 0)
                               .style("cursor", "default");
                            })
                            .on('click', function(d){
                              if (d.name) {
                                var components = d.name.split('\.');
                                scope.vm.navigateToSensorList(components[0],
                                  components[2].substring(0, 11));
                              }
                            });
                 };

              rectangles = graph.selectAll("rect")
                .data(scope.vm.data)
                .enter()
                .append("rect")
                .call(draw_rectangles);

              var skarabArea = area.append('g');

              skarabTexts = skarabArea.selectAll('text')
                                  .data(scope.vm.data)
                                  .enter()
                                  .append('text');

              skarabTexts.attr("x", function (d) { return x(d.rack) + unitWidth/2; })
                          .attr("y", function (d) { return y(d.slot-1) - 5; })
                          .attr("ObjectID", function(d) { return d.id; })
                          .style('text-anchor', 'middle')
                          .attr('fill', 'white')
                          .attr('id', function(d) { return d.position.replace(':', ''); })
                          .text(function(d) {
                            if (d.name) {
                              var subs = d.name.split('.');
                              subs.pop();

                              return subs.pop().replace('skarab', '');
                            }
                          });

              var textArea = area.append('g');
              var slotTexts = textArea.selectAll("text")
                              .data(['05','10','15','20','25','30','35','40'])
                              .enter()
                              .append("text");

              slotTexts.attr("x", function(d) { return -20; })
                    .attr("y", function(d) { return y(d-1) - 7; })
                    .text( function (d) { return ""+d; })
                    .attr("font-family", "sans-serif")
                    .attr("font-size", "14px")
                    .attr("fill", "grey");

              textArea.append('text').text('SLOT')
                      .attr("x", function(d) { return -height/2; })
                      .attr("y", function(d) { return -30; })
                      .attr("font-family", "sans-serif")
                      .attr("font-size", "16px")
                      .attr("transform", "rotate(270)")


              textArea = area.append('g');
              var rackTexts = textArea.selectAll("text")
                               .data(['9','8','7','6','5','4','3','2','1'])
                               .enter()
                               .append("text");

              rackTexts.attr("x", function(d) { return x(d) + unitWidth/2; })
                   .attr("y", function(d) { return height + 15; })
                   .style('text-anchor', 'middle')
                   .text( function (d) { return "RACK B"+d; })
                   .attr("font-family", "sans-serif")
                   .attr("font-size", "14px")
                   .attr("fill", "grey");
            };

            var unbindResize = scope.$watch(function() {
                return element[0].clientHeight + ', ' + element[0].clientWidth;
            }, function(newVal, oldVal) {
                if (newVal !== oldVal) {
                    if (scope.resizeTimeout) {
                        $timeout.cancel(scope.resizeTimeout);
                        scope.resizeTimeout = null;
                    }
                    //allow for some time for the dom elements to complete resizing
                    scope.resizeTimeout = $timeout(function() {
                        scope.vm.redrawStatus();
                    }, 1000);
                }
            });

            scope.$on('$destroy', function() {
              unbindResize();
            });


            scope.vm.updateStatus = function(obj) {
              if (!rectangles)
                return;

              rectangles.data([obj], function(d) {return d.id;})
                    .attr("class", function(d) {
                      return d.status + "-child";
                    });

              skarabTexts.data([obj], function(d) {return d.id;})
                    .text(function(d) {
                      if (d.name) {
                        var subs = d.name.split('.');
                        subs.pop();

                        return subs.pop().replace('skarab', '');
                      }
                    });

            };
        }
    };
});
