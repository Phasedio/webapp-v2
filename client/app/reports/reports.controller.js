'use strict';

(function() {

var ReportsController = function ReportsController($http, $scope, Phased) {

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

  // when "Today" is clicked, choose a new date?
  $scope.onToday = function onToday(e) {
    e.preventDefault();
    console.log('onToday', e);
  }
 
  // when "Filter" is clicked
  $scope.onFilter = function onFilter(e) {
    e.preventDefault();
    console.log('onFilter', e);
  }

  // when "Export" is clicked
  $scope.onExport = function onExport(e) {
    e.preventDefault();
    console.log('onExport', e);
  }

  // when "Likes" is clicked
  $scope.onLikes = function onLikes(e, status) {
    e.preventDefault();
    console.log('onLikes', e, status);
  }

  // when "Comments" is clicked
  $scope.onComments = function onComments(e, status) {
    e.preventDefault();
    console.log('onComments', e, status);
  }
}

angular.module('webappV2App')
  .component('reports', {
    templateUrl: 'app/reports/reports.html',
    controller: ReportsController
  });

})();
