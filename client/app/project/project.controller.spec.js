'use strict';

describe('Component: ProjectComponent', function () {

  // load the controller's module
  beforeEach(module('webappV2App'));

  var ProjectComponent, scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($componentController, $rootScope) {
    scope = $rootScope.$new();
    ProjectComponent = $componentController('projects', {
      $scope: scope
    });
  }));

  it('should ...', function () {
    expect(1).to.equal(1);
  });
});
