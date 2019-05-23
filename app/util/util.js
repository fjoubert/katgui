angular.module('katGui.util')
    .constant('CENTRAL_LOGGER_PORT', 9021)
    .constant('DATETIME_FORMAT', 'yyyy-MM-dd HH:mm:ss')
    .constant('MOMENT_DATETIME_FORMAT', 'YYYY-MM-DD HH:mm:ss')
    .directive('autoGrow', autoGrow)
    .factory('KatGuiUtil', katGuiUtil)
    .filter('regexSearch', regexSearchFilter)
    .filter('regexSearchAndOrder', regexSearchAndOrderFilter)
    .filter('prettifyJSON', function() {
        return function(input) {
            return JSON.prettify.prettyPrint(input);
        };
    })
    .filter('utcDateFromUnix', function(MOMENT_DATETIME_FORMAT) {
        return function(input) {
            return moment.utc(input, 'X').format(MOMENT_DATETIME_FORMAT);
        };
    })
    .directive('postNgRepeatLoadMore', function($timeout) {
        return {
            link: function(scope) {
                if (scope.$last) {
                    // iteration is complete, do whatever post-processing
                    // is necessary
                    $timeout(scope.$parent.loadMore, 100);
                }
            }
        };
    })
    .directive('enterPressed', function() {
        return function(scope, element, attrs) {
            element.bind("keydown keypress", function(event) {
                if (event.which === 13) {
                    var fn = (function(command) {
                        var cmd = command;
                        return function() {
                            scope.$eval(cmd);
                        };
                    })(attrs.enterPressed.replace('()', '("' + event.target.value + '")'));

                    // Apply function
                    scope.$apply(fn);
                    event.stopPropagation();
                }
            });
        };
    })
    .directive('draggable', function($document) {
        return {
            link: function(scope, element, attr) {
                var targetElement = angular.element(document.querySelector(attr.draggable));
                var offset = targetElement.offset();
                var startX = offset.left,
                    startY = offset.top,
                    x = offset.left,
                    y = offset.top;

                targetElement.css({
                    position: 'fixed'
                });

                element.on('mousedown', function(event) {
                    // Prevent default dragging of selected content
                    event.preventDefault();
                    offset = targetElement.offset();
                    x = offset.left;
                    y = offset.top;
                    startX = event.pageX - x;
                    startY = event.pageY - y;
                    $document.on('mousemove', mousemove);
                    $document.on('mouseup', mouseup);
                });

                function mousemove(event) {
                    if (targetElement.innerHeight() > 100) {
                        y = event.pageY - startY;
                        x = event.pageX - startX;

                        targetElement.css({
                            top: y + 'px',
                            left: x + 'px'
                        });

                        // targetElement.css({
                            // width: targetElement.innerWidth(),
                            // height: targetElement.innerHeight()
                        // });
                    }

                }

                function mouseup() {
                    $document.off('mousemove', mousemove);
                    $document.off('mouseup', mouseup);
                }
            }
        };
    })
    .directive('inheritBodyBg', function() {
        return {
            scope: {
                target: '@targetColorInherit'
            },
            link: function(scope, element, attr) {

                element.css({
                    'background-color': angular.element(document.querySelector(scope.target)).css('background-color')
                });
            }
        };
    })
    .directive('resizeable', function($document, $timeout) {
        return {
            link: function(scope, element, attr) {
                var timeout = 0;
                if (attr.dynamicResizeElement) {
                    timeout = parseInt(attr.dynamicResizeElement);
                }

                $timeout(function() {
                    var targetElement = angular.element(document.querySelector(attr.resizeable));
                    var offset = targetElement.offset(),
                        offsetX, offsetY;
                    var startX = offset.left,
                        startY = offset.top,
                        x = offset.left,
                        y = offset.top;

                    //targetElement.css({
                    //    position: 'fixed'
                    //});

                    element.on('mousedown', function(event) {
                        // Prevent default dragging of selected content
                        event.preventDefault();
                        startX = event.pageX - x;
                        startY = event.pageY - y;
                        offsetX = element.innerWidth() - event.offsetX;
                        offsetY = element.innerHeight() - event.offsetY;

                        $document.on('mousemove', mousemove);
                        $document.on('mouseup', mouseup);
                    });

                    function mousemove(event) {
                        event.preventDefault();
                        if (targetElement.innerHeight() > 10) {
                            y = event.pageY - startY;
                            x = event.pageX - startX;
                            var innerWidth = targetElement.innerWidth(),
                                innerHeight = targetElement.innerHeight();
                            targetElement.css({
                                width: innerWidth - (targetElement.offset().left + innerWidth - event.pageX) + offsetX,
                                height: innerHeight - (targetElement.offset().top + innerHeight - event.pageY) + offsetY
                            });
                        }
                    }

                    function mouseup() {
                        $document.off('mousemove', mousemove);
                        $document.off('mouseup', mouseup);
                    }
                }, timeout);
            }
        };
    })
    .directive('resizeabledivs', function($document, $localStorage) {
        return {
            link: function(scope, element, attr) {
                var startX = 0;
                var startY = 0;

                var resizeabledivs = attr.resizeabledivs;
                var targetNames = [];
                var resize_dir = '';

                // componentA||componentB vertical split between components
                // componentA--componentB horizontal split between components
                if (resizeabledivs.includes('||')) {
                    targetNames = resizeabledivs.split('||');
                    resize_dir = 'vertical';
                } else if (resizeabledivs.includes('--')) {
                    targetNames = resizeabledivs.split('--');
                    resize_dir = 'horizontal';
                } else {
                    console.error('resizeabledivs must be of format componentA||componentB or componentA--componentB ');
                    return;
                }


                var targetElementA = angular.element(document.querySelector(targetNames[0]));
                var targetElementB = angular.element(document.querySelector(targetNames[1]));

                var controllerA = targetElementA.controller().constructor.name;
                var targetASize = $localStorage[targetNames[0] + '-' + controllerA];
                var targetBSize = $localStorage[targetNames[1] + '-' + controllerA];

                if (resize_dir == 'horizontal') {
                    if (targetASize && targetBSize) {
                        targetElementA.css({
                            height: targetASize
                        });
                        targetElementB.css({
                            height: targetBSize
                        });
                    }
                } else {
                  if (targetASize && targetBSize) {
                      targetElementA.css({
                          width: targetASize
                      });
                      targetElementB.css({
                          width: targetBSize
                      });
                  }
                }

                element.on('mousedown', function(event) {
                    // Prevent default dragging of selected content
                    event.preventDefault();

                    startX = event.pageX;
                    startY = event.pageY;

                    $document.on('mousemove', mousemove);
                    $document.on('mouseup', mouseup);
                });

                function mousemove(event) {
                    event.preventDefault();

                    var innerHeightA = targetElementA.innerHeight();
                    var innerWidthA = targetElementA.innerWidth();

                    var innerHeightB = targetElementB.innerHeight();
                    var innerWidthB = targetElementB.innerWidth();

                    if (resize_dir == 'horizontal') {
                        var diff = event.pageY - startY;
                        startY = event.pageY;

                        var heightA = ((innerHeightA + diff)/(innerHeightA + innerHeightB) * 100) + '%';
                        var heightB = ((innerHeightB - diff)/(innerHeightA + innerHeightB) * 100) + '%';

                        $localStorage[targetNames[0] + '-' + controllerA] = heightA
                        targetElementA.css({
                            height: heightA
                        });
                        $localStorage[targetNames[1] + '-' + controllerA] = heightB
                        targetElementB.css({
                            height: heightB
                        });
                    } else {
                      var diff = event.pageX - startX;
                      startX = event.pageX;

                      var widthA = ((innerWidthA + diff)/(innerWidthA + innerWidthB) * 100) + '%';
                      var widthB = ((innerWidthB - diff)/(innerWidthA + innerWidthB) * 100) + '%';

                      $localStorage[targetNames[0] + '-' + controllerA] = widthA
                      targetElementA.css({
                          width: widthA
                      });

                      $localStorage[targetNames[1] + '-' + controllerA] = widthB
                      targetElementB.css({
                          width: widthB
                      });
                    }
                }

                function mouseup() {
                    $document.off('mousemove', mousemove);
                    $document.off('mouseup', mouseup);
                }
            }
        }
    })
    .directive('relativeDraggable', ['$document', function($document) {
        return {
            link: function(scope, element, attr) {
                var startX = element[0].offsetLeft;
                var startY = element[0].offsetTop;
                var x = startX,
                    y = startY;

                var el = angular.element(element[0].getElementsByClassName(attr.relativeDraggable));

                el.css({
                    cursor: 'pointer'
                });

                el.on('mousedown', function(event) {
                    // Prevent default dragging of selected content
                    event.preventDefault();
                    startX = event.pageX - x;
                    startY = event.pageY - y;
                    $document.on('mousemove', mousemove);
                    $document.on('mouseup', mouseup);
                });

                function mousemove(event) {
                    y = event.pageY - startY;
                    x = event.pageX - startX;
                    element.css({
                        top: y + 'px',
                        left: x + 'px'
                    });
                }

                function mouseup() {
                    $document.off('mousemove', mousemove);
                    $document.off('mouseup', mouseup);
                }
            }
        };
    }])
    .directive('mouseWheelDown', function() {
        return function(scope, element, attrs) {
            element.bind("DOMMouseScroll mousewheel onmousewheel", function() {
                var event = window.event;
                var delta = Math.max(-1, Math.min(1, (event.wheelDelta || -event.detail)));

                if (delta < 0) {
                    scope.$apply(function() {
                        scope.$eval(attrs.mouseWheelDown);
                    });
                }
            });
        };
    }).directive('mouseWheelUp', function() {
        return function(scope, element, attrs) {
            element.bind("DOMMouseScroll mousewheel onmousewheel", function() {
                var event = window.event;
                var delta = Math.max(-1, Math.min(1, (event.wheelDelta || -event.detail)));

                if (delta > 0) {
                    scope.$apply(function() {
                        scope.$eval(attrs.mouseWheelUp);
                    });
                }
            });
        };
    }).filter('toTrustedHtml', function($sce) {
        return function(text) {
            if (_.isString(text)) {
                return $sce.trustAsHtml(text);
            } else {
                return text;
            }

        };
    }).filter('linkify', function() {
        return function(text) {
            if (text.linkify) {
                return text.linkify();
            } else {
                return text;
            }
        };
    });

