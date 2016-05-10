'use strict';

class NavbarController {
  //start-non-standard
 

  isCollapsed = true;
  //end-non-standard

  constructor($location, $scope, Phased) {
    this.$location = $location;
    $scope.Phased = Phased;
  }

  isActive(route) {
    return route === this.$location.path();
  }
}

angular.module('webappV2App')
  .controller('NavbarController', NavbarController);
