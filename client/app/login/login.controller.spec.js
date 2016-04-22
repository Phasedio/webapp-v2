'use strict';

describe('Component: loginController', function() {

  // load the controller's module
  beforeEach(module('webappV2App'));

  var scope;
  var loginController;
  var $httpBackend;
  var Phased;

  // Initialize the controller and a mock scope
  beforeEach(inject(function(
    $location,
    $http,
    Phased,
    $componentController,
    $rootScope) {

      scope = $rootScope.$new();
      loginController = $componentController('login', {
        $http: $http,
        $scope: scope,
        Phased: Phased
      });
  }));

  it('should register login function to scope', function() {
    loginController.$onInit();
    scope.login.should.be.a('function');
  });
});
