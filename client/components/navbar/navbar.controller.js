'use strict';

class NavbarController {
  //start-non-standard
  menu = [{
    'title': 'Login',
    'link': '/login'
  }, {
    'title': 'Home',
    'link': '/'
  }];

  isCollapsed = true;
  //end-non-standard

  constructor($location) {
    this.$location = $location;
    }

  isActive(route) {
    return route === this.$location.path();
  }
}

angular.module('webappV2App')
  .controller('NavbarController', NavbarController);
