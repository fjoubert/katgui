(function () {

    angular.module('katGui.scheduler')
        .controller('SbDraftsCtrl', SbDraftsCtrl);

    function SbDraftsCtrl($mdDialog, $scope, ObsSchedService, SCHEDULE_BLOCK_TYPES, $log, NotifyService, $rootScope, MOMENT_DATETIME_FORMAT) {

        var vm = this;
        vm.selectedScheduleDraft = null;
        vm.types = SCHEDULE_BLOCK_TYPES;
        vm.scheduleDraftData = ObsSchedService.scheduleDraftData;
        $scope.$parent.vm.subarray = null;
        $scope.parent = $scope.$parent;

        vm.draftsOrderByFields = [
            {label: 'ID', value: 'id_code'},
            {label: 'Description', value: 'description'},
            {label: 'Expected Duration', value: 'expected_duration'},
            {label: 'Verification State', value: 'verification_state'},
            {label: 'Date', value: 'desired_start_time'},
            {label: 'State', value: 'state'},
            {label: 'Type', value: 'type'}
        ];

        vm.setDraftsOrderBy = function (column) {
            var newOrderBy = _.findWhere(vm.draftsOrderByFields, {value: column});
            if ((vm.draftsOrderBy || {}).value === column) {
                if (newOrderBy.reverse === undefined) {
                    newOrderBy.reverse = true;
                } else if (newOrderBy.reverse) {
                    newOrderBy.reverse = undefined;
                    newOrderBy = null;
                }
            }
            vm.draftsOrderBy = newOrderBy;
        };

        vm.setDraftsOrderBy('id_code', true);

        vm.saveDraft = function (item) {
            item.editing = false;
            ObsSchedService.updateScheduleDraft(item)
                .then(function (result) {
                    delete item.isDirty;
                    delete item.editing;
                    NotifyService.showSimpleToast('Saved SB ' + item.id_code);
                }, function (result) {
                    NotifyService.showPreDialog('Error Saving SB ' + item.id_code, result.data);
                });
        };

        vm.saveAllDirtyDrafts = function () {
            vm.scheduleDraftData.forEach(function (item) {
                item.editing = false;
                if (item.isDirty) {
                    ObsSchedService.updateScheduleDraft(item);
                    item.isDirty = false;
                }
            });
        };

        vm.verifyDraft = function (item) {
            ObsSchedService.verifyScheduleBlock(item.sub_nr, item.id_code);
        };

        vm.verifyUnassignedDraft = function (item) {
            ObsSchedService.verifyUnassignedScheduleBlock(item.id_code);
        };

        vm.removeDraft = function (item) {
            ObsSchedService.deleteScheduleDraft(item.id_code);
        };

        vm.setSelectedScheduleDraft = function (selectedDraft, dontDeselectOnSame) {
            if (vm.selectedScheduleDraft === selectedDraft && !dontDeselectOnSame) {
                vm.selectedScheduleDraft = null;
            } else {
                vm.selectedScheduleDraft = selectedDraft;
            }
        };

        vm.viewSBTasklog = function (item) {
            ObsSchedService.viewTaskLogForSBIdCode(item.id_code, 'dryrun');
        };

        vm.onTimeSet = function (newDate) {
            $scope.filteredDraftItems[vm.currentRowDatePickerIndex].desired_start_time = moment(newDate).format(MOMENT_DATETIME_FORMAT);
            $scope.filteredDraftItems[vm.currentRowDatePickerIndex].isDirty = true;
            vm.showDatePicker = false;
            vm.currentSelectedDate = moment.utc(newDate);
            vm.currentRowDatePickerIndex = -1;
        };

        vm.editInstructionSet = function (sb, event) {
            // can you believe there is no way of making a $mdDialog wider
            // I'm appending non-printable spaces after title to make $mdDialog widner
            var confirm = $mdDialog.prompt()
                .title('Edit Instruction Set for ' + sb.id_code + "\u00A0".repeat(100))
                .textContent('')
                .placeholder('Instruction Set')
                .ariaLabel('Instruction Set')
                .initialValue(sb.instruction_set)
                .targetEvent(event)
                .theme($rootScope.themePrimaryButtons)
                .ok('Save')
                .cancel('Cancel');

            $mdDialog.show(confirm).then(function(result) {
                sb.instruction_set = result;
                vm.saveDraft(sb);
            }, function() {
                NotifyService.showSimpleToast('Cancelled Instruction Set edit for ' + sb.id_code);
            });
        };

        vm.openDatePicker = function (item, $event, $index) {

            if (vm.currentRowDatePickerIndex !== $index) {
                vm.setSelectedScheduleDraft(item, true);
                var existingVal = item.desired_start_time;
                if (existingVal && existingVal.length > 0) {
                    vm.currentSelectedDate = existingVal;
                }
                var rect = $event.currentTarget.getBoundingClientRect();
                var offset = {x: 0, y: 24};
                var overLayCSS = {
                    left: rect.left + offset.x + 'px',
                    top: rect.top + offset.y + 'px'
                };
                angular.element(document.getElementById('schedulerDatePickerMenu')).css(overLayCSS);
                vm.currentRowDatePickerIndex = $index;
                vm.showDatePicker = true;
            } else {
                //the same row's button was clicked, so close the popup
                vm.closeDatePickerMenu();
            }
            $event.stopPropagation();
        };

        vm.validateInputDate = function (item) {
            var d = moment(item.desired_start_time, MOMENT_DATETIME_FORMAT);
            item.hasValidInput = d.isValid();
            return d.isValid();
        };

        vm.closeDatePickerMenu = function () {
            if (vm.showDatePicker) {
                vm.showDatePicker = false;
                vm.currentRowDatePickerIndex = -1;
            }
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        };

        vm.unbindShortcuts = $rootScope.$on("keydown", function (e, key) {
            if (key === 27) {
                //clear selection when pressing escape
                vm.selectedScheduleDraft = null;
            }

            if (!$scope.$$phase) {
                $scope.$apply();
            }
        });

        $scope.$on('$destroy', function () {
            vm.unbindShortcuts('keydown');
        });
    }

})();
