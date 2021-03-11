(function () {

    angular.module('katGui')
        .controller('UtilisationReportCtrl', UtilisationReportCtrl);

        function UtilisationReportCtrl($rootScope, $scope, $localStorage, $filter, DataService, ObsSchedService,
                                       $q, $log, $stateParams, NotifyService, $timeout, $state, ConfigService,
                                       MOMENT_DATETIME_FORMAT) {

            var vm = this;
            vm.startTime = new Date();
            vm.startTime.setHours(0);
            vm.startTime.setMinutes(0);
            vm.startTime.setSeconds(0);
            vm.endTime = new Date();
            vm.startDatetimeReadable = moment(vm.startTime.getTime()).format(MOMENT_DATETIME_FORMAT);
            vm.endDatetimeReadable = moment(vm.endTime.getTime()).format(MOMENT_DATETIME_FORMAT);
            vm.creatingReceptorReport = false;
            vm.creatingSubarrayReport = false;
            vm.subarrayReportSensorsRegex = "subarray...state|subarray...maintenance|subarray...product|subarray...band|sched.mode..";
            vm.receptorsReportSensorsRegex = "katpool.pool.resources|katpool.resources.faulty|katpool.resources.in.maintenance";
            vm.interlockReportSensorsRegex = "sys.interlock.state";
            vm.scheduleReportSensorsRegex = "sched.active.schedule..";
            vm.poolResourcesAssignedDurations = {};
            vm.interlockReceptorReportResults = {};
            vm.SBDetails = [];
            vm.totalSBDuration = "00:00:00";
            vm.subarrayNrs = [];
            vm.schedModeDurations = {};
            vm.subarrayStateDurations = {};
            vm.subarrayBandDurations = {};
            vm.subarrayProductDurations = {};
            vm.subarrayMaintenanceDurations = {};
            vm.resourceItemColumns = [];

            if ($stateParams.filter) {
                vm.searchInputText = $stateParams.filter;
            }

            vm.clearReportsData = function () {
                vm.schedModeDurations = {};
                vm.subarrayStateDurations = {};
                vm.subarrayMaintenanceDurations = {};
                vm.subarrayBandDurations = {};
                vm.subarrayProductDurations = {};
                vm.SBDetails = [];
                vm.scheduleReportResults = [];
                vm.poolResourcesAssignedDurations = {};
                vm.interlockReceptorReportResults = {};
                vm.resourceItemColumns = [];
                vm.reportTimeWindowSecondsDurationReadable = '';

                vm.subarrayNrs.forEach(function (subNr) {
                    vm.subarrayMaintenanceDurations[subNr] = {};
                    vm.resourceItemColumns.push(subNr);
                });
                vm.resourceItemColumns = vm.resourceItemColumns.concat(['faulty', 'in_maintenance']);
            };

            vm.clearReportsData();

            vm.onStartTimeSet = function () {
                vm.startDatetimeReadable = moment(vm.startTime.getTime()).format(MOMENT_DATETIME_FORMAT);
            };

            vm.onEndTimeSet = function () {
                vm.endDatetimeReadable = moment(vm.endTime.getTime()).format(MOMENT_DATETIME_FORMAT);
            };

            vm.exportPdf = function(){
                vm.exportingPdf = true;
                var pdf = new jsPDF('l', 'pt');
                var exportTime = moment.utc().format(MOMENT_DATETIME_FORMAT);

                var sensorColumns = [
                    {title: "Sensor", dataKey: "sensorName"},
                    {title: "Value", dataKey: "value"},
                    {title: "Duration", dataKey: "duration"},
                    {title: "% of Total", dataKey: "percentageOfTotal"}
                ];

                pdf.setFontSize(20);
                pdf.text('Utilisation Report - ' + exportTime + ' (UTC)', 20, 25);
                pdf.setFontSize(12);

                pdf.text('From: ' + vm.startDatetimeReadable + '\tTo: ' + vm.endDatetimeReadable + '\t\t(Report Duration: ' + vm.reportTimeWindowSecondsDurationReadable + ' hours)', 20, 45);

                var schedColumns = [
                    {title: "", dataKey: "value"}
                ];
                vm.subarrayNrs.forEach(function (subNr) {
                    schedColumns.push({title: subNr, dataKey: "percentageOfTotal_" + subNr});
                });
                var schedModeKeys = Object.keys(vm.schedModeDurations);
                var rows = [];
                schedModeKeys.forEach(function (key) {
                    var newSchedModeRow = {
                        value: key
                    };
                    vm.subarrayNrs.forEach(function (subNr) {
                        newSchedModeRow["percentageOfTotal_" + subNr] =  vm.schedModeDurations[key][subNr].percentageOfTotal;
                    });
                    rows.push(newSchedModeRow);
                });

                pdf.setFontSize(20);
                pdf.text('Scheduler Mode', 20, 80);
                pdf.setFontSize(12);

                pdf.autoTable(schedColumns, rows, {
                    startY: 95,
                    theme: 'striped',
                    margin: {top: 8, bottom: 8}});

                var inMaintenanceRow = {
                    value: 'In Maintenance'
                };
                vm.subarrayNrs.forEach(function (subNr) {
                    var percentageStr = (vm.subarrayMaintenanceDurations[subNr].percentageOfTotal || '');
                    var durationStr = '';
                    if (vm.subarrayMaintenanceDurations[subNr].duration) {
                        durationStr = ' (' + (vm.subarrayMaintenanceDurations[subNr].duration || '') + ')';
                    }
                    inMaintenanceRow['percentageOfTotal_' + subNr] = percentageStr + durationStr;
                });
                rows = [inMaintenanceRow];
                schedColumns[0].title = "";

                pdf.setFontSize(20);
                pdf.text('Subarray In Maintenance', 20, pdf.autoTableEndPosY() + 45);
                pdf.setFontSize(12);

                pdf.autoTable(schedColumns, rows, {
                    startY: pdf.autoTableEndPosY() + 60,
                    theme: 'striped',
                    margin: {top: 8, bottom: 8}});

                var subarrayStateKeys = Object.keys(vm.subarrayStateDurations);
                rows = [];
                schedColumns[0].title = "";
                subarrayStateKeys.forEach(function (key) {
                    var newSubarrayStateRow = {
                        value: key
                    };
                    vm.subarrayNrs.forEach(function (subNr) {
                        newSubarrayStateRow["percentageOfTotal_" + subNr] =  vm.subarrayStateDurations[key][subNr].percentageOfTotal;
                    });
                    rows.push(newSubarrayStateRow);
                });
                pdf.setFontSize(20);
                pdf.text('Subarray State', 20, pdf.autoTableEndPosY() + 45);
                pdf.setFontSize(12);

                pdf.autoTable(schedColumns, rows, {
                    startY: pdf.autoTableEndPosY() + 60,
                    theme: 'striped',
                    margin: {top: 8, bottom: 8}});

                schedColumns[0].title = "";
                var subarrayBandKeys = Object.keys(vm.subarrayBandDurations);
                rows = [];
                subarrayBandKeys.forEach(function (key) {
                    var newSubarrayBandRow = {
                        value: key !== ""? key: "None",
                    };
                    vm.subarrayNrs.forEach(function (subNr) {
                        newSubarrayBandRow["percentageOfTotal_" + subNr] =  vm.subarrayBandDurations[key][subNr].percentageOfTotal;
                    });
                    rows.push(newSubarrayBandRow);
                });

                pdf.setFontSize(20);
                pdf.text('Subarray Bands', 20, pdf.autoTableEndPosY() + 45);
                pdf.setFontSize(12);

                pdf.autoTable(schedColumns, rows, {
                    startY: pdf.autoTableEndPosY() + 60,
                    theme: 'striped',
                    margin: {top: 8, bottom: 8}});

                schedColumns[0].title = "";
                var subarrayProductKeys = Object.keys(vm.subarrayProductDurations);
                rows = [];
                subarrayProductKeys.forEach(function (key) {
                    var newSubarrayProductRow = {
                        value: key !== ""? key: "None",
                    };
                    vm.subarrayNrs.forEach(function (subNr) {
                        newSubarrayProductRow["percentageOfTotal_" + subNr] =  vm.subarrayProductDurations[key][subNr].percentageOfTotal;
                    });
                    rows.push(newSubarrayProductRow);
                });

                pdf.setFontSize(20);
                pdf.text('Subarray Products', 20, pdf.autoTableEndPosY() + 45);
                pdf.setFontSize(12);

                pdf.autoTable(schedColumns, rows, {
                    startY: pdf.autoTableEndPosY() + 60,
                    theme: 'striped',
                    margin: {top: 8, bottom: 8}});

                var poolResourcesKeys = Object.keys(vm.poolResourcesAssignedDurations).sort();
                rows = [];
                poolResourcesKeys.forEach(function (key) {
                    var newPoolResourcesRow = {
                        resource: key,
                        durationTotal: vm.poolResourcesAssignedDurations[key].durationTotal,
                        percentageTotal: vm.poolResourcesAssignedDurations[key].percentageTotal,
                        faulty: vm.poolResourcesAssignedDurations[key].faulty.percentageOfTotal,
                        in_maintenance: vm.poolResourcesAssignedDurations[key].in_maintenance.percentageOfTotal
                    };
                    vm.subarrayNrs.forEach(function (subNr) {
                        newPoolResourcesRow["percentageOfTotal_" + subNr] =  vm.poolResourcesAssignedDurations[key][subNr].percentageOfTotal;
                    });
                    rows.push(newPoolResourcesRow);
                });

                var resourceColumns = [
                    {title: "Resource", dataKey: "resource"},
                    {title: "Total Duration", dataKey: "durationTotal"}
                ];
                vm.subarrayNrs.forEach(function (subNr) {
                    resourceColumns.push({title: subNr, dataKey: "percentageOfTotal_" + subNr});
                });
                resourceColumns.push({title: "faulty", dataKey: "faulty"});
                resourceColumns.push({title: "in_maintenance", dataKey: "in_maintenance"});
                resourceColumns.push({title: "Total %", dataKey: "percentageTotal"});

                pdf.setFontSize(20);
                pdf.text('Resource Utilisation', 20, pdf.autoTableEndPosY() + 45);
                pdf.setFontSize(12);

                pdf.autoTable(resourceColumns, rows, {
                    startY: pdf.autoTableEndPosY() + 60,
                    theme: 'striped',
                    margin: {top: 8, bottom: 8}});

                var systemStateColumns = [{title: "Interlock State", dataKey: "rowName"}];
                rows = [{rowName: 'Percentage'}, {rowName: 'Duration'}];
                Object.keys(vm.interlockReceptorReportResults).forEach(function (key) {
                    if (!_.find(systemStateColumns, {title: key})) {
                        systemStateColumns.push({title: key, dataKey: key});
                    }
                    rows[0][key] = vm.interlockReceptorReportResults[key].percentageOfTotal;
                    rows[1][key] = vm.interlockReceptorReportResults[key].duration;
                });

                pdf.setFontSize(20);
                pdf.text('System State', 20, pdf.autoTableEndPosY() + 45);
                pdf.setFontSize(12);

                pdf.autoTable(systemStateColumns, rows, {
                    startY: pdf.autoTableEndPosY() + 60,
                    theme: 'striped',
                    margin: {top: 8, bottom: 8}});

                var sbColumns = [
                    {title: "Id Code", dataKey: "id_code"},
                    {title: "Proposal Id", dataKey: "proposal_id"},
                    {title: "Owner", dataKey: "owner"},
                    {title: "Description", dataKey: "description"},
                    {title: "Subarray", dataKey: "sub_nr"},
                    {title: "State", dataKey: "state"},
                    {title: "Outcome", dataKey: "outcome"},
                    {title: "Duration", dataKey: "duration"},
                    {title: "% of Total", dataKey: "percentageOfTotal"},
                    {title: "No. of Ants", dataKey: "n_ants"}
                ];

                pdf.setFontSize(20);
                pdf.text('Active Schedule Block Details', 20, pdf.autoTableEndPosY() + 45);
                pdf.setFontSize(12);

                var duration_column = [
                    {
                        title: "Total Duration of All Active Schedule Blocks",
                        dataKey: "total_duration_title",
                    },
                    { title: "", dataKey: "total_sb_duration" },
                ];

                var duration_rows = [
                    {
                        total_duration_title: "Duration",
                        total_sb_duration: vm.totalSBDuration,
                    }
                ];
                pdf.autoTable(duration_column, duration_rows, {
                    startY: pdf.autoTableEndPosY() + 60,
                    theme: "striped",
                    margin: { top: 8, bottom: 8 },
                    columnStyles: {
                        total_duration_title: { columnWidth: 685 },
                        total_sb_duration: { columnWidth: 85 },
                    },
                });

                pdf.autoTable(sbColumns, vm.SBDetails, {
                    startY: pdf.autoTableEndPosY() + 60,
                    theme: 'striped',
                    margin: {top: 8, bottom: 8},
                    columnStyles: {
                        id_code: {columnWidth: 85},
                        proposal_id: {columnWidth: 120},
                        owner: {overflow: 'linebreak'},
                        description: {overflow: 'linebreak'},
                        subarray: {columnWidth: 65},
                        state: {columnWidth: 85},
                        outcome: {columnWidth: 70},
                        duration: {columnWidth: 65},
                        percentageOfTotal: {columnWidth: 70},
                        n_ants: {columnWidth: 70}
                    }});

                pdf.save('utilisation_report_' + exportTime.replace(/ /g, '.') + '.pdf');
                vm.exportingPdf = false;
            };

            vm.exportExcel = function(){
                vm.exportingExcel = true;
                // Scheduler Mode
                var schedMode = ["Subarray", "1", "2", "3", "4", "5", "6", "7"];
                var schedulerModeRows = [schedMode];
                var schedModeKeys = Object.keys(vm.schedModeDurations);
                schedModeKeys.forEach(function (key) {
                    var newSchedModeRow = [key];
                    vm.subarrayNrs.forEach(function (subNr) {
                        var numEntries = Object.entries(vm.schedModeDurations[key][subNr]).length;
                        var schedModeTot = "";
                        if (numEntries != 0) {
                            schedModeTot = vm.schedModeDurations[key][subNr].percentageOfTotal;
                        }
                        newSchedModeRow.push(schedModeTot);
                    });
                    schedulerModeRows.push(newSchedModeRow);
                });

                // Subarray
                var subarraysRows = [["", "1", "2", "3", "4", "5", "6", "7"]];

                // maintenance
                var inMaintenanceRowNames = ["Maintenance"];
                var inMaintenanceRows = [inMaintenanceRowNames];
                var inMaintannceDuration = [""];
                vm.subarrayNrs.forEach(function (subNr) {
                    var percentageStr = vm.subarrayMaintenanceDurations[subNr].percentageOfTotal || "";
                    var durationStr = "";
                    if (vm.subarrayMaintenanceDurations[subNr].duration) {
                        durationStr = " (" + (vm.subarrayMaintenanceDurations[subNr].duration || "") + ")";
                    }
                    inMaintannceDuration.push(percentageStr + durationStr);
                    if (inMaintannceDuration.length == vm.subarrayNrs.length){
                        inMaintenanceRows.push(inMaintannceDuration);
                    }
                });
                // -------------------------------------------------------
                // states
                var subarrayStateKeys = Object.keys(vm.subarrayStateDurations);
                var statesRows = [];
                subarrayStateKeys.forEach(function (key) {
                    var newSubarrayStateRow = [key || "None"];
                    vm.subarrayNrs.forEach(function (subNr) {
                        newSubarrayStateRow.push(vm.subarrayStateDurations[key][subNr].percentageOfTotal || "");
                    });
                    statesRows.push(newSubarrayStateRow);
                });

                // -------------------------------------------------------
                // bands
                var subarrayBandKeys = Object.keys(vm.subarrayBandDurations);
                var bandsRows = [];
                subarrayBandKeys.forEach(function (key) {
                    var newSubarrayBandRow = [key || "None"];
                    vm.subarrayNrs.forEach(function (subNr) {
                        newSubarrayBandRow.push(vm.subarrayBandDurations[key][subNr].percentageOfTotal || "");
                    });
                    bandsRows.push(newSubarrayBandRow);
                });

                // -------------------------------------------------------
                // product
                var subarrayProductKeys = Object.keys(vm.subarrayProductDurations);
                var productRows = [];
                subarrayProductKeys.forEach(function (key) {
                    var newSubarrayProductRow = [key || "None"];
                    vm.subarrayNrs.forEach(function (subNr) {
                        newSubarrayProductRow.push(vm.subarrayProductDurations[key][subNr].percentageOfTotal || "");
                    });
                    productRows.push(newSubarrayProductRow);
                });

                // Resource Utilisation
                var resourceUtilisationRowNames = ["", "Total Duration", "Total %", "1", "2", "3", "4", "5", "6", "7", "faulty", "in maintenance"];
                var resourceUtilisationRows = [resourceUtilisationRowNames];

                var poolResourcesKeys = Object.keys(vm.poolResourcesAssignedDurations).sort();
                poolResourcesKeys.forEach(function (key) {
                    var newPoolResourcesRow = [];
                    var durationTotal = vm.poolResourcesAssignedDurations[key].durationTotal || "";
                    var percentageTotal = vm.poolResourcesAssignedDurations[key].percentageTotal || "";
                    var faulty = vm.poolResourcesAssignedDurations[key].faulty.percentageOfTotal || "";
                    var inMaintenance = vm.poolResourcesAssignedDurations[key].in_maintenance.percentageOfTotal || "";
                    newPoolResourcesRow.push(key, durationTotal, percentageTotal);

                    vm.subarrayNrs.forEach(function (subNr) {
                        newPoolResourcesRow.push(vm.poolResourcesAssignedDurations[key][subNr].percentageOfTotal || "");
                    });
                    newPoolResourcesRow.push(faulty, inMaintenance);

                    resourceUtilisationRows.push(newPoolResourcesRow);
                });

                // System State
                var SystemStateRows = [];
                var systemStateColumns = "Interlock State";

                Object.keys(vm.interlockReceptorReportResults).forEach(function (key) {
                    if (!_.find(systemStateColumns, key)) {
                        systemStateColumns = [systemStateColumns, key];
                    }
                    var percentageRow = ["Percentage: ", vm.interlockReceptorReportResults[key].percentageOfTotal];
                    var durationRow = ["Duration: ", vm.interlockReceptorReportResults[key].duration];
                    SystemStateRows.push(systemStateColumns, percentageRow, durationRow);
                });

                // Active Schedule Block Details
                var totalSBDurationRow = [
                    ["Total Duration of All Active Schedule Blocks", vm.totalSBDuration]
                ];
                var SBDetailsColumns = ["Id Code", "Proposal Id", "Owner", "Description", "Subarray", "State", "Outcome", "Duration", "% of Total", "No. of Ants"];
                var ActiveSchedBlockRows = [SBDetailsColumns];
                vm.SBDetails.forEach(function (obs) {
                    var idCode = obs.id_code || "";
                    var proposalID = obs.proposal_id || "";
                    var owner = obs.owner || "";
                    var description = obs.description || "";
                    var subarray = obs.sub_nr || "";
                    var state = obs.state || "";
                    var outcome = obs.outcome || "";
                    var duration = obs.duration || "";
                    var percentageTotal = obs.percentageOfTotal || "";
                    var noAnts = obs.n_ants || "";
                    var schedDetails = [];
                    schedDetails.push(idCode,proposalID, owner, description, subarray,state, outcome, duration, percentageTotal, noAnts);
                    ActiveSchedBlockRows.push(schedDetails);
                });

                // -----------------------ADD HEADERS-----------------------------------------------
                var schedModeHeader = ["Scheduler Mode"];
                schedulerModeRows.splice(0,0, schedModeHeader);

                var subarraysHeader = ["Subarray"];
                subarraysRows.splice(0, 0, subarraysHeader);

                var stateHeader = ["State"];
                statesRows.splice(0, 0, stateHeader);

                var bandsHeader = ["Band"];
                bandsRows.splice(0, 0, bandsHeader);

                var productHeader = ["Product"];
                productRows.splice(0, 0, productHeader);

                var resourceUtilisationHeader = ["Resource Utilisation"];
                resourceUtilisationRows.splice(0,0, resourceUtilisationHeader);

                var SystemStateHeader = ["System State"];
                SystemStateRows.splice(0, 0, SystemStateHeader);

                var SBDetailsHeader = ["Active Schedule Block Details"];
                totalSBDurationRow.splice(0, 0, SBDetailsHeader);

                // -------------------------ADD NEW LINE ---------------------------------------------
                var NewLine = [];
                schedulerModeRows.push(NewLine);
                subarraysRows.push(NewLine);
                inMaintenanceRows.push(NewLine);
                statesRows.push(NewLine);
                bandsRows.push(NewLine);
                productRows.push(NewLine);
                resourceUtilisationRows.push(NewLine);
                SystemStateRows.push(NewLine);
                totalSBDurationRow.push(NewLine);
                ActiveSchedBlockRows.push(NewLine);

                var data = schedulerModeRows.concat(
                    subarraysRows, inMaintenanceRows, statesRows, bandsRows, productRows,
                    resourceUtilisationRows, SystemStateRows, totalSBDurationRow, ActiveSchedBlockRows
                    );

                // Download the sheet
                var ws = XLSX.utils.aoa_to_sheet(data);
                var wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Presidents");
                XLSX.writeFile(wb, "sheetjs.xlsx");               vm.exportingExcel = false;
            };

            vm.createReport = function () {
                vm.clearReportsData();
                $state.go('utilisation-report', {
                        startTime: vm.startDatetimeReadable,
                        endTime: vm.endDatetimeReadable,
                        filter: vm.searchInputText},
                        { notify: false, reload: false });
                var startDate = moment.utc(vm.startDatetimeReadable).unix();
                var endDate =  moment.utc(vm.endDatetimeReadable).unix();
                vm.reportTimeWindowSecondsDuration = Math.abs(endDate - startDate);
                vm.reportTimeWindowSecondsDurationReadable = vm.durationToString(moment.duration(vm.reportTimeWindowSecondsDuration, 's'));
                vm.createSubarraysReport(startDate, endDate);
                vm.createReceptorsReport(startDate, endDate);
                vm.createInterlockReport(startDate, endDate);
                vm.createScheduleReport(startDate, endDate);
            };

            vm.createSubarraysReport = function (startDate, endDate) {
                var deferred = $q.defer();
                vm.creatingSubarrayReport = true;

                DataService.sampleValueDuration(vm.subarrayReportSensorsRegex, startDate, endDate).then(function (result) {
                    if (result.data.data) {
                        result.data.data.forEach(function (item) {
                            var subNr;
                            var duration = moment.duration(item.sum, 's');
                            var reportItem = {
                                sensorName: item.name,
                                value: item.value,
                                durationSeconds: duration.asSeconds(),
                                duration: vm.durationToString(duration)
                            };
                            if (reportItem.duration) {
                                reportItem.percentageOfTotal = vm.percentageOfTotalToString(reportItem.durationSeconds);
                            }

                            if (reportItem.sensorName.search('_mode_.') > -1) {
                                subNr = _.last(reportItem.sensorName.split('_'));
                                if (!vm.schedModeDurations[reportItem.value]) {
                                    vm.schedModeDurations[reportItem.value] = {};
                                    vm.subarrayNrs.forEach(function (item) {
                                        vm.schedModeDurations[reportItem.value][item] = {};
                                    });
                                }
                                vm.schedModeDurations[reportItem.value][subNr] = reportItem;
                            } else if (reportItem.sensorName.endsWith('maintenance') && reportItem.value.toLowerCase() === 'true') {
                                subNr = reportItem.sensorName.split('_')[1];
                                vm.subarrayMaintenanceDurations[subNr] = reportItem;
                            } else if (reportItem.sensorName.search('subarray...state') > -1) {
                                subNr = reportItem.sensorName.split('_')[1];
                                if (!vm.subarrayStateDurations[reportItem.value]) {
                                    vm.subarrayStateDurations[reportItem.value] = {};
                                    vm.subarrayNrs.forEach(function (item) {
                                        vm.subarrayStateDurations[reportItem.value][item] = {};
                                    });
                                }
                                vm.subarrayStateDurations[reportItem.value][subNr] = reportItem;
                            } else if (reportItem.sensorName.search('subarray...band') > -1) {
                                subNr = reportItem.sensorName.split('_')[1];
                                if (!vm.subarrayBandDurations[reportItem.value]) {
                                    vm.subarrayBandDurations[reportItem.value] = {};
                                    vm.subarrayNrs.forEach(function (item) {
                                        vm.subarrayBandDurations[reportItem.value][item] = {};
                                    });
                                }
                                vm.subarrayBandDurations[reportItem.value][subNr] = reportItem;
                            } else if (reportItem.sensorName.search('subarray...product') > -1) {
                                subNr = reportItem.sensorName.split('_')[1];
                                if (!vm.subarrayProductDurations[reportItem.value]) {
                                    vm.subarrayProductDurations[reportItem.value] = {};
                                    vm.subarrayNrs.forEach(function (item) {
                                        vm.subarrayProductDurations[reportItem.value][item] = {};
                                    });
                                }
                                vm.subarrayProductDurations[reportItem.value][subNr] = reportItem;
                            }
                        });
                    }
                    vm.creatingSubarrayReport = false;
                    deferred.resolve();
                }, function (result) {
                    vm.creatingSubarrayReport = false;
                    NotifyService.showSimpleDialog('Error creating report', result.data);
                    $log.error(result);
                    deferred.reject();
                });
                return deferred.promise;
            };

            vm.createReceptorsReport = function (startDate, endDate) {
                var deferred = $q.defer();
                vm.creatingReceptorReport = true;

                DataService.sampleValueDuration(vm.receptorsReportSensorsRegex, startDate, endDate).then(function (result) {
                    vm.creatingReceptorReport = false;
                    if (result.data.data) {
                        result.data.data.map(function (item, itemIndex, data) {
                            if (itemIndex > 0) {
                                data[itemIndex - 1][2] = data[itemIndex][2];
                            }
                        });

                        result.data.data.forEach(function (item, itemIndex, data) {
                            var subNr;

                            var reportItem = {
                                sensorName: item.name,
                                value: item.value,
                                durationSeconds: item.sum !== null? item.sum: 0,
                                duration: vm.durationToString(moment.duration(item.sum, 's'))

                            };
                            if (reportItem.duration) {
                                reportItem.percentageOfTotal = vm.percentageOfTotalToString(reportItem.durationSeconds);
                            }

                            if (reportItem.sensorName.search('katpool.pool.resources..|katpool.resources.faulty|katpool.resources.in.maintenance') > -1 && reportItem.value.length > 0) {
                                var resources = reportItem.value.split(',');
                                var key;
                                if (reportItem.sensorName.endsWith('faulty')) {
                                    key = 'faulty';
                                } else if (reportItem.sensorName.endsWith('in_maintenance')) {
                                    key = 'in_maintenance';
                                } else {
                                    key = _.last(reportItem.sensorName.split('_'));
                                }
                                resources.forEach(function (resource) {
                                    if (!vm.poolResourcesAssignedDurations[resource]) {
                                        vm.poolResourcesAssignedDurations[resource] = {durationTotalSeconds: 0, percentageTotal: '0%', durationTotal: '0:00:00'};
                                        vm.resourceItemColumns.forEach(function (col) {
                                            vm.poolResourcesAssignedDurations[resource][col] = {};
                                        });
                                    }
                                    if (vm.subarrayNrs.indexOf(key) > -1) {
                                        vm.poolResourcesAssignedDurations[resource].durationTotalSeconds += reportItem.durationSeconds;
                                        duration = moment.duration(vm.poolResourcesAssignedDurations[resource].durationTotalSeconds, 's');
                                        vm.poolResourcesAssignedDurations[resource].durationTotal = vm.durationToString(duration);
                                        vm.poolResourcesAssignedDurations[resource].percentageTotal = vm.percentageOfTotalToString(vm.poolResourcesAssignedDurations[resource].durationTotalSeconds);
                                    }

                                      if (vm.poolResourcesAssignedDurations[resource][key]) {
                                          if (!vm.poolResourcesAssignedDurations[resource][key].value) {
                                              vm.poolResourcesAssignedDurations[resource][key] = {
                                                  duration: reportItem.duration,
                                                  durationSeconds: reportItem.durationSeconds,
                                                  percentageOfTotal: vm.percentageOfTotalToString(reportItem.durationSeconds),
                                                  sensorName: reportItem.sensorName,
                                                  value: resource
                                              };
                                          } else {
                                            var existingResourceItem = vm.poolResourcesAssignedDurations[resource][key];
                                            existingResourceItem.durationSeconds += reportItem.durationSeconds;
                                            existingResourceItem.duration = reportItem.duration;
                                            existingResourceItem.percentageOfTotal = vm.percentageOfTotalToString(existingResourceItem.durationSeconds);
                                            vm.poolResourcesAssignedDurations[resource][key] = existingResourceItem;
                                          }
                                     }
                                 });
                            }
                        });
                    }
                    deferred.resolve();
                }, function (result) {
                    vm.creatingReceptorReport = false;
                    NotifyService.showSimpleDialog('Error creating report', result.data.data);
                    $log.error(result);
                    deferred.reject();
                });
                return deferred.promise;
            };

            vm.createScheduleReport = function (startDate, endDate) {
                var deferred = $q.defer();
                vm.creatingScheduleReport = true;

                DataService.sampleValueDuration(vm.scheduleReportSensorsRegex, startDate, endDate).then(function (result) {
                    var SBIdCodes = {};
                    if (result.data.data) {
                        result.data.data.forEach(function (item) {
                            var reportItem = {
                                sensorName: item.name,
                                value: item.value,
                                duration: vm.durationToString(moment.duration(item.sum, 's')),
                                durationSeconds: item.sum
                            };

                            if (reportItem.duration) {
                                reportItem.percentageOfTotal = vm.percentageOfTotalToString(reportItem.durationSeconds);
                            }
                            vm.scheduleReportResults.push(reportItem);
                            if (reportItem.value.length > 0) {
                                reportItem.value.split(',').forEach(function (idCode) {
                                    SBIdCodes[idCode] = true;
                                });
                            }
                        });
                        var SBIdCodesList = Object.keys(SBIdCodes);
                        if (SBIdCodesList.length > 0) {
                            vm.fetchSBDetails(SBIdCodesList);
                        }
                    }
                    vm.creatingScheduleReport = false;
                    deferred.resolve();
                }, function (result) {
                    vm.creatingScheduleReport = false;
                    NotifyService.showSimpleDialog('Error creating report', result.data.data);
                    $log.error(result);
                    deferred.reject();
                });
                return deferred.promise;
            };

            vm.createInterlockReport = function (startDate, endDate) {
                var deferred = $q.defer();
                vm.creatingReceptorReport = true;

                DataService.sampleValueDuration(vm.interlockReportSensorsRegex, startDate, endDate).then(function (result) {
                    vm.creatingInterlockReport = false;
                    if (result.data.data) {
                        result.data.data.forEach(function (item) {
                            var reportItem = {
                                sensorName: item.name,
                                value: item.value,
                                durationSeconds: item.sum !== null? item.sum: 0,
                                duration: vm.durationToString(moment.duration(item.sum, 's'))
                            };
                            if (reportItem.duration) {
                                reportItem.percentageOfTotal = vm.percentageOfTotalToString(reportItem.durationSeconds);
                            }
                            vm.interlockReceptorReportResults[reportItem.value] = reportItem;
                        });
                    }
                    deferred.resolve();
                }, function (result) {
                    vm.creatingInterlockReport = false;
                    NotifyService.showSimpleDialog('Error creating report', result.data.data);
                    $log.error(result);
                    deferred.reject();
                });
                return deferred.promise;
            };

            vm.fetchSBDetails = function (sbIdCodes) {
                ObsSchedService.getScheduleBlockDetails(sbIdCodes).then(function (result) {
                    vm.SBDetails = JSON.parse(result.data.result);
                    var totalDuration = 0;
                    vm.SBDetails.forEach(function (sb) {
                        if (sb.actual_end_time && sb.actual_start_time) {
                            var startSeconds = moment(sb.actual_start_time, MOMENT_DATETIME_FORMAT).unix();
                            var endSeconds = moment(sb.actual_end_time, MOMENT_DATETIME_FORMAT).unix();
                            sb.durationSeconds = Math.abs(endSeconds - startSeconds);
                            var duration = moment.duration(sb.durationSeconds, 's');
                            sb.duration = vm.durationToString(duration);
                            totalDuration += duration;
                            sb.percentageOfTotal = vm.percentageOfTotalToString(sb.durationSeconds);
                            if (sb.antennas_alloc) {
                                sb.n_ants = sb.antennas_alloc.split(",").length;
                            } else {
                                sb.n_ants = 0;
                            }
                        }
                    });
                    vm.totalSBDuration = vm.durationToString(moment.duration(totalDuration));
                });
            };

            vm.durationToString = function (duration) {
                return Math.floor(duration.asHours()) + moment(duration.asMilliseconds()).format(":mm:ss");
            };

            vm.percentageOfTotalToString = function (durationSeconds, totalSeconds) {
                if (totalSeconds === undefined) {
                    totalSeconds = vm.reportTimeWindowSecondsDuration;
                }
                return parseFloat(100 * durationSeconds / totalSeconds).toFixed(2) + '%';
            };

            vm.afterInit = function() {
                ConfigService.getSystemConfig().then(function (systemConfig) {
                    vm.subarrayNrs = systemConfig.system.subarray_nrs.split(',');

                    var startTimeParam = moment($stateParams.startTime, MOMENT_DATETIME_FORMAT, true);
                    var endTimeParam = moment($stateParams.startTime, MOMENT_DATETIME_FORMAT, true);
                    if (startTimeParam.isValid() && endTimeParam.isValid()) {
                        vm.startTime = startTimeParam.toDate();
                        vm.endTime = endTimeParam.toDate();
                        vm.startDatetimeReadable = $stateParams.startTime;
                        vm.endDatetimeReadable = $stateParams.endTime;
                        vm.createReport();
                    } else if ($stateParams.startTime && $stateParams.endTime) {
                        NotifyService.showSimpleDialog('Invalid Datetime URL Parameters',
                            'Invalid datetime strings: ' + $stateParams.startTime + ' or ' + $stateParams.endTime + '. Format should be ' + MOMENT_DATETIME_FORMAT);
                    }
                });
            };

            if ($rootScope.currentUser) {
                vm.afterInit();
            } else {
                vm.unbindLoginSuccess = $rootScope.$on('loginSuccess', vm.afterInit);
            }

            $scope.$on('$destroy', function () {
                if (vm.unbindLoginSuccess) {
                    vm.unbindLoginSuccess();
                }
            });
        }
})();
