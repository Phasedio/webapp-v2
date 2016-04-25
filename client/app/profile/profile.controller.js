'use strict';

(function() {

var ProfileController = function ProfileController($http, $scope, Phased) {

  /*
  * mimics Yeoman's controller class constructor function
  */
  (function constructor() {
    $scope.Phased = Phased;
  })();

}

angular.module('webappV2App')
  .component('profile', {
    templateUrl: 'app/profile/profile.html',
    controller: ProfileController
  });

})();
