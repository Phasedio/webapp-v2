'use strict';

describe('Component: mainComponent', function() {

  // load the controller's module
  beforeEach(module('webappV2App'));

  var scope;
  var mainComponent;
  var Phased;

  // Initialize the controller and a mock scope
  beforeEach(inject(function(
    $http,
    $componentController,
    $rootScope,
    Phased) {
      scope = $rootScope.$new();
      sinon.spy(Phased, 'postStatus');
      mainComponent = $componentController('main', {
        $http: $http,
        $scope: scope,
        Phased: Phased
      });
  }));

  describe('#postStatus', function () {
    it('should register #postStatus to scope', function() {
      scope.postStatus.should.be.a('function');
    });

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
