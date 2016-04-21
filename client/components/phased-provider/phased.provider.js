'use strict';
angular.module('webappV2App')
	.provider('Phased', function PhasedProvider() {
		// private
		var $rootScope, $http, $location, $window, $firebaseAuth, _FBAuth, _FBRef, _FURL, _reqCallbacks = [], _CONFIG = {};

		// public-facing object
		var Phased = {
			SET_UP : false,
			meta : {},					// copy of metadata from server. do not overwrite.
			authData : false,			// copy of authData from firebase authentication callback.
			user : {}						// copy of user profile from server with additional uid key
		}

		/*
		*
		*	CONSTRUCTOR
		*	
		*	1. save references to injected services to local var names
		*	2. init FB objects
		*	3. add event handlers for FB auth and connection states
		*/
		this.$get = ['$rootScope', '$http', '$location', '$window', '$firebaseAuth',
			function $get(_$rootScope, _$http, _$location, _$window, _$firebaseAuth) {
			$rootScope = _$rootScope;
			$http = _$http;
			$location = _$location;
			$window = _$window,
			$firebaseAuth = _$firebaseAuth;

			_FBRef = new Firebase(_FURL);
			_FBAuth = $firebaseAuth(_FBRef);

			// listeners for changes in auth and connection state go here
			_FBAuth.$onAuth(_onAuth);

			return Phased;
		}];

		/*
		*
		*	CONFIG
		*
		*	1. initialize FBRef
		*	2. decide if we're running in 'watch' modes (2-way sync)
		*	3. set bounce routes
		*/
		this.config = function config(prefs = {}) {
			return new Promise(function configPromise(fulfill, reject) {
				// 1. initialize FBRef
				if ('FURL' in prefs) {
					_FURL = prefs.FURL;
				} else {
					// if we don't have firebase our app is dead in the water
					console.warn('No Firebase URL set; the Phased app will not run.');
					reject();
					return;
				}

				// 2. & 3. --> stash these flags for later usage
				_.assign(_CONFIG, prefs);

				fulfill();
			});
		}

		/*
		*
		*	INIT
		* run after user has logged in
		*	starts gathering data from server
		*/
		var _init = function init() {
			return new Promise(function initPromise(fulfill, reject) {
				console.log('init');

				if (!Phased.META_SET_UP)
					_getMeta();

				// if the user is logged into a team
				if (Phased.authData && Phased.user.currentTeam) {
					// initialize the team
					if (_CONFIG.WATCH_TEAM)
						_watchTeam();
					else
						_getTeam();

					// maybe watch some stuff
					if (_CONFIG.WATCH_NOTIFICATIONS) 
						_watchNotifications();
					if (_CONFIG.WATCH_PRESENCE)
						_watchPresence();
					if (_CONFIG.WATCH_INTEGRATIONS)
						_watchIntegrations();
				}

				fulfill();
			})
		}


		/*
		*
		*	User has logged out or left the app
		*
		*/

		var _die = function die(source) {
			console.log('dying of a ' + source);
			// 1. user has logged out
			if (source.toLowerCase() == 'logout') {
				Phased.SET_UP = false;
				Phased.authData = false;
				Phased.user = {};
				delete Phased.team;
			} 
			// 2. normal exit (stash app state here, in localstorage or FB cache key)
			else {

			}
		}



		/*
		**
		**	INTERNAL FUNCTIONS
		**
		*/

    var _registerAsync = function registerAsync(callback, args) {
      if (Phased.SET_UP)
        return callback(args);
      else
        _reqCallbacks.push({callback : callback, args : args });
    }

    var _doAsync = function doAsync() {
      for (var i in _reqCallbacks) {
        _reqCallbacks[i].callback(_reqCallbacks[i].args || undefined);
      }
      Phased.SET_UP = true;
      console.log('Phased:setup', Phased);
			$rootScope.$broadcast('Phased:setup');
    }


    //
  	// INTIALIZING FUNCTIONS
  	//

    /*
    *
    * Gathers all static data, applies to PhasedProvider
    *
    */
    var _getMeta = function getMeta() {
      _FBRef.child('meta').once('value', function(snap) {
        _.assign(Phased.meta, snap.val());
        _doAfterMeta();
      });
    }

    var _doAfterMeta = function doAfterMeta() {
    	Phased.META_SET_UP = true;
    }

    /*
    *
    *	Gathers and watches team data
    *
    */

    var _getTeam = function getTeam() {
    	return new Promise((fulfill, reject) => {
    		console.log('getting team...');
    	});
    }

    //
    //	AUTH FUNCTIONS
    //

    /*
    *	Fills a user's profile
    *	called immediately after auth
    */
    var _fillUserProfile = function fillUserProfile() {
    	return new Promise(function _fillUserProfilePromise(fulfill, reject) {
    		if (!('uid' in Phased.authData)) {
    			console.warn('Cannot gather user information; no UID set.');
    			reject();
    			return;
    		}
    		_FBRef.child('profile/' + Phased.authData.uid).once('value', function (snap) {
    			var data = snap.val();
    			$rootScope.$evalAsync(() => {
	    			_.assign(Phased.user, data, { uid: Phased.authData.uid });

	    			console.log('profile:', Phased.user);
	    			fulfill();
	    		});
    		});
    	});
    }

    /*
    *	Similar to the Phased.login callback
		*	
		*	1. stashes user auth data
		*	2. saves auth token to default POST request
		*	3. bounces user to / if on /login
		*	4. fills user profile data, then calls init
    */
    var _onAuth = function onAuth(authData) {
    	if (authData && 'uid' in authData) {
    		console.log('onAuth');
				// 1. stash auth data
				Phased.authData = authData;
				
				// 2. use token to authenticate with our server
				$http.defaults.headers.post.Authorization = 'Bearer ' + authData.token;
				
				// 3. bounce to '/' if on /login
				if ($location.path().indexOf('login') >= 0)
					$location.path('/');

				// 4.
				_fillUserProfile().then(_init);
			} else {
				// if the user is not logged in, die
				_die('logout');
			}
    }


    /*
    **
    **	EXTERNAL FUNCTIONS
    **
    */

    //
    // AUTH FUNCTIONS
    //

		/*
		*	Log a user in using username and password
		*/
		Phased.login = function login(email, password) {
			_FBAuth.$authWithPassword({email: email, password:password})
		}

		/*
		*	Logs a user out
		*/
		Phased.logout = function logout() {
			console.log('logout');
			_FBAuth.$unauth();
		}
	})