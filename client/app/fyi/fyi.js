'use strict';

angular.module('webappV2App')
  .config(function($routeProvider) {
    $routeProvider
      .when('/fyi', {
        template: '<fyi></fyi>'
      });
  });
