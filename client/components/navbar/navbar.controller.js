'use strict';

class NavbarController {
  //start-non-standard
  menu = [{
    'title': 'Login',
    'link': '/login'
  },
  {
    'title': 'Home',
    'link': '/'
  }];

  isCollapsed = true;
  //end-non-standard

  constructor($location, Phased) {
    this.$location = $location;
    this.Phased = Phased;
    }

  isActive(route) {
    return route === this.$location.path();
  }

  logout() {
    this.Phased.logout();
  }
}

angular.module('webappV2App')
  .controller('NavbarController', NavbarController);