function regexSearchFilter() {
    return function(input, fields, regex, objDict) {
        if (regex) {
            var pattern;
            try {
                pattern = new RegExp(regex, 'i');
            } catch (e) {
                return input;
            }

            if (objDict) {
                input = objDict;
            }

            var inputArray = [];
            if (input instanceof Array === false &&
                angular.isObject(input)) {
                for (var key in input) {
                    input[key]._key = key;
                    inputArray.push(input[key]);
                }
            } else {
                inputArray = input;
            }

            var out = [];
            if (input instanceof Array === false &&
                angular.isObject(input) === "object") {
                out = {};
            }
            for (var i = 0; i < inputArray.length; i++) {
                for (var idx in fields) {
                    var fieldValue = fields[idx].value;
                    var testResult = false;
                    //split on the first period to get a nested value test
                    //only one level deep for now
                    if (fieldValue.indexOf('.') > -1) {
                        var fieldValues = fieldValue.split('.');
                        if (fieldValues.length === 2) {
                            testResult = pattern.test(inputArray[i][fieldValues[0]][fieldValues[1]]);
                        } else {
                            console.error('Regex test for ' + fieldValue + ' has too many nested levels.');
                        }
                    } else {
                        testResult = pattern.test(inputArray[i][fieldValue]);
                    }

                    if (testResult) {
                        if (objDict) {
                            out.push(inputArray[i]._key);
                        } else if (input instanceof Array === false && angular.isObject(out)) {
                            out[inputArray[i]._key] = inputArray[i];
                        } else {
                            out.push(inputArray[i]);
                        }
                        break;
                    }
                }
            }
            return out;
        } else {
            return input;
        }
    };
}

