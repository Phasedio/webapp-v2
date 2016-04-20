'use strict';
angular.module('webappV2App')
	.provider('Phased', function PhasedProvider() {
		// private
		var $rootScope,
			$http,
			$location,
			$firebaseAuth,
			_FBAuth,
			_FBRef,
			_FURL,
			_reqCallbacks = [];

		// public-facing object
		var Phased = {
			SET_UP : false,
			meta : {},					// copy of metadata from server. do not overwrite.
			authData : false,			// copy of authData from firebase authentication callback.
			user : {}						// copy of user profile from server with additional uid key
		}

		// run when injected
		this.$get = ['$rootScope', '$http', '$location', '$firebaseAuth',
			function $get(_$rootScope, _$http, _$location, _$firebaseAuth) {
			$rootScope = _$rootScope;
			$http = _$http;
			$location = _$location;
			$firebaseAuth = _$firebaseAuth;

			_FBRef = new Firebase(_FURL);
			_FBAuth = $firebaseAuth(_FBRef);

			return Phased;
		}];

		/*
			run in config block

			1. initialize FBRef
			2. decide if we're running in 'watch' modes (2-way sync)
			3. set bounce routes
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

				// 2.


				fulfill();
			});
		}

		// run after user has logged in
		var _init = function init() {
			return new Promise(function initPromise(fulfill, reject) {
				console.log('init');
				fulfill();
			})
		}

		/*
		**
		**	INTERNAL FUNCTIONS
		**
		*/

    var _registerAsync = function(callback, args) {
      if (Phased.SET_UP)
        return callback(args);
      else
        _reqCallbacks.push({callback : callback, args : args });
    }

    var _doAsync = function() {
      for (var i in _reqCallbacks) {
        _reqCallbacks[i].callback(_reqCallbacks[i].args || undefined);
      }
      Phased.SET_UP = true;
      console.log('Phased:setup', Phased);
			$rootScope.$broadcast('Phased:setup');
    }


    /*
    **
    **  INTIALIZING FUNCTIONS
    **
    */

    /*
    *
    * Gathers all static data, applies to PhasedProvider
    *
    */
    var _initializeMeta = function() {
      _FBRef.child('meta').once('value', function(snap) {
        var data = snap.val();

        // task
        Phased.meta.task = {
          PRIORITY : data.task.PRIORITY,
          PRIORITY_ID : data.task.PRIORITY_ID,

          HISTORY_ID : data.task.HISTORY_ID, // no strings for this one

          STATUS : data.task.STATUS,
          STATUS_ID : data.task.STATUS_ID
        };

        // PROJECT
        Phased.meta.project = {
          PRIORITY : data.project.PRIORITY,
          PRIORITY_ID : data.project.PRIORITY_ID,

          HISTORY : data.project.HISTORY,
          HISTORY_ID : data.project.HISTORY_ID
        };

        // STATUS
        Phased.meta.status.SOURCE = data.status.SOURCE;
        Phased.meta.status.SOURCE_ID = data.status.SOURCE_ID;
        Phased.meta.status.TYPE = data.status.TYPE;
        Phased.meta.status.TYPE_ID = data.status.TYPE_ID;

        // ROLE
        Phased.meta.ROLE = data.ROLE;
        Phased.meta.ROLE_ID = data.ROLE_ID;

        // PRESENCE
        Phased.meta.PRESENCE = data.PRESENCE;
        Phased.meta.PRESENCE_ID = data.PRESENCE_ID;

        // NOTIF
        Phased.meta.NOTIF_TYPE = data.NOTIF_TYPE;
        Phased.meta.NOTIF_TYPE_ID = data.NOTIF_TYPE_ID;

        // doAfterMeta();
      });
    }

    /*
    *	Fills a user's profile
    *	called immediately after auth
    */
    var _fillUserProfile = function _fillUserProfile() {
    	return new Promise(function _fillUserProfilePromise(fulfill, reject) {
    		if (!('uid' in Phased.authData)) {
    			console.warn('Cannot gather user information; no UID set.');
    			reject();
    			return;
    		}
    		_FBRef.child('profile/' + Phased.authData.uid).once('value', function (snap) {
    			var data = snap.val();
    			_.assign(Phased.user, data, { uid: Phased.authData.uid });

    			console.log('profile:', Phased.user);
    			fulfill();
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
			return new Promise(function doLoginPromise(fulfill, reject) {
				_FBAuth.$authWithPassword({email: email, password:password}).then(function authFilled(authData) {
					console.log('auth successful', authData);

					if ('uid' in authData) {
						Phased.authData = authData;
						_fillUserProfile()
							.then(function() {
								fulfill(); // fulfill and then start getting meta
								_init();
							}, reject);
					} else {
						reject(authData);
					}
				}, reject);
			});
		}

		Phased.logout = function logout() {
			console.log('logout');
		}

	})