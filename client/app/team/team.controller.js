'use strict';

(function() {

var TeamController = function TeamController($http, $scope, Phased, StatusFactory) {

  /*
  * mimics Yeoman's controller class constructor function
  */
  (function constructor() {
    $scope.Phased = Phased;
  })();

  $scope.postStatus = function postStatus(name) {
    StatusFactory.create(name).then(()=>{
      console.log('status created');
    }, (e) => {
      console.log(e);
    })
  }
}

angular.module('webappV2App')
  .component('team', {
    templateUrl: 'app/team/team.html',
    controller: TeamController
  });

})();
