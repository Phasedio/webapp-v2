'use strict';

(function() {

var FYIController = function FYIController($http, $scope, Phased) {

  /*
  * mimics Yeoman's controller class constructor function
  */
  (function constructor() {
    $scope.Phased = Phased;
  })();

  // posts a simple status, then clears it
  $scope.postStatus = function postStatus() {
    Phased.postStatus($scope.statusName).then(() => $scope.statusName = '');
  }
}

angular.module('webappV2App')
  .component('fyi', {
    templateUrl: 'app/fyi/fyi.html',
    controller: FYIController
  });

})();
