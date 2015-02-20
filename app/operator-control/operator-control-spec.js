describe('OperatorControlCtrl', function () {

    beforeEach(module('katGui'));

    var rootScope, scope, ctrl, receptorStateService, controlService;

    beforeEach(inject(function ($rootScope, $controller, _ReceptorStateService_, _ControlService_) {
        rootScope = $rootScope;
        scope = $rootScope.$new();
        receptorStateService = _ReceptorStateService_;
        controlService = _ControlService_;

        controlService.inhibitAll = function () {

            ctrl.receptorMessageReceived({}, {
                name: 'm011:inhibited',
                value: true,
                time: 0
            });

            ctrl.receptorMessageReceived({}, {
                name: 'm022:inhibited',
                value: true,
                time: 0
            });

            ctrl.receptorMessageReceived({}, {
                name: 'm033:inhibited',
                value: true,
                time: 0
            });

            ctrl.receptorMessageReceived({}, {
                name: 'm044:inhibited',
                value: true,
                time: 0
            });

            ctrl.receptorMessageReceived({}, {
                name: 'm055:inhibited',
                value: true,
                time: 0
            });
        };

        controlService.stowAll = function () {

            ctrl.receptorMessageReceived({}, {
                name: 'm011:mode',
                value: 'STOW',
                time: 0
            });

            ctrl.receptorMessageReceived({}, {
                name: 'm022:mode',
                value: 'STOW',
                time: 0
            });

            ctrl.receptorMessageReceived({}, {
                name: 'm033:mode',
                value: 'STOW',
                time: 0
            });

            ctrl.receptorMessageReceived({}, {
                name: 'm044:mode',
                value: 'STOW',
                time: 0
            });

            ctrl.receptorMessageReceived({}, {
                name: 'm055:mode',
                value: 'STOW',
                time: 0
            });
        };

        controlService.stopAll = function () {
            ctrl.receptorMessageReceived({}, {
                name: 'm011:mode',
                value: 'STOW',
                time: 0
            });

            ctrl.receptorMessageReceived({}, {
                name: 'm022:mode',
                value: 'STOW',
                time: 0
            });

            ctrl.receptorMessageReceived({}, {
                name: 'm033:mode',
                value: 'STOW',
                time: 0
            });

            ctrl.receptorMessageReceived({}, {
                name: 'm044:mode',
                value: 'STOW',
                time: 0
            });

            ctrl.receptorMessageReceived({}, {
                name: 'm055:mode',
                value: 'STOW',
                time: 0
            });

            ctrl.receptorMessageReceived({}, {
                name: 'm011:inhibited',
                value: true,
                time: 0
            });

            ctrl.receptorMessageReceived({}, {
                name: 'm022:inhibited',
                value: true,
                time: 0
            });

            ctrl.receptorMessageReceived({}, {
                name: 'm033:inhibited',
                value: true,
                time: 0
            });

            ctrl.receptorMessageReceived({}, {
                name: 'm044:inhibited',
                value: true,
                time: 0
            });

            ctrl.receptorMessageReceived({}, {
                name: 'm055:inhibited',
                value: true,
                time: 0
            });
        };

        controlService.resumeOperations = function () {

            ctrl.receptorMessageReceived({}, {
                name: 'm011:mode',
                value: 'STOP',
                time: 0
            });

            ctrl.receptorMessageReceived({}, {
                name: 'm022:mode',
                value: 'STOP',
                time: 0
            });

            ctrl.receptorMessageReceived({}, {
                name: 'm033:mode',
                value: 'STOP',
                time: 0
            });

            ctrl.receptorMessageReceived({}, {
                name: 'm044:mode',
                value: 'STOP',
                time: 0
            });

            ctrl.receptorMessageReceived({}, {
                name: 'm055:mode',
                value: 'STOP',
                time: 0
            });
        };

        ctrl = $controller('OperatorControlCtrl', {$rootScope: rootScope, $scope: scope, ReceptorStateService: receptorStateService, ControlService: controlService});
    }));

    it('should have the configured receptors', inject(function () {
        expect(ctrl.receptorsData.length).not.toBe(0);
    }));

    //it('should update the time since state change', inject(function () {
    //    ctrl.updateReceptorLastChangeDate();
    //
    //    ctrl.receptorsData.forEach(function (receptor) {
    //        expect(receptor.since.length).not.toBe('');
    //        expect(receptor.fromNow).toBe('a few seconds ago');
    //    });
    //}));

    //describe('Receptor Controls', function () {
    //
    //    it('should inhibit all receptors', inject(function () {
    //
    //        ctrl.inhibitAll();
    //
    //        ctrl.receptorsData.forEach(function (receptor) {
    //            //expect(receptor.state).toBe('');
    //            expect(receptor.inhibited).toBeTruthy();
    //        });
    //    }));
    //
    //    it('should issue stow all', inject(function () {
    //        ctrl.stowAll();
    //
    //        ctrl.receptorsData.forEach(function (receptor) {
    //            expect(receptor.state).toBe('STOW');
    //            expect(receptor.inhibited).toBeFalsy();
    //        });
    //    }));
    //
    //    it('should issue stop all', inject(function () {
    //        ctrl.stopAll();
    //
    //        ctrl.receptorsData.forEach(function (receptor) {
    //            expect(receptor.state).toBe('STOW');
    //            expect(receptor.inhibited).toBeTruthy();
    //        });
    //    }));
    //
    //    it('should issue resume operations', inject(function () {
    //        ctrl.resumeOperations();
    //
    //        ctrl.receptorsData.forEach(function (receptor) {
    //            expect(receptor.state).toBe('STOP');
    //            expect(receptor.inhibited).toBeFalsy();
    //        });
    //    }));
    //
    //    //it('should issue shutdown computing', inject(function () {
    //    //
    //    //}));
    //});
});
