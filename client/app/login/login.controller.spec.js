'use strict';

describe('Component: loginController', function() {

  // load the controller's module
  beforeEach(module('webappV2App'));

  var sandbox;
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
      // sandbox
      sandbox = sinon.sandbox.create();
      // stub console methods
      sandbox.stub(window.console, 'log');
      sandbox.stub(window.console, 'warn');
      sandbox.stub(window.console, 'error');

      scope = $rootScope.$new();
      loginController = $componentController('login', {
        $http: $http,
        $scope: scope,
        Phased: Phased
      });
  }));

  afterEach(function () {
    sandbox.restore();
  });

  it('should register login function to scope', function() {
    loginController.$onInit();
    scope.login.should.be.a('function');
  });
});
