'use strict';

(function() {

class LoginController {
  constructor($scope, $location, Phased) {
    this.$scope = $scope; // stash scope to this
    this.$location = $location;
    this.Phased = $scope.Phased = Phased; // stash Phased to scope and to this
  }

  $onInit() {
    const {$scope, Phased} = this; // get scope and phased from this

    // register own methods to scope
    $scope.login = this.doLogin.bind(this); // ensure callbacks are called in this context

    // do some init scripting
    console.log('login controller loaded');
  }

  // callback function $scope == this
  doLogin() {
    const {$scope, $location, Phased} = this;
    Phased.login($scope.email, $scope.password)
      .then(function () {
        console.log('should change loc');
        $location.path('/');
        $scope.$apply();
      });
  }
} 

// don't forget to inject your controllers!
LoginController.$inject = ['$scope', '$location', 'Phased'];

angular.module('webappV2App')
  .component('login', {
    templateUrl: 'app/login/login.html',
    controller: LoginController
  });

})();
