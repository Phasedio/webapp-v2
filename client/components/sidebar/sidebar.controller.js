'use strict';

class SidebarController {
  //start-non-standardv
   menu = [
    // {
    //     'title': 'Team',
    //     'link': '/team'
    // },
    // {
    //     'title': 'Tasks',
    //     'link': '/assignments'
    // },
    // {
    //     'title': 'Projects',
    //     'link': '/team'
    // },
    // {
    //     'title': 'Profile',
    //     'link': '/team'
    // },
    // {
    //     'title': 'Reports',
    //     'link': '/reports'
    // }
  ];

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
  .controller('SidebarController', SidebarController);
