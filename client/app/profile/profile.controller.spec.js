'use strict';

describe('Component: profileComponent', function() {

  // load the controller's module
  beforeEach(module('webappV2App'));

  var scope;
  var profileComponent;
  var Phased;

  // Initialize the controller and a mock scope
  beforeEach(inject(function(
    $http,
    $componentController,
    $rootScope,
    _Phased_) {
      scope = $rootScope.$new();
      Phased = _Phased_;

      profileComponent = $componentController('profile', {
        $http: $http,
        $scope: scope,
        Phased: Phased
      });
  }));

  //
  //  TESTS
  //

  describe('Phased on profile page', function () {
    it('should be a thing', function () {
      Phased.should.be.an('object');
    });
  });
});
