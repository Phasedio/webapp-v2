'use strict';

angular.module('webappV2App')
  .config(function($routeProvider) {
    $routeProvider
      .when('/assignments', {
        template: '<assignments></assignments>'
      });
  });
