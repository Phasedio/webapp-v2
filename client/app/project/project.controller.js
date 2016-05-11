'use strict';
(function(){

var ProjectController = function ProjectsController ($http, $scope, Phased, StatusFactory, TaskFactory, ProjectFactory,$routeParams){
  (function constructor() {
    
    $scope.Phased = Phased;
    $scope.project = Phased.team.projects[$routeParams.projectID];
  })();
  $scope.addComment = function addComment(text){
    Phased.team.projects[$routeParams.projectID].addComment(text);
  };
  $scope.addMember = function addMember(uid){
    console.log(uid);
    Phased.team.projects[$routeParams.projectID].addMember(uid);
  };
};
angular.module('webappV2App')
  .component('project', {
    templateUrl: 'app/project/project.html',
    controller: ProjectController
  });

})();
