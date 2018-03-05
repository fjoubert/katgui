(function() {

    angular.module('katGui.services')
        .service('ObsSchedService', ObsSchedService);

    function ObsSchedService($rootScope, $http, ConfigService, KatGuiUtil,
        UserLogService, $log, $q, $mdDialog, NotifyService,
        $timeout, $interval, $localStorage) {

        function urlBase() {
            return $rootScope.portalUrl ? $rootScope.portalUrl + '/katcontrol' : '';
        }
        var api = {};
        if (!$localStorage.lastKnownSubarrayConfig) {
            $localStorage.lastKnownSubarrayConfig = {};
        }
        api.lastKnownSubarrayConfig = $localStorage.lastKnownSubarrayConfig;
        api.scheduleDraftData = [];
        api.scheduleCompletedData = [];
        api.programBlocks = [];
        api.subarrays = [];
        api.poolResourcesFree = [];
        api.configLabels = [];
        api.resourceTemplates = [];
        api.observationSchedule = [];
        api.scheduleData = [];
        api.guiUrls = {};
        api.draftArrayStates = ['DRAFT', 'DEFINED', 'APPROVED'];
        api.sensorValues = {};

        api.handleRequestResponse = function(request, defer) {
            var deferred;
            if (defer) {
                deferred = $q.defer();
            }
            request
                .then(function(result) {
                    if (!result.data.error) {
                        var message = KatGuiUtil.sanitizeKATCPMessage(result.data.result);
                        if (result.data.result.split(' ')[1] === 'ok') {
                            if (deferred) {
                                deferred.resolve();
                            }
                            NotifyService.showSimpleToast(message);
                        } else {
                            if (deferred) {
                                deferred.reject();
                            }
                            NotifyService.showPreDialog('Error Processing Request', message);
                        }
                    } else {
                        if (deferred) {
                            deferred.reject();
                        }
                        NotifyService.showPreDialog('Error Processing Request', result.data.error);
                    }
                }, function(error) {
                    if (deferred) {
                        deferred.resolve(false);
                    }
                    NotifyService.showHttpErrorDialog('Error sending request', error);
                });
            if (deferred) {
                return deferred.promise;
            }
        };

        api.markResourceFaulty = function(resource, faulty) {
            api.handleRequestResponse($http(createRequest('post', urlBase() + '/resource/' + resource + '/faulty/' + faulty)));
            if (faulty === 'set') {
                var tags = UserLogService.tags.filter(function(item) {
                    return item.name === 'status' || item.name === resource;
                });
                var content = 'Marking resource ' + resource + ' as faulty.';
                var newlog = {
                    start_time: $rootScope.utcDateTime,
                    end_time: '',
                    tags: tags,
                    user_id: $rootScope.currentUser.id,
                    content: content
                };
                UserLogService.editUserLog(newlog, true);
            }
        };

        api.markResourceInMaintenance = function(resource, maintenance) {
            api.handleRequestResponse($http(createRequest('post', urlBase() + '/resource/' + resource + '/maintenance/' + maintenance)));

            if (maintenance === 'set') {
                var tags = UserLogService.tags.filter(function(item) {
                    return item.name === 'maintenance' || item.name === resource;
                });
                var content = 'Setting resource ' + resource + ' in maintenance.';
                var newlog = {
                    start_time: $rootScope.utcDateTime,
                    end_time: '',
                    tags: tags,
                    user_id: $rootScope.currentUser.id,
                    content: content
                };
                UserLogService.editUserLog(newlog, true);
            }
        };

        api.restartMaintenanceDevice = function(sub_nr, resourceName, device) {
            api.handleRequestResponse($http(createRequest('post', urlBase() + '/subarray/' + sub_nr + '/resource/' + resourceName + '/device/' + device + '/restart')));
        };

        api.listResourceMaintenanceDevices = function(resourceName) {
            return $http(createRequest('get', urlBase() + '/resource/' + resourceName + '/maintenance-device-list'));
        };

        api.deleteScheduleDraft = function(id) {
            $http(createRequest('post', urlBase() + '/sb/' + id + '/delete')).then(function(result) {
                if (result.data.error) {
                    NotifyService.showSimpleDialog('Error deleting Schedule Block', result.data.error);
                } else {
                    NotifyService.showSimpleToast(result.data.result);
                }
            }, function(error) {
                NotifyService.showHttpErrorDialog('Error sending request', error.data.message);
            });
        };

        api.deleteProgramBlock = function(pb, orphanSBs) {
            var orphanDialogText = orphanSBs? " and orphan it's uncompleted Schedule Blocks?" : " and all it's uncompleted Schedule Blocks?";
            NotifyService.showImportantConfirmDialog(
                null, 'Delete Program Block?', 'Are you sure you want to delete ' + pb.pb_id + orphanDialogText, 'Yes', 'Cancel').then(function() {
                var deleteUrl = urlBase() + '/pb/' + pb.pb_id;
                if (orphanSBs) {
                    deleteUrl += '?orphan_sbs=1';
                }
                $http(createRequest('delete', deleteUrl)).then(function(result) {
                    if (result.data.result.pb_error) {
                        NotifyService.showSimpleDialog('Error deleting Program Block', result.data.result);
                    } else {
                        NotifyService.showSimpleToast(result.data.result);
                    }
                }, function(error) {
                    NotifyService.showHttpErrorDialog('Error sending request', error.data.message);
                });
            });
        };

        api.scheduleDraft = function(sub_nr, id) {
            api.handleRequestResponse($http(createRequest('post', urlBase() + '/sb/' + sub_nr + '/' + id + '/schedule')));
        };

        api.scheduleToApproved = function(sub_nr, id_code) {
            api.handleRequestResponse($http(createRequest('post', urlBase() + '/sb/' + sub_nr + '/' + id_code + '/to-approved')));
        };

        api.scheduleToComplete = function(sub_nr, id_code) {
            api.handleRequestResponse($http(createRequest('post', urlBase() + '/sb/' + sub_nr + '/' + id_code + '/complete')));
        };

        api.verifyScheduleBlock = function(sub_nr, id_code) {
            api.handleRequestResponse($http(createRequest('post', urlBase() + '/sb/' + sub_nr + '/' + id_code + '/verify')));
        };

        api.executeSchedule = function(sub_nr, id_code) {
            api.handleRequestResponse($http(createRequest('post', urlBase() + '/sb/' + sub_nr + '/' + id_code + '/execute')));
        };

        api.stopSchedule = function(sub_nr, id_code) {
            NotifyService.showImportantConfirmDialog(null, 'Stop Executing Schedule', 'Are you sure you want to stop executing ' + id_code + '?', 'Yes', 'Cancel').then(function() {
                api.handleRequestResponse($http(createRequest('post', urlBase() + '/sb/' + sub_nr + '/' + id_code + '/stop')));
            }, function() {
                NotifyService.showSimpleToast('Cancelled stop executing ' + id_code);
            });
        };

        api.cancelExecuteSchedule = function(sub_nr, id_code) {
            api.handleRequestResponse($http(createRequest('post', urlBase() + '/sb/' + sub_nr + '/' + id_code + '/cancel-execute')));
        };

        api.updateScheduleBlockWithProgramBlockID = function(sb, pb) {
            var body = {};
            if (pb && pb.pb_id) {
                body = {
                    pb_id: pb.pb_id
                };
            }
            return $http(createRequest('post', urlBase() + '/sb/' + sb.id_code + '/update-pb-id', body));
        };

        api.cloneSBIntoPB = function(sb, pb) {
            return $http(createRequest('post', urlBase() + '/sb/' + sb.id_code + '/clone', {
                pb_id: pb.pb_id
            }));
        };

        api.cloneSB = function(id_code) {
            return $http(createRequest('post', urlBase() + '/sb/' + id_code + '/clone'));
        };

        api.clonePB = function(pb, cloneSBs) {
            return $http(createRequest('post', urlBase() + '/pb/' + pb.pb_id + '/clone/' + (cloneSBs ? '1' : '0')));
        };

        api.cloneAndAssignSB = function(id_code, sub_nr) {
            api.cloneSB(id_code).then(function(result) {
                if (result.data.result) {
                    api.assignScheduleBlock(sub_nr, result.data.result.id_code);
                } else {
                    NotifyService.showPreDialog('Error Processing Request', 'Could not clone schedule block.');
                }
            }, function(error) {
                NotifyService.showHttpErrorDialog('Error sending request', error);
            });
        };

        api.cloneAndScheduleSB = function(id_code, sub_nr) {
            api.cloneSB(id_code).then(function(result) {
                if (result.data.result) {
                    api.scheduleDraft(sub_nr, result.data.result.id_code);
                } else {
                    NotifyService.showPreDialog('Error Processing Request', 'Could not clone and assign schedule block.');
                }
            }, function(error) {
                NotifyService.showHttpErrorDialog('Error sending request', error);
            });
        };

        api.assignScheduleBlock = function(sub_nr, id_code) {
            return api.handleRequestResponse($http(createRequest('post', urlBase() + '/sb/' + sub_nr + '/' + id_code + '/assign')), true);
        };

        api.unassignScheduleBlock = function(sub_nr, id_code) {
            api.handleRequestResponse($http(createRequest('post', urlBase() + '/sb/' + sub_nr + '/' + id_code + '/unassign')));
        };

        api.assignResourcesToSubarray = function(sub_nr, resources) {
            return api.handleRequestResponse($http(createRequest('post', urlBase() + '/subarray/' + sub_nr + '/assign-resource/' + resources)), true);
        };

        api.unassignResourcesFromSubarray = function(sub_nr, resources) {
            api.handleRequestResponse($http(createRequest('post', urlBase() + '/subarray/' + sub_nr + '/unassign-resource/' + resources)));
        };

        api.activateSubarray = function(sub_nr) {
            return $http(createRequest('post', urlBase() + '/subarray/' + sub_nr + '/activate'), true);
        };

        api.setSubarrayMaintenance = function(sub_nr, maintenance) {
            api.handleRequestResponse($http(createRequest('post', urlBase() + '/subarray/' + sub_nr + '/maintenance/' + maintenance)));
        };

        api.freeSubarray = function(sub_nr) {
            return api.handleRequestResponse($http(createRequest('post', urlBase() + '/subarray/' + sub_nr + '/free')), true);
        };

        api.getScheduleBlocks = function() {
            //TODO smoothly combine the existing list with the new list so that there isnt a screen flicker
            api.scheduleDraftData.splice(0, api.scheduleDraftData.length);
            $http(createRequest('get', urlBase() + '/sb/approved'))
                .then(function(result) {
                    var jsonResult = JSON.parse(result.data.result);
                    for (var i in jsonResult) {
                        if (api.draftArrayStates.indexOf(jsonResult[i].state) > -1) {
                            api.scheduleDraftData.push(jsonResult[i]);
                        }
                    }
                }, function(error) {
                    $log.error(error);
                });
        };

        api.getProgramBlocks = function() {
            var deferred = $q.defer();
            $http(createRequest('get', urlBase() + '/pb'))
                .then(function(result) {
                    var jsonResult = JSON.parse(result.data.result);
                    var newPBIds = [];
                    for (var i in jsonResult) {
                        var existingPBIndex = _.findIndex(api.programBlocks, {
                            pb_id: jsonResult[i].pb_id
                        });
                        if (existingPBIndex > -1) {
                            //Update existing program blocks
                            api.programBlocks.splice(existingPBIndex, 1);
                        }
                        api.programBlocks.push(jsonResult[i]);
                        newPBIds.push(jsonResult[i].pb_id);
                    }
                    //Remove old program blocks that has had a state change
                    var existingPBIDs = api.programBlocks.map(function(pb) {
                        return pb.pb_id;
                    });
                    var PBIDsToRemove = _.difference(existingPBIDs, newPBIds);
                    PBIDsToRemove.forEach(function(pbID) {
                        var existingPBIndex = _.findIndex(api.programBlocks, function(pb) {
                            return pb.pb_id === pbID;
                        });
                        if (existingPBIndex > -1) {
                            api.programBlocks.splice(existingPBIndex, 1);
                        }
                    });

                    deferred.resolve(api.programBlocks);
                }, function(error) {
                    $log.error(error);
                    deferred.reject(error);
                });
            return deferred.promise;
        };

        api.getScheduleBlockDetails = function(idCodes) {
            return $http(createRequest('post',
                urlBase() + '/sb/details', {
                    id_codes: idCodes.join(',')
                }));
        };

        api.getProgramBlocksObservationSchedule = function() {
            var deferred = $q.defer();
            $http(createRequest('get', urlBase() + '/pb/observation-schedule'))
                .then(function(result) {
                    var activeSBsProgress = {};
                    // retain progress meter for active sb's
                    api.observationSchedule.forEach(function (pb) {
                        pb.schedule_blocks.forEach(function (sb) {
                            if (sb.state === 'ACTIVE') {
                                activeSBsProgress[sb.id_code] = sb.progress;
                            }
                        });
                    });
                    api.observationSchedule.splice(0, api.observationSchedule.length);
                    var jsonResult = JSON.parse(result.data.result);
                    jsonResult.forEach(function(jsonItem) {
                        if (jsonItem.schedule_blocks) {
                            jsonItem.schedule_blocks.forEach(function (sb) {
                                if (sb.queue_position && sb.queue_position.length > 0) {
                                    // attempt parsing this field, but don't spaz if it doesn't parse
                                    // it could mean that the auto scheduler has never ran on this sb
                                    try {
                                        sb.queue_position = JSON.parse(sb.queue_position);
                                    } catch (error) {
                                        $log.error(error);
                                    }
                                }
                                sb.progress = activeSBsProgress[sb.id_code];
                            });
                        }
                        api.observationSchedule.push(jsonItem);
                    });
                    api.populateObservationPbExpectedDurations();
                    deferred.resolve(api.observationSchedule);
                }, function(error) {
                    $log.error(error);
                    deferred.reject(error);
                });
            return deferred.promise;
        };

        api.populateObservationPbExpectedDurations = function() {
            api.observationSchedule.forEach(function(pb) {
                pb.expected_duration_seconds = 0;
                pb.schedule_blocks.forEach(function (sb) {
                    if (sb.expected_duration_seconds) {
                        pb.expected_duration_seconds += sb.expected_duration_seconds;
                    }
                });
                if (pb.expected_duration_seconds) {
                    var momentDuration = moment.duration(pb.expected_duration_seconds, 'seconds');
                    var durationHours = Math.floor(momentDuration.asHours()).toString().padStart(2, 0);
                    var durationMinutes = momentDuration.minutes().toString().padStart(2, 0);
                    var durationSeconds = momentDuration.seconds().toString().padStart(2, 0);
                    pb.expectedDuration = durationHours + ':' + durationMinutes + ':' + durationSeconds;
                }
            });
        };

        api.throttleGetProgramBlocksObservationSchedule = _.throttle(api.getProgramBlocksObservationSchedule, 300);

        api.getCompletedScheduleBlocks = function(sub_nr, max_nr) {
            //TODO smoothly combine the existing list with the new list so that there isnt a screen flicker
            api.scheduleCompletedData.splice(0, api.scheduleCompletedData.length);
            $http(createRequest('get', urlBase() + '/sb/completed/' + sub_nr + '/' + max_nr))
                .then(function(result) {
                    var jsonResult = JSON.parse(result.data.result);
                    for (var i in jsonResult) {
                        api.scheduleCompletedData.push(jsonResult[i]);
                    }
                }, function(error) {
                    $log.error(error);
                });
        };

        api.setSchedulerModeForSubarray = function(sub_nr, mode) {
            api.handleRequestResponse($http(createRequest('post', urlBase() + '/subarray/' + sub_nr + '/sched-mode/' + mode)));
        };

        api.updateScheduleDraft = function(scheduleBlockDraft) {
            return $http(createRequest('post', urlBase() + '/sb/' + scheduleBlockDraft.id_code, {
                id_code: scheduleBlockDraft.id_code,
                type: scheduleBlockDraft.type,
                instruction_set: scheduleBlockDraft.instruction_set,
                description: scheduleBlockDraft.description,
                desired_start_time: scheduleBlockDraft.desired_start_time
            }));
        };

        api.receivedResourceMessage = function(sensor) {
            var sensorName = sensor.name;

            if (sensorName.startsWith('subarray_')) {
                var subarrayIndex = _.findIndex(api.subarrays, function(item) {
                    return item.id === sensorName.split('_')[1];
                });
                if (subarrayIndex > -1) {
                    var trimmedSensorName = sensorName.replace('subarray_' + api.subarrays[subarrayIndex].id + '_', '');
                    if (sensorName.endsWith('allocations')) {
                        api.sensorValues[sensorName].parsedValue = sensor.value !== "" ? JSON.parse(sensor.value) : [];
                    } else if (sensorName.endsWith('delegated_ca')) {
                        api.subarrays[subarrayIndex][trimmedSensorName] = sensor.value;
                        var iAmCA;
                        for (var idx in api.subarrays) {
                            if (api.subarrays[idx]['delegated_ca'] === $rootScope.currentUser.email) {
                                iAmCA = true;
                            }
                        }
                        $rootScope.iAmCA = iAmCA && $rootScope.currentUser.req_role === 'control_authority';
                    } else if (sensorName.endsWith('dump_rate')) {
                        api.subarrays[subarrayIndex][trimmedSensorName] = sensor.value;
                        api.subarrays[subarrayIndex][trimmedSensorName + '_seconds'] = Math.round(1e2 / sensor.value) / 1e2;
                    } else {
                        api.subarrays[subarrayIndex][trimmedSensorName] = sensor.value;
                        if (sensorName.endsWith('state')) {
                            //wait a while to make sure on initial load that we get all the subarray sensor values
                            $timeout(function() {
                                if (api.subarrays[subarrayIndex].state !== 'inactive') {
                                    $localStorage.lastKnownSubarrayConfig[api.subarrays[subarrayIndex].name] = {
                                        allocations: api.sensorValues[api.subarrays[subarrayIndex].name + '_allocations'].parsedValue.map(
                                            function(resource) {
                                                return resource[0];
                                            }).join(","),
                                        band: api.subarrays[subarrayIndex].band,
                                        product: api.subarrays[subarrayIndex].product,
                                        dump_rate: api.subarrays[subarrayIndex].dump_rate
                                    };
                                }
                            }, 1000);
                        }
                    }
                } else {
                    $log.error('Unknown subarray sensor value: ');
                    $log.error(sensor.value);
                }
            } else if (sensorName.endsWith('pool_resources_free')) {
                api.poolResourcesFree.splice(0, api.poolResourcesFree.length);
                var resourcesList = sensor.value.split(',');
                resourcesList.forEach(function(resourceName) {
                    api.poolResourcesFree.push({
                        name: resourceName
                    });
                });
            } else if (sensorName.indexOf('mode_') > -1) {
                var subarrayId = sensorName.split('_')[2];
                var subarray = _.findWhere(api.subarrays, {
                    id: subarrayId
                });
                if (subarray) {
                    subarray.mode = sensor.value;
                }
            }
        };

        api.guiUrlsMessageReceived = function(sensor) {
            // matches something like ptuse_1_gui_urls or m011_gui_urls
            // and returns ptuse_1 or m011 respectively
            // `match` returns null if there is no match, otherwise a list of results
            var resourceNameMatches = sensor.name.match(/^[a-z]+_\d|^[a-z]+_/);
            if (resourceNameMatches && sensor.value) {
                var newUrls = JSON.parse(sensor.value);
                if (!api.guiUrls[resourceNameMatches[0]]) {
                    api.guiUrls[resourceNameMatches[0]] = [];
                }
                api.guiUrls[resourceNameMatches[0]] = api.guiUrls[resourceNameMatches[0]].concat(newUrls);
            }
        };

        api.receivedScheduleMessage = function(message) {
            var obj = message.value;
            var commandList = message.command.split(' ');
            var table = commandList[0];
            var action = commandList[1];
            var id_to_action = commandList[2];
            if (table === 'schedule_block') {
                api.receivedSBMessage(obj, action, id_to_action);
            } else {
                api.receivedPBMessage(obj, action, id_to_action);
            }
            api.debounceRootScopeSafeDigest();
        };

        api.receivedPBMessage = function(pb, action, id_to_action) {
            var pbDataToAdd = [];
            var orderChangeCall = false;

            if (action === 'delete') {
                var obsIndex = _.findLastIndex(api.observationSchedule, {
                    id: parseInt(id_to_action)
                });
                if (obsIndex > -1) {
                    api.observationSchedule.splice(obsIndex, 1);
                    orderChangeCall = true;
                }

                var index = _.findLastIndex(api.programBlocks, {
                    id: parseInt(id_to_action)
                });
                if (index > -1) {
                    NotifyService.showSimpleToast('PB ' + api.programBlocks[index].pb_id + ' has been removed');
                    api.programBlocks.splice(index, 1);
                }
            } else if (action === 'update') {
                var pbObsIndex = _.findLastIndex(api.observationSchedule, {
                    id: pb.id
                });
                if (pbObsIndex > -1) {
                    pb.schedule_blocks = api.observationSchedule[pbObsIndex].schedule_blocks;
                    pb.sub_nr = api.observationSchedule[pbObsIndex].sub_nr;
                    api.observationSchedule[pbObsIndex] = pb;
                    orderChangeCall = true;
                }

                var pbIndex = _.findLastIndex(api.programBlocks, {
                    id: pb.id
                });
                if (pbIndex > -1) {
                    pb.schedule_blocks = api.programBlocks[pbIndex].schedule_blocks;
                    api.programBlocks[pbIndex] = pb;
                } else {
                    api.programBlocks.push(pb);
                }
            } else if (action === 'insert') {
                orderChangeCall = true;
                api.programBlocks.push(pb);
                NotifyService.showSimpleToast('PB ' + pb.pb_id + ' has been added.');
            } else {
                $log.error('Dangling ObsSchedService ' + action + ' message for:');
                $log.error(pb);
            }
            if (orderChangeCall) {
                api.throttleGetProgramBlocksObservationSchedule();
            } else {
                api.populateObservationPbExpectedDurations();
            }
        };

        api.updateProgramBlocksWithUpdatedSb = function(sb) {
            if (sb.pb_id) {
                var pbIndex = _.findLastIndex(api.programBlocks, {
                    id: sb.pb_id
                });
                if (pbIndex > -1) {
                    //SB could've moved from one pb to another
                    var sbProgress = null;
                    api.programBlocks.forEach(function(pb, existingIndex) {
                        var sbIndex = _.findLastIndex(pb.schedule_blocks, {
                            id: sb.id
                        });
                        if (sbIndex > -1) {
                            sbProgress = pb.schedule_blocks[sbIndex].progress;
                            api.programBlocks[existingIndex].schedule_blocks.splice(sbIndex, 1);
                        }
                    });
                    if (!sb.deleted) {
                        sb.progress = sbProgress;
                        api.programBlocks[pbIndex].schedule_blocks.push(sb);
                    }
                } else {
                    $log.warn('Trying to update program blocks with sb.pb_id: ' + sb.pb_id +
                        ', but could not find any program blocks with that id!');
                }
            } else if (!sb.pb_id) {
                api.programBlocks.forEach(function(pb) {
                    var sbIndex = _.findLastIndex(pb.schedule_blocks, {
                        id: sb.id
                    });
                    if (sbIndex > -1) {
                        pb.schedule_blocks.splice(sbIndex, 1);
                    }
                });
            }
        };

        api.receivedSBMessage = function(sb, action, id_to_action) {
            var scheduleDataToAdd = [];
            var draftDataToAdd = [];
            var completedDataToAdd = [];
            var orderChangeCall = false;
            if (sb.queue_position && sb.queue_position.length > 0) {
                // attempt parsing this field, but don't spaz if it doesn't parse
                // it could mean that the auto scheduler has never ran on this sb
                try {
                    sb.queue_position = JSON.parse(sb.queue_position);
                } catch (error) {
                    $log.error(error);
                }
            }

            if (action === 'delete') {
                //only drafts can be deleted in the db
                var index = _.findLastIndex(api.scheduleDraftData, {
                    id: parseInt(id_to_action)
                });
                if (index > -1) {
                    NotifyService.showSimpleToast('SB ' + api.scheduleDraftData[index].id_code + ' has been removed');
                    if (api.scheduleDraftData[index].pb_id) {
                        api.scheduleDraftData[index].deleted = true;
                        api.updateProgramBlocksWithUpdatedSb(api.scheduleDraftData[index]);
                    }
                    api.scheduleDraftData.splice(index, 1);
                }
            } else if (action === 'update') {
                var draftIndex = _.findLastIndex(api.scheduleDraftData, {
                    id: sb.id
                });
                var scheduledIndex = _.findLastIndex(api.scheduleData, {
                    id: sb.id
                });

                if (api.draftArrayStates.indexOf(sb.state) > -1) {
                    if (draftIndex > -1) {
                        api.scheduleDraftData[draftIndex] = sb;
                    } else if (draftIndex === -1) {
                        //sb needs to be moved from scheduled to drafts
                        if (scheduledIndex > -1) {
                            api.scheduleData.splice(scheduledIndex, 1);
                            $rootScope.$emit('sb_schedule_remove', sb);
                            orderChangeCall = true;
                        }
                        draftDataToAdd.push(sb);
                        orderChangeCall = true;
                    }

                } else if (sb.state === 'SCHEDULED' || sb.state === 'ACTIVE') {
                    if (scheduledIndex > -1) {
                        api.scheduleData[scheduledIndex] = sb;
                        $rootScope.$emit('sb_schedule_update', sb);

                    } else if (scheduledIndex === -1 && draftIndex > -1) {
                        api.scheduleDraftData.splice(draftIndex, 1);
                    }
                    // always call order change when this happens
                    // because it means that the states of sb's changed
                    orderChangeCall = true;
                } else {
                    var completedIndex = _.findLastIndex(api.scheduleCompletedData, {
                        id: sb.id
                    });
                    if (completedIndex > -1) {
                        api.scheduleCompletedData[completedIndex] = sb;
                    } else if (scheduledIndex > -1) {
                        api.scheduleData.splice(scheduledIndex, 1);
                        completedDataToAdd.push(sb);
                        orderChangeCall = true;
                    } else if (draftIndex > -1) {
                        api.scheduleDraftData.splice(draftIndex, 1);
                        completedDataToAdd.push(sb);
                    } else {
                        completedDataToAdd.push(sb);
                    }
                    orderChangeCall = true;
                }
                api.updateProgramBlocksWithUpdatedSb(sb);
            } else if (action === 'insert') {
                if (api.draftArrayStates.indexOf(sb.state) > -1) {
                    draftDataToAdd.push(sb);
                } else if (sb.state === 'ACTIVE' || sb.state === 'SCHEDULED') {
                    scheduleDataToAdd.push(sb);
                    $rootScope.$emit('sb_schedule_insert', sb);
                } else {
                    completedDataToAdd.push(sb);
                }
                if (sb.pb_id) {
                    api.updateProgramBlocksWithUpdatedSb(sb);
                }
                NotifyService.showSimpleToast('SB ' + sb.id_code + ' has been added.');
            } else {
                $log.error('Dangling ObsSchedService ' + action + ' message for:');
                $log.error(sb);
            }

            if (scheduleDataToAdd.length) {
                Array.prototype.push.apply(api.scheduleData, scheduleDataToAdd);
            }
            if (draftDataToAdd.length) {
                Array.prototype.push.apply(api.scheduleDraftData, draftDataToAdd);
            }
            if (completedDataToAdd.length) {
                Array.prototype.push.apply(api.scheduleCompletedData, completedDataToAdd);
            }
            if (orderChangeCall) {
                api.throttleGetProgramBlocksObservationSchedule();
            } else {
                api.populateObservationPbExpectedDurations();
            }
        };

        api.debounceRootScopeSafeDigest = _.debounce(rootScopeSafeDigest, 1000);

        function rootScopeSafeDigest() {
            if (!$rootScope.$$phase) {
                $rootScope.$digest();
            }
        }

        api.listConfigLabels = function() {
            api.configLabels.splice(0, api.configLabels.length);
            $http(createRequest('get', urlBase() + '/config-labels'))
                .then(function(result) {
                    var configLabels = JSON.parse(result.data);
                    configLabels.forEach(function(item) {
                        api.configLabels.push(item);
                    });
                }, function(error) {
                    $log.error(error);
                });
        };

        api.setConfigLabel = function(sub_nr, config_label) {
            api.handleRequestResponse($http(createRequest('post', urlBase() + '/config-labels/' + sub_nr + '/' + config_label)));
        };

        api.setBand = function(sub_nr, band) {
            api.handleRequestResponse($http(createRequest('post', urlBase() + '/bands/' + sub_nr + '/' + band)));
        };

        api.setProduct = function(sub_nr, product, dumpRate) {
            api.handleRequestResponse(
                $http(createRequest('post', urlBase() + '/product/' + sub_nr, {
                    product: product,
                    dump_rate: dumpRate
                })));
        };

        api.delegateControl = function(sub_nr, userName) {
            api.handleRequestResponse($http(createRequest('post', urlBase() + '/subarray/' + sub_nr + '/delegate-control/' + userName)));
        };

        api.viewTaskLogForSBIdCode = function(id_code, mode) {
            if (ConfigService.GetKATTaskFileServerURL()) {
                window.open(ConfigService.GetKATTaskFileServerURL() + "/tailtask/" + id_code + "/" + mode).focus();
            } else {
                NotifyService.showSimpleDialog('Error Viewing Progress', 'There is no KATTaskFileServer IP defined in config, please contact CAM support.');
            }
        };

        api.showSubarrayLogs = function(sub_nr) {
            $rootScope.openKibanaInNewTab('kat.subarray_' + sub_nr);
        };

        api.showResourceLogs = function(resourceName) {
            $rootScope.openKibanaInNewTab('kat.' + resourceName);
        };

        api.listResourceMaintenanceDevicesDialog = function(sub_nr, resourceName, event) {
            $mdDialog
                .show({
                    controller: function($rootScope, $scope, $mdDialog) {
                        $scope.title = 'Select a device in ' + resourceName + ' to restart';
                        $scope.devices = [];
                        api.listResourceMaintenanceDevices(resourceName)
                            .then(function(result) {
                                var resultList = JSON.parse(result.data.result.replace(/\"/g, '').replace(/\'/g, '"'));
                                for (var i in resultList) {
                                    $scope.devices.push(resultList[i]);
                                }
                            }, function(error) {
                                $log.error(error);
                            });

                        $scope.hide = function() {
                            $mdDialog.hide();
                        };
                        $scope.restartMaintenanceDevice = function(device) {
                            api.restartMaintenanceDevice(sub_nr, resourceName, device);
                        };
                    },
                    template: [
                        '<md-dialog style="padding: 0;" md-theme="{{$root.themePrimary}}">',
                        '<div style="padding: 0; margin: 0; overflow: auto" layout="column">',
                        '<md-toolbar class="md-primary" layout="row" layout-align="center center">',
                        '<span flex style="margin: 16px;">{{::title}}</span>',
                        '</md-toolbar>',
                        '<div flex layout="column">',
                        '<div layout="row" layout-align="center center" ng-repeat="device in devices track by $index">',
                        '<md-button style="margin: 0" flex title="Restart {{device}} Device"',
                        'ng-click="restartMaintenanceDevice(device); $event.stopPropagation()">',
                        '<span style="margin-right: 8px;" class="fa fa-refresh"></span>',
                        '<span>{{device}}</span>',
                        '</md-button>',
                        '</div>',
                        '</div>',
                        '<div layout="row" layout-align="end" style="margin-top: 8px; margin-right: 8px; margin-bottom: 8px; min-height: 40px;">',
                        '<md-button style="margin-left: 8px;" class="md-primary md-raised" md-theme="{{$root.themePrimaryButtons}}" aria-label="OK" ng-click="hide()">Close</md-button>',
                        '</div>',
                        '</div>',
                        '</md-dialog>'
                    ].join(''),
                    targetEvent: event
                });
        };

        api.listResourceTemplates = function() {
            api.resourceTemplates.splice(0, api.resourceTemplates.length);
            $http.get(urlBase() + '/subarray/template/list')
                .then(function(result) {
                    result.data.forEach(function(item) {
                        api.resourceTemplates.push(item);
                    });
                }, function(error) {
                    $log.error(error);
                });
        };

        api.loadResourceTemplate = function(subarray, template) {
            if (ConfigService.systemConfig.system.bands.indexOf(template.band) === -1) {
                $log.error('Could not set band ' + template.band + '.');
            } else if (subarray.band !== template.band) {
                api.setBand(subarray.id, template.band);
            }

            if (subarray.product !== template.product) {
                api.setProduct(subarray.id, template.product);
            }

            api.assignResourcesToSubarray(subarray.id, template.resources);
        };

        api.addResourceTemplate = function(template) {
            $http(createRequest('post',
                    urlBase() + '/subarray/template/add', {
                        name: template.name,
                        owner: $rootScope.currentUser.email,
                        resources: template.resources,
                        band: template.band,
                        product: template.product
                    }))
                .then(function(result) {
                    api.resourceTemplates.push(result.data);
                    NotifyService.showSimpleToast("Created resource template");
                }, function(error) {
                    NotifyService.showHttpErrorDialog('Error creating resource template', error);
                });
        };

        api.modifyResourceTemplate = function(template) {
            $http(createRequest('post',
                    urlBase() + '/subarray/template/modify/' + template.id, {
                        name: template.name,
                        owner: $rootScope.currentUser.email,
                        resources: template.resources,
                        band: template.band,
                        product: template.product,
                        activated: template.activated
                    }))
                .then(function(result) {
                    var oldResource = _.findWhere(api.resourceTemplates, {
                        id: template.id
                    });
                    oldResource = result.data;
                    NotifyService.showSimpleToast("Modified resource template");
                }, function(error) {
                    NotifyService.showHttpErrorDialog('Error modifying resource template', error);
                });
        };

        api.sbProgress = function(sb) {
            var startDate = moment.utc(sb.actual_start_time);
            var startDateTime = startDate.toDate().getTime();
            var endDate = moment.utc(startDate).add(sb.expected_duration_seconds, 'seconds');
            var now = moment.utc(new Date());
            return (now.toDate().getTime() - startDateTime) / (endDate.toDate().getTime() - startDateTime) * 100;
        };

        api.getLastKnownSubarrayConfig = function(subarrayNumber) {
            api.lastKnownSubarrayConfig['subarray_' + subarrayNumber] = $localStorage.lastKnownSubarrayConfig['subarray_' + subarrayNumber];
            return api.lastKnownSubarrayConfig['subarray_' + subarrayNumber];
        };

        api.loadLastKnownSubarrayConfig = function(subarrayNumber) {
            var lastKnownConfig = $localStorage.lastKnownSubarrayConfig['subarray_' + subarrayNumber];
            if (lastKnownConfig) {
                var subarray = _.find(api.subarrays, function(item) {
                    return item.id === subarrayNumber;
                });
                if (lastKnownConfig.allocations) {
                    var currentAllocationsSensor = api.sensorValues[api.subarrays[subarrayNumber - 1].name + '_allocations'];
                    var currentAllocations = currentAllocationsSensor.parsedValue.map(function(resourceAlloc) {
                        return resourceAlloc[0];
                    });
                    var resourcesToAllocate = lastKnownConfig.allocations.split(',');
                    var resourcesGoingToAllocate = _.difference(resourcesToAllocate, currentAllocations);
                    if (resourcesGoingToAllocate.length > 0) {
                        api.assignResourcesToSubarray(subarrayNumber, resourcesGoingToAllocate.join(','));
                    }
                }
                if (subarray.band !== lastKnownConfig.band) {
                    api.setBand(subarrayNumber, lastKnownConfig.band);
                }
                if (lastKnownConfig.dump_rate) {
                    api.setProduct(subarrayNumber, lastKnownConfig.product ? lastKnownConfig.product : '', lastKnownConfig.dump_rate);
                } else if (subarray.product !== lastKnownConfig.product) {
                    api.setProduct(subarrayNumber, lastKnownConfig.product);
                }
            }
        };

        api.setupSubarrayFromPB = function(subarrayNumber, pb_id, assignOnly, event) {
            var postUrl = urlBase() + '/subarray/' + subarrayNumber + '/setup/' + pb_id;
            if (assignOnly) {
                postUrl += '?assign_only=1';
            }
            $http(createRequest('post', postUrl))
                .then(function(result) {
                    NotifyService.showSetupSubarrayDialog(
                        event, "Setup Subarray " + subarrayNumber + " results", result.data.results, subarrayNumber);
                }, function(error) {
                    $log.info(error);
                    NotifyService.showHttpErrorDialog('Error setting up subarray from PB', error);
                });
        };

        api.updateSBOrderingValues = function(id_code, lead_operator_priority, sb_order, sb_sequence) {
            return $http(createRequest('post',
                urlBase() + '/sb/' + id_code + '/order', {
                    lead_operator_priority: lead_operator_priority,
                    sb_order: sb_order,
                    sb_sequence: sb_sequence,
                }));
        };

        api.updatePBOrderingValues = function(pb_id, director_priority, pb_order, pb_sequence) {
            return $http(createRequest('post',
                urlBase() + '/pb/' + pb_id + '/order', {
                    director_priority: director_priority,
                    pb_order: pb_order,
                    pb_sequence: pb_sequence,
                }));
        };

        api.progressInterval = $interval(function() {
            if (api.observationSchedule.length > 0) {
                api.observationSchedule.forEach(function(pb) {
                    pb.schedule_blocks.forEach(function(sb) {
                        if (sb.state === 'ACTIVE' && sb.expected_duration_seconds && sb.actual_start_time) {
                            sb.progress = api.sbProgress(sb);
                        }
                    });
                });
            }
        }, 3000);

        function createRequest(method, url, data) {
            var req = {
                method: method,
                url: url,
                headers: {
                    'Authorization': 'CustomJWT ' + $rootScope.jwt
                }
            };

            if (data && method === 'post') {
                req.headers['Content-Type'] = 'application/json';
                req.data = data;
            }

            return req;
        }

        return api;
    }

})();
