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
    _Phased_,
    $componentController,
    $rootScope) {
      // sandbox
      sandbox = sinon.sandbox.create();
      // stub console methods
      sandbox.stub(window.console, 'log');
      sandbox.stub(window.console, 'warn');
      sandbox.stub(window.console, 'error');

      // make a new scope for the controller to live in
      scope = $rootScope.$new();

      // save a ref to Phased
      Phased = _Phased_;

      loginController = $componentController('login', {
        $http: $http,
        $scope: scope,
        Phased: _Phased_
      });
      loginController.$onInit();
  }));

  afterEach(function () {
    sandbox.restore();
  });

  it('should register login function to scope', function() {
    scope.login.should.be.a('function');
  });

  it('should not login if either username or password are blank', function () {
    sandbox.spy(Phased, 'login');
    
    // no email or pass
    scope.login();
    // should not call Phased.login
    assert(!Phased.login.called, 'attempted to login without email or pass');
    Phased.login.reset();


    // email but no pass
    scope.email = 'asdf@asdf.com';
    scope.login();
    // should not call Phased.login
    assert(!Phased.login.called, 'attempted to login without pass');
    Phased.login.reset();

    // pass but no email
    delete scope.email;
    scope.password = 'correctbatterysomestuff';
    scope.login();
    // should not call Phased.login
    assert(!Phased.login.called, 'attempted to login without email');
    Phased.login.reset();
  });
});
