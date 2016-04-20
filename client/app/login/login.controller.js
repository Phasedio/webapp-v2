'use strict';

(function() {

class LoginController {
  constructor($scope) {
    this.$scope = $scope;
  }

  $onInit() {
    const {$scope} = this; // $scope and this.$scope are the same
    $scope.login = this.doLogin;
  }

  // callback function $scope == this
  doLogin() {
    console.log('logging in...', this.username, this.password);
  }
}

LoginController.$inject = ['$scope'];

angular.module('webappV2App')
  .component('login', {
    templateUrl: 'app/login/login.html',
    controller: LoginController
  });

})();
