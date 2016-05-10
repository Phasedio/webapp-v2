'use strict';
(function(){

var ProjectsController = function ProjectsController ($http, $scope, Phased, StatusFactory, TaskFactory, ProjectFactory){
  (function constructor() {
    $scope.Phased = Phased;
    
  })();
  $scope.hasTasks = function hasTasks(obj){
    if(_.size(obj) > 0){
      return true;
    }else{
      return false;
    }
  };
  $scope.newProject = function newProject(){
    
  };
};


angular.module('webappV2App')
  .component('projects', {
    templateUrl: 'app/projects/projects.html',
    controller: ProjectsController
  });

})();
