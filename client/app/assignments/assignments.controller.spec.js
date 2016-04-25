'use strict';

describe('Component: assignmentsComponent', function() {

  // load the controller's module
  beforeEach(module('webappV2App'));

  var sandbox;
  var scope;
  var assignmentsComponent;
  var Phased;

  // Initialize the controller and a mock scope
  beforeEach(inject(function(
    $http,
    $componentController,
    $rootScope,
    _Phased_) {
      sandbox = sinon.sandbox.create();
      // stub console methods
      sandbox.stub(window.console, 'log');
      sandbox.stub(window.console, 'warn');
      sandbox.stub(window.console, 'error');

      scope = $rootScope.$new();
      Phased = _Phased_;

      assignmentsComponent = $componentController('assignments', {
        $http: $http,
        $scope: scope,
        Phased: _Phased_
      });
  }));

  afterEach(function () {
    sandbox.restore();
  });

  //
  //  TESTS
  //

  describe('Phased on assignments page', function () {
    it('should be a thing', function () {
      Phased.should.be.an('object');
    });
  });
});
