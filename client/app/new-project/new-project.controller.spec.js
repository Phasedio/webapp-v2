'use strict';

describe('Component: NewProjectComponent', function () {

  // load the controller's module
  beforeEach(module('webappV2App'));

  var NewProjectComponent, scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($componentController, $rootScope) {
    scope = $rootScope.$new();
    NewProjectComponent = $componentController('NewProjectComponent', {
      $scope: scope
    });
  }));

  it('should ...', function () {
    1.should.equal(1);
  });
});
