describe('Directive: d3-chart', function () {

    beforeEach(module('katGui.d3'));

    var scope, compile, deferred, rootScope;

    beforeEach(inject(function ($rootScope, $q, $compile) {
        scope = $rootScope.$new();
        rootScope = $rootScope;
        deferred = $q.defer();
        compile = $compile;
    }));

    it('should create a multi-line-chart chart', function () {

        var element = compile('<multi-line-chart></multi-line-chart>')(scope);
        expect(element[0]).toBeDefined();
        scope.$digest();

    });
});
