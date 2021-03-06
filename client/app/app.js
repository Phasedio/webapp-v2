'use strict';

angular.module('webappV2App', [
  'webappV2App.constants',
  'ngCookies',
  'ngResource',
  'ngSanitize',
  'ngRoute',
  'ui.bootstrap',
  'firebase',
  'ngOrderObjectBy',
  'angularMoment'
])
  /*
    gets UTC timecode for any of local timestamp, Date, or Moment
  */
  .constant('getUTCTimecode', function getUTCTimecode(input) {
    if (moment.isDate(input)) {
      console.log('Got Date, assuming local timezone.');
      return moment.utc(input).valueOf();
    } else if (moment.isMoment(input)) {
      return input.utc().valueOf();
    } else if (typeof input == 'number') {
      console.log('Got Number, assuming timestamp in local timezone.');
      return moment.utc(input).valueOf();
    } else {
      return false;
    }
  })
  .config(function($routeProvider, $locationProvider, PhasedProvider, appConfig) {
    $routeProvider
      .otherwise({
        redirectTo: '/login'
      });

    $locationProvider.html5Mode(true);

    // stripeProvider.setPublishableKey('pk_live_FPvARdIWeOzOfW8TGqtFd9QN');
    PhasedProvider.config({
      FURL: appConfig.FURL,
      WATCH_TEAM: true
    });
  })
  .run(function run($rootScope, $location, Phased, StatusFactory, TaskFactory, ProjectFactory) {
    /*
      ROUTE MGMT
    */

    // always go to /login after logging out
    // (Phased:logout also fired when app is loaded and user isn't logged in)
    $rootScope.$on('Phased:logout', () =>{
      $location.path('/login');
    });

    // always go to /login if user is logged out & within app
    $rootScope.$on('$routeChangeStart', (e, futureRoute, currentRoute) => {
      if (!!currentRoute // coming from within app
        && !Phased.LOGGED_IN // not logged in
        && $location.path().indexOf('login') < 0 // not already on login page
      ) {
        e.preventDefault();
        $location.path('/login');
      }
    });

    // add route name to high-level DOM element class for styling
    $rootScope.$on('$routeChangeSuccess', () => {
      $rootScope.route = $location.path().split('/')[1];
    });
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
  /**
  * orders team members by post date of their currentStatus
  *
  */
  .filter('orderMembersByStatusTime', ['Phased', function orderMembersByStatusTime(Phased) {
      return function(members, asc = false) {
        if (!Phased.SET_UP)
          return members;
  
        return _.orderBy(members, (o) => {
          let status = Phased.team.statuses[o.currentStatus];
          return _.isNil(status) ? 0 : status.time;
        }, asc ? 'asc' : 'desc');
      }
    }])