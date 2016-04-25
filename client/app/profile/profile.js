'use strict';

angular.module('webappV2App')
  .config(function($routeProvider) {
    $routeProvider
      .when('/profile', {
        template: '<profile></profile>'
      });
  });
