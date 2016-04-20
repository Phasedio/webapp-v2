'use strict';

(function() {

class LoginController {
  constructor($scope, Phased) {
    this.$scope = $scope;
    $scope.Phased = Phased;
  }

  $onInit() {
    const {$scope} = this; // $scope and this.$scope are the same
    $scope.login = this.doLogin;
  }

  // callback function $scope == this
  doLogin() {
    console.log(this.Phased);
    this.Phased.login(this.username, this.password);
  }
}

// don't forget to inject your controllers!
LoginController.$inject = ['$scope', 'Phased'];

angular.module('webappV2App')
  .component('login', {
    templateUrl: 'app/login/login.html',
    controller: LoginController
  });

})();
