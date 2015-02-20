describe('Directive: d3-treemap', function () {

    beforeEach(module('katGui.d3'));

    var scope, compile, d3Service, deferred, rootScope;

    beforeEach(inject(function ($rootScope, $q, $compile, _d3Service_) {
        scope = $rootScope.$new();
        rootScope = $rootScope;
        deferred = $q.defer();
        compile = $compile;
        d3Service = _d3Service_;

//        spyOn(d3Service, "d3").andCallFake(function() {
//            var deferred = $q.defer();
//            deferred.resolve('Remote call result');
//            return deferred.promise;
//        });
    }));
    //
    //it('should create a d3 line chart', function () {
    //
    //    var element = compile('<d3-treemap></d3-treemap>')(scope);
    //    expect(element[0]).toBeDefined();
    //    scope.$digest();
    //
    //});

    it('should ...', function () {

//        var element = compile('<d3-line></d3-line>')(scope);
//        expect(element.text()).toBe('');

//        d3Service.d3()
//            .then(function() {
//                console.log('Success');
//            });

//        var handler = jasmine.createSpy('initChart');
//        deferred.promise.then(handler);
//        deferred.resolve());
//        rootScope.$digest();
//        expect(handler).toHaveBeenCalledWith(null);
    });
});
