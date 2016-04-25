'use strict';

describe('Component: reportsComponent', function() {

  // load the controller's module
  beforeEach(module('webappV2App'));

  var sandbox;
  var scope;
  var reportsComponent;
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
      reportsComponent = $componentController('reportsComponent', {
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
});
