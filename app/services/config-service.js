(function () {

    angular.module('katGui.services')
        .service('ConfigService', ConfigService);

    function ConfigService($q, $http, SERVER_URL, $rootScope, $log) {

        var urlBase = SERVER_URL + '/katconf/api/v1';
        var api = {};
        api.receptorHealthTree = {};
        api.receptorList = [];
        api.KATObsPortalURL = null;
        api.systemConfig = {};

        api.loadKATObsPortalURL = function () {
            $http(createRequest('get', urlBase + '/system-config/sections/katportal/katobsportal'))
                .success(function (result) {
                    api.KATObsPortalURL = "http://" + JSON.parse(result);
                })
                .error(function (message) {
                    $log.error(message);
                });
        };

        api.getSystemConfig = function () {
            var deferred = $q.defer();
            $http(createRequest('get', urlBase + '/system-config'))
                .success(function (result) {
                    api.systemConfig = result;
                    deferred.resolve(api.systemConfig);
                })
                .error(function (message) {
                    $log.error(message);
                    deferred.reject(message);
                });
            return deferred.promise;
        };

        api.getStatusTreeForReceptor = function () {
            return $http(createRequest('get', urlBase + '/statustrees/receptors_view/receptors'));
        };

        api.getStatusTreesForTop = function () {
            return $http(createRequest('get', urlBase + '/statustrees/top_view'));
        };

        api.getReceptorList = function () {
            api.receptorList.splice(0, api.receptorList.length);

            var deferred = $q.defer();
            $http(createRequest('get', urlBase + '/installed-config/receptors'))
                .success(function (result) {
                    result.forEach(function (item) {
                        api.receptorList.push(item);
                    });
                    deferred.resolve(api.receptorList);
                })
                .error(function (result) {
                    $log.error(result);
                    deferred.reject();
                });

            return deferred.promise;
        };

        api.getSiteLocation = function () {
            return $http(createRequest('get', urlBase + '/array/position'));
        };

        api.getHorizonMask = function (receptorId) {
            return $http(createRequest('get', urlBase + '/horizon-mask/' + receptorId));
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
