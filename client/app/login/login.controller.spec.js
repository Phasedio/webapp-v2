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
      sandbox.spy(loginController, 'doLogin');
      loginController.$onInit();
  }));

  afterEach(function () {
    sandbox.restore();
  });

  //
  // TESTS
  //

  it('should register login function to scope', function() {
    scope.login.should.be.a('function');
  });

  // #login
  describe('#login', function() {
    it('should not login if either username or password are blank', function () {
      sandbox.spy(Phased, 'login');
      
      // no email or pass
      scope.login();
      assert(!Phased.login.called, 'attempted to login without email or pass'); // should not call Phased.login
      Phased.login.reset();


      // email but no pass
      scope.email = 'asdf@asdf.com';
      scope.login();
      assert(!Phased.login.called, 'attempted to login without pass');
      Phased.login.reset();

      // pass but no email
      delete scope.email;
      scope.password = 'correctbatterysomestuff';
      scope.login();
      assert(!Phased.login.called, 'attempted to login without email');
      Phased.login.reset();
      delete scope.password;
    });

    it('should call Phased.login', function () {
      sandbox.spy(Phased, 'login');
      scope.email = 'valid@email.yes';
      scope.password = 'batterystaple';

      scope.login();

      assert(Phased.login.called, 'Phased.login was not called');
      Phased.login.restore();
    });

    // this currently gives false positives (note test for false == true)
    it('should gracefully handle failed login attempts', function () {
      // stub Phased.login to return and reject a promise
      var errMsg = "Incorrect login"
      sandbox.stub(loginController.Phased, 'login', () => {
        var stubPromise = sinon.stub().returnsPromise().rejects(new Error(errMsg));
        return stubPromise();
      });

      // dummy stuff
      scope.email = 'asdf';
      scope.password = 'asdf';
      scope.login();

      // test conditions
      assert(loginController.doLogin.called, 'loginController.doLogin was not called');
      assert(loginController.Phased.login.called, 'Phased.login was not called');
      // expect controller method to assign error message from Phased to a scope variable
      expect(scope.loginErrMessage).to.equal(errMsg);
      
      // restore original method
      Phased.login.restore(); 
    });
  });
});
