'use strict';

describe('Component: assignmentsComponent', function() {

  // load the controller's module
  beforeEach(module('webappV2App'));
  
  var scope;
  var assignmentsComponent;
  var Phased;

  // Initialize the controller and a mock scope
  beforeEach(inject(function(
    $http,
    $componentController,
    $rootScope,
    _Phased_) {
      scope = $rootScope.$new();
      Phased = _Phased_;

      assignmentsComponent = $componentController('assignments', {
        $http: $http,
        $scope: scope,
        Phased: _Phased_
      });
  }));

  //
  //  TESTS
  //

  describe('Phased on assignments page', function () {
    it('should be a thing', function () {
      Phased.should.be.an('object');
    });
  });
});
