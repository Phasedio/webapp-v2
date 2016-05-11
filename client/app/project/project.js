'use strict';

angular.module('webappV2App')
  .config(function ($routeProvider) {
    $routeProvider
      .when('/projects/:projectID', {
        template: '<project></project>'
      });
  });
