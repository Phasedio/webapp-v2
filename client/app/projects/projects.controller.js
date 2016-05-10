'use strict';
(function(){

class ProjectsComponent {
  constructor() {
    this.message = 'Hello';
  }
}

angular.module('webappV2App')
  .component('projects', {
    templateUrl: 'app/projects/projects.html',
    controller: ProjectsComponent
  });

})();
