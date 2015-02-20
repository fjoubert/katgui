(function () {

    angular.module('katGui.services')
        .service('ConfigService', ConfigService);

    function ConfigService($q, $http, SERVER_URL, $rootScope, $timeout) {

        var urlBase = SERVER_URL + ':8840';
        var api = {};
        api.receptorStatusTree = {};
        api.receptorList = [];

        api.getStatusTreeForReceptor = function () {
            return $http(createRequest('get', urlBase + '/statustree/receptor'));
                //.success(function (result) {
                //    for (var attrname in result) {
                //        api.receptorStatusTree[attrname] = result[attrname];
                //    }
                //})
                //.error(function (result) {
                //    console.error(result);
                //});
        };

        api.getReceptorList = function () {
            api.receptorList.splice(0, api.receptorList.length);

            var promise = $q.defer();
            $http(createRequest('get', urlBase + '/installed-config/receptors'))
                .success(function (result) {
                    result.forEach(function (item) {
                        api.receptorList.push(item);
                    });
                    promise.resolve(api.receptorList);
                })
                .error(function (result) {
                    console.error(result);
                    promise.reject();
                });

            return promise.promise;
        };

        function createRequest(method, url) {
            return {
                method: method,
                url: url,
                headers: {
                    'Authorization': 'CustomJWT ' + $rootScope.jwt
                }
            };
        }

        return api;
    }

})();
