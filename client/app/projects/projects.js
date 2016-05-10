'use strict';

angular.module('webappV2App')
  .config(function ($routeProvider) {
    $routeProvider
      .when('/projects', {
        template: '<projects></projects>'
      });
  });
