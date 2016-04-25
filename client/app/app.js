'use strict';

angular.module('webappV2App', [
  'webappV2App.constants',
  'ngCookies',
  'ngResource',
  'ngSanitize',
  'ngRoute',
  'ui.bootstrap',
  'firebase'
])
  .constant('FURL', 'https://phased-dev2.firebaseio.com/')
  .config(function($routeProvider, $locationProvider, PhasedProvider, FURL) {
    $routeProvider
      .otherwise({
        redirectTo: '/login'
      });

    $locationProvider.html5Mode(true);

    // stripeProvider.setPublishableKey('pk_live_FPvARdIWeOzOfW8TGqtFd9QN');
    PhasedProvider.config({
      FURL: FURL,
      WATCH_TEAM: true
    });
  })
  .run(function run($rootScope, $location, Phased) {
    /*
      ROUTE MGMT
    */

    // always go to /login after logging out
    $rootScope.$on('Phased:logout', () =>{
      $location.path('/login');
    });

    // always go to /login if user is logged out
    $rootScope.$on('$routeChangeStart', (e, futureRoute, currentRoute) => {
      if (!Phased.LOGGED_IN && $location.path().indexOf('login') < 0) {
        e.preventDefault();
        $location.path('/login');
      }
    });

    // add route name to high-level DOM element class for styling
    $rootScope.$on('$routeChangeSuccess', () => {
      $rootScope.route = $location.path().split('/')[1];
    });
  })

  /**
  *
  * allows ordering an object as if it were an array,
  * at the cost of being able to access its original index
  * Adds a property 'key' with the original index to
  * address this
  *
  */
  .filter('orderObjectBy', function orderObjectBy() {
    return function(items, field, reverse) {
      var filtered = [];
      for (var i in items) {
        items[i].key = i;
        filtered.push(items[i]);
      }
      filtered.sort(function (a, b) {
        return (a[field] > b[field] ? 1 : -1);
      });
      if(reverse) filtered.reverse();
      return filtered;
    };
  })
  /*
    If a phone number can be formatted nicely, format it; otherwise, return the original
  */
  .filter('tel', function tel() {
    return function(tel) {
      var res = formatLocal('CA', tel);
      return res || tel;
    }
  })
  /*
    Basically a length property that will also count objects
  */
  .filter('length', function length(){
    return function(input) {
      return Object.keys(input).length;
    }
  })