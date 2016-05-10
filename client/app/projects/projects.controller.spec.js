'use strict';

describe('Component: ProjectsComponent', function () {

  // load the controller's module
  beforeEach(module('webappV2App'));

  var ProjectsComponent, scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($componentController, $rootScope) {
    scope = $rootScope.$new();
    ProjectsComponent = $componentController('ProjectsComponent', {
      $scope: scope
    });
  }));

  it('should ...', function () {
    1.should.equal(1);
  });
});
