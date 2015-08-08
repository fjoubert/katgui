(function () {

    angular.module('katGui.scheduler')
        .controller('SbDraftsCtrl', SbDraftsCtrl);

    function SbDraftsCtrl($scope, ObsSchedService, SCHEDULE_BLOCK_TYPES, $log, DATETIME_FORMAT, NotifyService) {

        var vm = this;
        vm.selectedScheduleDraft = null;
        vm.types = SCHEDULE_BLOCK_TYPES;
        vm.scheduleDraftData = ObsSchedService.scheduleDraftData;
        vm.draftsOrderByFields = [
            {label: 'ID', value: 'id_code'},
            {label: 'Description', value: 'description'},
            {label: 'Expected Duration', value: 'expected_duration'},
            {label: 'Verification State', value: 'verification_state'},
            {label: 'Date', value: 'desired_start_time'},
            {label: 'State', value: 'state'},
            {label: 'Type', value: 'type'}
        ];

        vm.limitTo = 5;
        $scope.loadMore = function() {
            vm.limitTo += 30;
        };

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
                .success(function (result) {
                    $log.info(result);
                    item.isDirty = false;
                    item.editing = false;
                })
                .error(function (result) {
                    NotifyService.showSimpleDialog('Error Saving SB ' + item.id_code + '.', result);
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

        vm.removeDraft = function (item) {
            ObsSchedService.deleteScheduleDraft(item.id_code)
                .success(function (result) {
                    $log.info(result);
                })
                .error(function (result) {
                    NotifyService.showSimpleDialog('Error Deleteing SB ' + item.id_code + '.', result);
                });
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
            $scope.filteredDraftItems[vm.currentRowDatePickerIndex].desired_start_time = moment(newDate).format(DATETIME_FORMAT);
            $scope.filteredDraftItems[vm.currentRowDatePickerIndex].isDirty = true;
            vm.showDatePicker = false;
            vm.currentSelectedDate = moment.utc(newDate);
            vm.currentRowDatePickerIndex = -1;
        };

        vm.openDatePicker = function (item, $event) {
            var rowIndex = $scope.filteredDraftItems.indexOf(item);
            //TODO keyboard shortcut like escape to close datepicker
            if (vm.currentRowDatePickerIndex !== rowIndex) {
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
                vm.currentRowDatePickerIndex = $scope.filteredDraftItems.indexOf(vm.scheduleDraftData[rowIndex]);
                vm.showDatePicker = true;
            } else {
                //the same row's button was clicked, so close the popup
                vm.closeDatePickerMenu();
            }
            $event.stopPropagation();
        };

        vm.validateInputDate = function (item) {
            var d = moment(item.desired_start_time, DATETIME_FORMAT);
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
    }

})();
