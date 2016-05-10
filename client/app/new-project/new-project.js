'use strict';

angular.module('webappV2App')
  .config(function ($routeProvider) {
    $routeProvider
      .when('/projects/new', {
        template: '<new-project></new-project>'
      });
  });
