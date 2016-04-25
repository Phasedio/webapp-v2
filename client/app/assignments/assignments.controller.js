'use strict';

(function() {

var AssignmentsController = function AssignmentsController($http, $scope, Phased) {

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
  .component('assignments', {
    templateUrl: 'app/assignments/assignments.html',
    controller: AssignmentsController
  });

})();
