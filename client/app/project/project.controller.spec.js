'use strict';

describe('Component: ProjectComponent', function () {

  // load the controller's module
  beforeEach(module('webappV2App'));

  var ProjectComponent, scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($componentController, $rootScope) {
    scope = $rootScope.$new();
    ProjectComponent = $componentController('ProjectComponent', {
      $scope: scope
    });
  }));

  it('should ...', function () {
    1.should.equal(1);
  });
});
