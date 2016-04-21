'use strict';
angular.module('webappV2App')
	.provider('Phased', function PhasedProvider() {
		// private
		var $rootScope,
			$http,
			$location,
			$window,
			$firebaseAuth,
			_FBAuth,
			_FBRef,
			_FURL,
			_INIT_EVENTS = {
				SET_UP : 'Phased.setup',
				META_SET_UP : 'Phased.meta',
				TEAM_SET_UP : 'Phased.teamComplete',
				MEMBERS_SET_UP : 'Phased.membersComplete',
				PROJECTS_SET_UP : 'Phased.projectsComplete',
				STATUSES_SET_UP : 'Phased.statusesComplete'
			},
			_RUNTIME_EVENTS = {
				STATUS_NEW : 'Phased:newStatus',
				STATUS_CHANGED : 'Phased:changedStatus',
				STATUS_DELETED : 'Phased:deletedStatus',

				TASK_NEW : 'Phased:newTask',
				TASK_CHANGED : 'Phased:changedTask',
				TASK_DELETED : 'Phased:deletedTask',

				PROJECT_NEW : 'Phased:newProject',
				PROJECT_CHANGED : 'Phased:changedProject',
				PROJECT_DELETED : 'Phased:deletedProject',
			},
			// tasks to do after the indicated events
			_toDoAfter = {
				SET_UP : [],
				META_SET_UP : [],
				TEAM_SET_UP : [],
				MEMBERS_SET_UP : [],
				PROJECTS_SET_UP : [],
				STATUSES_SET_UP : []
			},
			_CONFIG = {},
			_DEFAULTS = {
				STATUS_LIMIT : 30,
				TEAM : {
					details : {},
					members : {},
					statuses : {},
					projects : {}
				}
			};

		// public-facing object
		var Phased = {
			// init status flags
			SET_UP : false,
			META_SET_UP : false,
			TEAM_SET_UP : false,
			MEMBERS_SET_UP : false,
			PROJECTS_SET_UP : true,
			STATUSES_SET_UP : true,
			meta : {},						// copy of metadata from server. do not overwrite.
			authData : false,			// copy of authData from firebase authentication callback.
			user : {},						// copy of user profile from server with additional uid key
			team : angular.copy(_DEFAULTS.TEAM)
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

		//
		// ASYNC INTERFACE
		//

		/*
		*	Registers a job to be done now or after event has happened
		*
		*	eg: _registerAfterEvent('SET_UP', countTo, 5) // will call countTo(5) as soon as Phased.SET_UP
		*/
    var _registerAfter = function registerAfter(event, callback, args) {
    	if (!(event in _INIT_EVENTS)) {
    		console.warn(`${event} is not a valid event`);
    		return;
    	}

      if (Phased[event])			// call immediately, or
        return callback(args);
      else										// save for later
        _toDoAfter[event].push({callback : callback, args : args });
    }

    /*
    *	called to emit a specific event
    *
    *	1. do all callbacks needing to be done after that event
    *	2. set that event's flag to true
    *	3. broadcast event through rootScope
    */
    var _doAfter = function doAfter(event) {
    	if (!(event in _INIT_EVENTS)) {
    		console.warn(`${event} is not a valid event`);
    		return;
    	}

    	$rootScope.$evalAsync(() => {
	      for (let i in _toDoAfter[event]) {
	        _toDoAfter[event][i].callback(_toDoAfter[event][i].args || undefined);
	      }
	      Phased[event] = true;
	      console.log(`${_INIT_EVENTS[event]}`, Phased);
				$rootScope.$broadcast(`${_INIT_EVENTS[event]}`);

				_maybeFinalizeSetup();
			});
    }

    /*
    *	If all _INIT_EVENTS are fired, fire SET_UP
    *
    */
    var _maybeFinalizeSetup = function maybeFinalizeSetup() {
    	// do nothing if an event other than SET_UP hasn't passed
    	// or if SET_UP already passed
    	if (Phased.SET_UP) return;

    	for (let event in _INIT_EVENTS) {
    		if (event != 'SET_UP' && !Phased[event]) return;
    	}
    	_doAfter('SET_UP');
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
        _doAfter('META_SET_UP');
      });
    }

    /*
    *	Gathers team data
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
			_FBAuth.$unauth();
		}
	})