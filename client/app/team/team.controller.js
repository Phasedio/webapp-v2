'use strict';

(function() {

var TeamController = function TeamController($http, $scope, Phased, StatusFactory, TaskFactory, ProjectFactory) {

  /*
  * mimics Yeoman's controller class constructor function
  */
  (function constructor() {
    $scope.Phased = Phased;
    $scope.statusActive = false;
  })();

  $scope.postStatus = function postStatus(name) {
    StatusFactory.create(name).then(()=>{
      $scope.newStatus = '';
    }, (e) => {
      console.log(e);
    });
  };

  $scope.makeTask = function makeTask(name) {
    TaskFactory.create(name).then(()=>{
      console.log('made task!');
    }, (e) => {
      console.log(e);
    });
  };

  $scope.makeProject = function makeProject(name) {
    ProjectFactory.create(name).then(()=>{
      console.log('made project!');
    }, (e) => {
      console.log(e);
    });
  };

  $scope.openStatus = function openStatus(){
     $scope.statusActive  = true;
  };
};



angular.module('webappV2App')
  .component('team', {
    templateUrl: 'app/team/team.html',
    controller: TeamController
  });

})();
