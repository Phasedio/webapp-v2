'use strict';

class NavbarController {
  //start-non-standard
  menu = [
  {
    'title': 'Assignments',
    'link': '/assignments'
  },
  {
    'title': 'FYI',
    'link': '/fyi'
  },
  {
    'title': 'Team',
    'link': '/team'
  },
  {
    'title': 'Profile',
    'link': '/profile',
    'pinRight': true
  },];

  isCollapsed = true;
  //end-non-standard

  constructor($location, Phased) {
    this.$location = $location;
    this.Phased = Phased;
    }

  isActive(route) {
    return route === this.$location.path();
  }
}

angular.module('webappV2App')
  .controller('NavbarController', NavbarController);
