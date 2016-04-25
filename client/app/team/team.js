'use strict';

angular.module('webappV2App')
  .config(function($routeProvider) {
    $routeProvider
      .when('/team', {
        template: '<team></team>'
      });
  });
