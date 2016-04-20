'use strict';

angular.module('webappV2App')
  .config(function($routeProvider) {
    $routeProvider
      .when('/login', {
        template: '<login></login>'
      });
  });
