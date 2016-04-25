'use strict';

(function() {

var TeamController = function TeamController($http, $scope, Phased) {

  /*
  * mimics Yeoman's controller class constructor function
  */
  (function constructor() {
    $scope.Phased = Phased;
  })();
}

angular.module('webappV2App')
  .component('team', {
    templateUrl: 'app/team/team.html',
    controller: TeamController
  });

})();
