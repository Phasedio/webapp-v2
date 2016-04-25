'use strict';

(function() {

var AssignmentsController = function AssignmentsController($http, $scope, Phased) {

  /*
  * mimics Yeoman's controller class constructor function
  */
  (function constructor() {
    $scope.Phased = Phased;
  })();

  // when "Add New" is clicked, choose a new date?
  $scope.onAddNew = function onAddNew(e) {
    e.preventDefault();
    console.log('onAddNew', e);
  }

  // when "Filter" is clicked, choose a new date?
  $scope.onFilter = function onFilter(e) {
    e.preventDefault();
    console.log('onFilter', e);
  }
}

angular.module('webappV2App')
  .component('assignments', {
    templateUrl: 'app/assignments/assignments.html',
    controller: AssignmentsController
  });

})();
