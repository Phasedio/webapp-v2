'use strict';

(function() {

class LoginController {
  constructor($scope, $location, Phased) {
    this.$scope = $scope; // stash scope to this
    this.$location = $location;
    this.Phased = $scope.Phased = Phased; // stash Phased to scope and to this
  }

  $onInit() {
    const {$scope, $location, Phased} = this; // get scope and phased from this

    // register own methods to scope
    $scope.login = this.doLogin.bind(this); // ensure callbacks are called in this context

    if (Phased.LOGGED_IN) {
      $location.path('/assignments');
    } else {
      // listen for logins and bounce to /assignments
      $scope.$on('Phased:login', () => {
        $location.path('/assignments');
      })
    }
  }

  // callback function $scope == this
  doLogin() {
    const {$scope, Phased} = this;
    delete $scope.loginErrMessage;

    // bail if incomplete credentials entered
    if (
      (!$scope.email || !$scope.password)
      ||
      !($scope.email.length > 0 && $scope.password.length > 0)
      ) {
      return;
    }

    Phased.login($scope.email, $scope.password)
      .then(() => {/* redirect handled above*/}, (err) => {
        if (err) {
          console.log(err);
          $scope.loginErrMessage = err.message;
        }
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
