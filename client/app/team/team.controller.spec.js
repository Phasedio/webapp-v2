'use strict';

describe('Component: teamComponent', function() {

  // load the controller's module
  beforeEach(module('webappV2App'));

  var scope;
  var teamComponent;
  var Phased;

  // Initialize the controller and a mock scope
  beforeEach(inject(function(
    $http,
    $componentController,
    $rootScope,
    _Phased_) {
      scope = $rootScope.$new();
      Phased = _Phased_;

      teamComponent = $componentController('team', {
        $http: $http,
        $scope: scope,
        Phased: Phased
      });
  }));

  //
  //  TESTS
  //

  describe('Phased on team page', function () {
    it('should be a thing', function () {
      Phased.should.be.an('object');
    });
  });
});