function regexSearchAndOrderFilter() {
    return function(input, fields, regex, orderByField, reverse, objDict) {
        var searchFilterResults = regexSearchFilter()(input, fields, regex, objDict);
        return searchFilterResults.sort(function (a, b) {
            var reverseMultiplier = reverse? -1 : 1;
            if (!orderByField) {
                orderByField = 'name';
            }
            var aString = objDict[a][orderByField].toString();
            var bString = objDict[b][orderByField].toString();
            if (aString < bString) {
                return -1 * reverseMultiplier;
            } else if (aString > bString) {
                return 1 * reverseMultiplier;
            } else {
                return 0;
            }
        });
    };
}

function autoGrow() {
    return function(scope, element, attr) {
        var update = function() {
            element.css("height", "auto");
            var height = element.parent()[0].clientHeight;
            if (height > 0) {
                element.css("height", height + "px");
            }
        };
        scope.$watch(attr.ngModel, function() {
            update();
        });
        scope.$watch(function() {
            return element.parent()[0].clientHeight;
        }, function() {
            update();
        });
        attr.$set("ngTrim", "false");
    };
}

/* istanbul ignore next */
//be very sure you know what you are doing when you alter the below functions
//they are not tested
function katGuiUtil($rootScope, $sce) {

    this.generateUUID = function() {
        var d = new Date().getTime();
        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
        return uuid;
    };

    this.openRelativePath = function(path, port) {
        if (window.location.host !== 'localhost:8000') {
            window.open("http://" + window.location.hostname + ":" + port + "/" + path).focus();
        } else {
            window.open($rootScope.portalUrl + ":" + port + "/" + path).focus();
        }
    };

    function frac(X) {
        X = X - Math.floor(X);
        if (X < 0) {
            X = X + 1.0;
        }
        return X;
    }

    function hoursMinutesSecondsToString(time) {

        var h = Math.floor(time);
        var min = Math.floor(60.0 * frac(time));
        var secs = Math.round(60.0 * (60.0 * frac(time) - min));

        var str;
        if (min >= 10) {
            str = h + ":" + min;
        } else {
            str = h + ":0" + min;
        }

        if (secs < 10) {
            str = str + ":0" + secs;
        } else if (secs === 60) {
            str = str + ":00";
        } else {
            str = str + ":" + secs;
        }
        return (" " + str).trim();
    }

    function generalSiderealTime(jd) {
        var t_eph, ut, MJD0, MJD;
        MJD = jd - 2400000.5;
        MJD0 = Math.floor(MJD);
        ut = (MJD - MJD0) * 24.0;
        t_eph = (MJD0 - 51544.5) / 36525.0;
        return 6.697374558 + 1.0027379093 * ut + (8640184.812866 + (0.093104 - 0.0000062 * t_eph) * t_eph) * t_eph / 3600.0;
    }

    this.localSiderealTime = function(jd, longitude) {
        var GMST = generalSiderealTime(jd);
        var LMST = 24.0 * frac((GMST + longitude / 15.0) / 24.0);
        return hoursMinutesSecondsToString(LMST);
    };

    //UT as a fraction of hours
    this.julianDay = function(day, month, year) {
        var Y = year,
            M = month,
            D = day,
            A, B, C, E, F, JD;
        A = Math.floor(Y / 100);
        B = Math.floor(A / 4);
        C = 2 - A + B;
        E = 365.25 * (Y + 4716);
        F = 30.6001 * (M + 1);
        JD = C + D + E + F - 1524.5;
        return JD;
    };

    this.julianDayWithTime = function(day, month, year, UT) {
        return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day - 13 - 1524.5 + UT / 24.0;
    };

    this.degreesToFloat = function(degrees) {
        var latSplit = degrees.split(':');
        var deg = parseInt(latSplit[0]);
        var result = Math.abs(deg) + parseInt(latSplit[1]) / 60 + parseInt(latSplit[2]) / 3600;
        if (deg < 0) {
            result *= -1;
        }
        return result;
    };

    JSON.prettify = {
        stringifyJSON: function(obj, indent) {
            var keys = [];
            var listTypesKeys = [];
            if (obj) {
                for(var obj_key in obj) {
                    if (obj[obj_key] instanceof Array) {
                        listTypesKeys.push(obj_key);
                    } else {
                        keys.push(obj_key);
                    }
                }
            }
            keys.sort();
            listTypesKeys.sort();
            //add array types at the end of the object that will be printed
            keys = keys.concat(listTypesKeys);
            var tObj = {};
            var key;
            for(var index in keys) {
                key = keys[index];
                tObj[key] = obj[key];
            }
            return JSON.stringify(tObj, null, indent);
        },
        replacer: function(match, pIndent, pKey, pVal, pEnd) {
            var key = '<span class=json-key>';
            var val = '<span class=json-value>';
            var str = '<span class=json-string>';
            var r = pIndent || '';
            if (pKey) {
                r = r + key + pKey.replace(/[": ]/g, '') + '</span>: ';
            }
            if (pVal) {
                r = r + (pVal[0] === '"' ? str : val) + pVal + '</span>';
            }
            return r + (pEnd || '');
        },
        prettyPrint: function(obj) {
            if (obj) {
                var jsonLine = /^( *)("[\w]+": )?("[^"]*"|[\w.+-]*)?([,[{])?$/mg;
                return $sce.trustAsHtml(JSON.prettify.stringifyJSON(obj, 3)
                    .replace(/&/g, '&amp;').replace(/\\"/g, '&quot;')
                    .replace(/</g, '&lt;').replace(/>/g, '&gt;')
                    .replace(jsonLine, JSON.prettify.replacer));
            } else {
                return '';
            }
        }
    };

    this.isValidURL = function(str) {
        var pattern = new RegExp('^(?:(?:http|https|ftp)://)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$');
        //remove possible quotes left in from katconfig
        str = str.replace(/"/g, '').replace(/'/g, "");
        return pattern.test(str);
    };

    this.sanitizeKATCPMessage = function(katcpMessage) {
        // remove all katcp formatting as well as ANSI colour codes
        return katcpMessage.replace(/\\_/g, ' ').replace(/\\n\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\\e\[[0-9;]*m/g, '');
    };

    //accurately round a number to at most n decimal places
    //javascript float precision is... not so precise
    this.roundToAtMostDecimal = function round(value, exp) {
        if (typeof exp === 'undefined' || +exp === 0) {
            return Math.round(value);
        }

        value = +value;
        exp = +exp;

        if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
            return NaN;
        }

        // Shift
        value = value.toString().split('e');
        value = Math.round(+(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp)));

        // Shift back
        value = value.toString().split('e');
        return +(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp));
    };

    return this;
}

var objToString = Object.prototype.toString;

_.isString = function(obj) {
    return objToString.call(obj) === '[object String]';
};

if (!String.linkify) {
    String.prototype.linkify = function() {

        // http://, https://, ftp://
        var urlPattern = /\b(?:https?|ftp):\/\/[a-z0-9-+&@#\/%?=~_|!:,.;]*[a-z0-9-+&@#\/%=~_|]/gim;

        // www. sans http:// or https://
        var pseudoUrlPattern = /(^|[^\/])(www\.[\S]+(\b|$))/gim;

        // Email addresses
        var emailAddressPattern = /[\w.]+@[a-zA-Z_-]+?(?:\.[a-zA-Z]{2,6})+/gim;

        return this
            .replace(urlPattern, '<a href="$&" target="_blank">$&</a>')
            .replace(pseudoUrlPattern, '$1<a href="http://$2" target="_blank">$2</a>')
            .replace(emailAddressPattern, '<a href="mailto:$&" target="_blank">$&</a>');
    };
}
