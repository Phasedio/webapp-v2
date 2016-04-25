'use strict';

describe('Component: profileComponent', function() {

  // load the controller's module
  beforeEach(module('webappV2App'));

  var sandbox;
  var scope;
  var profileComponent;
  var Phased;

  // Initialize the controller and a mock scope
  beforeEach(inject(function(
    $http,
    $componentController,
    $rootScope,
    Phased) {
      sandbox = sinon.sandbox.create();
      // stub console methods
      sandbox.stub(window.console, 'log');
      sandbox.stub(window.console, 'warn');
      sandbox.stub(window.console, 'error');

      scope = $rootScope.$new();
      sandbox.spy(Phased, 'postStatus');
      profileComponent = $componentController('profile', {
        $http: $http,
        $scope: scope,
        Phased: Phased
      });
  }));

  afterEach(function () {
    sandbox.restore();
  });

  //
  //  TESTS
  //

  it('should register #postStatus to scope', function() {
    scope.postStatus.should.be.a('function');
  });

  // postStatus
  describe('#postStatus', function () {
    it('should call Phased#postStatus', function () {
      scope.postStatus();
      assert(scope.Phased.postStatus.called);
    });

    // not sure how to test this with the async
    // it('should clear the status after posting it', function () {
    //   scope.statusName = 'dummy status';
    //   scope.postStatus();
    //   // expect(scope.statusName).to.eventually.have.length(0);
    //   // scope.statusName.should.eventually.have.length(0);
    // })
  });
});
