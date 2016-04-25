'use strict';

angular.module('webappV2App')
  .config(function($routeProvider) {
    $routeProvider
      .when('/reports', {
        template: '<reports></reports>'
      });
  });
