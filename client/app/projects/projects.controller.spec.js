'use strict';

describe('Component: ProjectsComponent', function () {

  // load the controller's module
  beforeEach(module('webappV2App'));

  var ProjectsComponent, scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($componentController, $rootScope) {
    scope = $rootScope.$new();
    ProjectsComponent = $componentController('projects', {
      $scope: scope
    });
  }));

  it('should ...', function () {
    expect(1).to.equal(1);
  });
});
