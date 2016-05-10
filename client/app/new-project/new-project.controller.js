'use strict';
(function(){

var NewProjectController = function NewProjectController($http, $scope, Phased, StatusFactory, TaskFactory, ProjectFactory,$location) {

  /*
  * mimics Yeoman's controller class constructor function
  */
  (function constructor() {
    $scope.Phased = Phased;
    
    console.log(Phased);
  })();
  
  $scope.newProject = function newProject(args){
    console.log(args);
    ProjectFactory.create(args).then(()=>{
      console.log('made a project!');
    }, (e) => {
      console.log(e);
    });
  };
};
angular.module('webappV2App')
  .component('newProject', {
    templateUrl: 'app/new-project/new-project.html',
    controller: NewProjectController
  });

})();
