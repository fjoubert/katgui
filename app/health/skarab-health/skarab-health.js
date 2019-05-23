(function() {

    angular.module('katGui.health')
        .controller('SKARABHealthCtrl', SKARABHealthCtrl);

    function SKARABHealthCtrl($rootScope, $scope, ConfigService, StatusService, NotifyService,
        MonitorService, d3Util, $timeout, $log, $state) {

        var vm = this;
        vm.NUM_OF_RACKS = 9;
        vm.NUM_OF_SLOTS = 42;

        vm.subscribedSensors = [];

        // initialise data with racks and slots
        vm.data = [];
        var id = 0;
        for (var i=1; i<(vm.NUM_OF_RACKS+1); i++) {
          for (var j=1; j<(vm.NUM_OF_SLOTS+1); j++) {
            id++;
            var obj = {};
            obj.rack = i;
            obj.slot = j;
            obj.position = 'B' + ("00"+i).slice(-2) + ":" + ("00"+j).slice(-2);
            obj.sensorName = '';
            obj.sensorValue = {};
            obj.status = 'empty';
            obj.id = id;
            vm.data.push(obj);
          }
        }

        ConfigService.getSystemConfig();

        vm.initPositionSensors = function() {

          var sensorsRegex = 'skarab.*_location';
          MonitorService.listSensorsHttp('all', sensorsRegex).then(function (result) {
              for (var i=0; i<result.data.length; i++) {
                var sensor = result.data[i];
                var position = sensor.value;
                var deviceStatusName = sensor.name.replace('location', 'device_status');
                vm.updatePositionSensor(position, deviceStatusName);
              }
              vm.initStatusSensors();

          }, function(error) {
              $log.error(error);
          });
        };

        vm.initStatusSensors = function() {
          var sensorsRegex = 'skarab.*_device_status';
          MonitorService.listSensorsHttp('all', sensorsRegex).then(function (result) {
              result.data.forEach(function (sensor) {
                vm.initStatusSensor(sensor);
                MonitorService.subscribeSensor(sensor);
                vm.subscribedSensors.push(sensor);
              });
            }, function(error) {
                $log.error(error);
            });
        };

        vm.navigateToSensorList = function(component, filter) {
          $state.go('sensor-list',{
            component: component,
            filter: filter
          });
        };

        vm.updatePositionSensor = function(position, sensorName) {
          if (!position) {
            return;
          }

          var p = position.split(/[:+]/);
          var rack = Number(p[0].substring(1));
          var slot = Number(p[1]);

//// TODO: There could be two sensors linked to the same position
// (one each from cbfhealth and cbfhealth2 proxies). Current code does not
// allow for that. If tie-breaker is required then need to reimplement this
          for (var i=0; i<vm.data.length; i++) {
            var obj = vm.data[i];
            if (obj.rack==rack && obj.slot==slot) {
              obj.position = position;
              obj.sensorName = sensorName;
              obj.status = 'unknown';
              return;
            }
          }
        };

        vm.initStatusSensor = function(sensor) {
          for (var i=0; i<vm.data.length; i++) {
            var obj = vm.data[i];
            if (obj.sensorName==sensor.name) {
              obj.name = sensor.original_name;
              obj.description = sensor.description;
              obj.sensor = sensor;
              obj.status = sensor.status;
              if (vm.updateStatus)
                vm.updateStatus(obj);
              return;
            }
          }
        };

        vm.updateStatusSensor = function(sensor) {
          for (var i=0; i<vm.data.length; i++) {
            var obj = vm.data[i];
            if (obj.sensorName==sensor.name) {
              obj.sensor = sensor;
              obj.status = sensor.status;
              if (vm.updateStatus)
                vm.updateStatus(obj);
              return;
            }
          }
        };

        var unbindUpdate = $rootScope.$on('sensorUpdateMessage', function(event, sensor, subject) {
          if (sensor.name.includes("device_status")) {
            vm.updateStatusSensor(sensor);
          }
        });

        var unbindReconnected = $rootScope.$on('websocketReconnected', vm.initPositionSensors);
        vm.initPositionSensors();

        $scope.$on('$destroy', function() {
            vm.subscribedSensors.forEach(function(sensor) {
                MonitorService.unsubscribeSensor(sensor);
            });
            unbindUpdate();
            unbindReconnected();
        });
    }
})
();
