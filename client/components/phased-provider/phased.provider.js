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
				SET_UP : 'Phased:setup',
				META_SET_UP : 'Phased:meta',
				PROFILE_SET_UP : 'Phased:profileComplete',
				TEAM_SET_UP : 'Phased:teamComplete',
				MEMBERS_SET_UP : 'Phased:membersComplete',
				PROJECTS_SET_UP : 'Phased:projectsComplete',
				STATUSES_SET_UP : 'Phased:statusesComplete'
			},
			_RUNTIME_EVENTS = {
				// NB: Phased:login is broadcast immediately after firebase auth
				// and therefore before any data has been loaded from the server
				LOGIN : 'Phased:login', 
				LOGOUT : 'Phased:logout',

				STATUS_NEW : 'Phased:newStatus',
				STATUS_CHANGED : 'Phased:changedStatus',
				STATUS_DELETED : 'Phased:deletedStatus',

				TASK_NEW : 'Phased:newTask',
				TASK_CHANGED : 'Phased:changedTask',
				TASK_DELETED : 'Phased:deletedTask',

				PROJECT_NEW : 'Phased:newProject',
				PROJECT_CHANGED : 'Phased:changedProject',
				PROJECT_DELETED : 'Phased:deletedProject'
			},
			// tasks to do after the indicated events
			_toDoAfter = {
				SET_UP : [],
				META_SET_UP : [],
				PROFILE_SET_UP : [],
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
			},
			_oldestStatusTime = new Date().getTime();

		// public-facing object
		var Phased = {
			// init status flags
			SET_UP : false,
			LOGGED_IN : false,
			META_SET_UP : false,
			PROFILE_SET_UP : false,
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
				console.log('init', Phased);

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
			});
		}


		/*
		*	User has logged out or left the app
		*	reset PhasedProvider for new _init
		*
		*/

		var _die = function die(source) {
			console.log('dying of a ' + source);
			// 1. user has logged out
			if (source.toLowerCase() == 'logout') {
				// reset all init events
				for (let event in _INIT_EVENTS)
					Phased[event] = false;
				
				Phased.authData = false;
				Phased.LOGGED_IN = false;
				Phased.user = {};
				Phased.team = angular.copy(_DEFAULTS.TEAM);

				// broadcast logout
				$rootScope.$broadcast(_RUNTIME_EVENTS.LOGOUT);
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

      if (Phased[event]) {			// call immediately, or
        return new Promise((fulfill, reject) => {
        	callback(args, fulfill, reject);
        });
      } else {										// save for later
        return new Promise((fulfill, reject) => {
        	_toDoAfter[event].push({callback : callback, args : args, fulfill: fulfill, reject: reject });
        });
      }
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
	      	let job = _toDoAfter[event][i];
	        job.callback(job.args || undefined, job.fulfill, job.reject);
	      }
	      Phased[event] = true;
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
    	console.log('getting team...');
    	var teamID = Phased.team.uid = Phased.user.currentTeam,
    		props = ['details', 'members', 'statuses'],
    		completed = [];

    	var maybeTeamComplete = prop => {
    		completed.push(prop);
    		// if props == completed
    		if (_.xor(props, completed).length == 0)
    			_doAfter('TEAM_SET_UP');
    	}

    	// details
    	_FBRef.child('team/' + teamID + '/details').once('value', snap => {
    		_.assign(Phased.team.details, snap.val());
    		maybeTeamComplete('details');
    	});

    	// members
    	_FBRef.child('team/' + teamID + '/members').once('value', snap => {
    		_.assign(Phased.team.members, snap.val());
    		maybeTeamComplete('members');
    		_getMembers();
    	});

    	// statuses (limited)
    	_FBRef.child('team/' + teamID + '/statuses')
    	.limitToLast(_DEFAULTS.STATUS_LIMIT).once('value', snap => {
    		_.assign(Phased.team.statuses, snap.val());
    		// find oldest status time and save val for pagination
        for (var i in Phased.team.statuses) {
    			if (Phased.team.statuses[i].time < _oldestStatusTime)
    				_oldestStatusTime = Phased.team.statuses[i].time;
    		}
    		maybeTeamComplete('statuses');
    	});
    }

    /*
    *	Gathers team member profiles
    *
    */
    var _getMembers = function getMembers() {
    	var membersCollected = 0,
    		membersToGet = Object.keys(Phased.team.members).length,
    		maybeMembersComplete = () => {
    			membersCollected++;
    			if (membersCollected == membersToGet)
    				_doAfter('MEMBERS_SET_UP');
    		}

    	for (let uid in Phased.team.members) {
    		let member = Phased.team.members[uid];

    		if (uid == Phased.authData.uid) {
    			_.assign(Phased.team.members[uid], Phased.user);
    			maybeMembersComplete();
    		} else {
    			_FBRef.child(`profile/${uid}`).once('value', snap => {
    				_.assign(Phased.team.members[uid], snap.val());
    				maybeMembersComplete();
    			});
    		}
    	}
    }

    /*
    *	watches team data
    *
    */
    var _watchTeam = function watchTeam() {
    	var teamID = Phased.team.uid = Phased.user.currentTeam,
    		props = ['details', 'members', 'statuses'],
    		completed = [];

    	var maybeTeamComplete = prop => {
    		if (Phased.TEAM_SET_UP) return;
    		completed.push(prop);
    		// if props == completed
    		if (_.xor(props, completed).length == 0)
    			_doAfter('TEAM_SET_UP');
    	}

    	// details
    	_FBRef.child('team/' + teamID + '/details').on('value', snap => {
    		$rootScope.$evalAsync(() => {
	    		_.assign(Phased.team.details, snap.val());
	    	});
    		maybeTeamComplete('details');
    	});

    	// members
    	// get list of members on team currently
    	_FBRef.child('team/' + teamID + '/members').once('value', snap => {
    		_.assign(Phased.team.members, snap.val());
    		maybeTeamComplete('members');
    	});

    	// always keep profile data in sync for any members on team
    	_FBRef.child(`team/${teamID}/members`).on('child_added', snap => {
    		let uid = snap.key();
    		Phased.team.members[uid] = snap.val();
    		_watchMember(uid);
    	});

    	// delete members from team when removed; also unwatch
    	_FBRef.child(`team/${teamID}/members`).on('child_removed', snap => {
    		let uid = snap.key();
    		_FBRef.child(`team/${teamID}/members/${uid}`).off('value'); // unwatch
    		$rootScope.$evalAsync(() => {
    			delete Phased.team.members[uid]; // delete from team
    		});
    	})

    	// statuses (limited to 30 and newer)
    	// get most recent 30
    	_FBRef.child(`team/${teamID}/statuses`)
    	.limitToLast(_DEFAULTS.STATUS_LIMIT).once('value', snap => {
    		_.assign(Phased.team.statuses, snap.val());
    		// find oldest status time and save val for pagination
        for (var i in Phased.team.statuses) {
    			if (Phased.team.statuses[i].time < _oldestStatusTime)
    				_oldestStatusTime = Phased.team.statuses[i].time;
    		}
    		maybeTeamComplete('statuses');
    	});
			
			// watch for statuses added after what we've already collected are added
			_FBRef.child(`team/${teamID}/statuses`)
			.orderByChild('time').startAt(new Date().getTime())
			.on('child_added', snap => {
				$rootScope.$evalAsync(() => {
					Phased.team.statuses[snap.key()] = snap.val();
					$rootScope.$broadcast(_RUNTIME_EVENTS.STATUS_NEW);
				});
			});

			// watch for changes
			_FBRef.child(`team/${teamID}/statuses`)
			.limitToLast(_DEFAULTS.STATUS_LIMIT).on('child_changed', snap => {
				$rootScope.$evalAsync(() => {
	        Phased.team.statuses[snap.key()] = snap.val();
	        $rootScope.$broadcast(_RUNTIME_EVENTS.STATUS_CHANGED);
	      });
			});

			// watch for removed statuses
			_FBRef.child(`team/${teamID}/statuses`)
			.limitToLast(_DEFAULTS.STATUS_LIMIT).on('child_removed', snap => {
				let key = snap.key();
				if (key in Phased.team.statuses) {
					$rootScope.$evalAsync(() => {
						delete Phased.team.statuses[key];
						$rootScope.$broadcast(_RUNTIME_EVENTS.STATUS_DELETED);
					});
				}
			});
    }

    /*
		*	Set up data binding for a single member on a team
		*
		*	if MEMBERS_SET_UP hasn't been fired, check if it should be
    */
    var _watchMember = function watchMember(uid) {
    	// set up data binding for members
    	_FBRef.child(`profile/${uid}`).on('value', snap => {
    		$rootScope.$evalAsync(() => {
    			_.assign(Phased.team.members[uid], snap.val());

	    		// possibly fire event
		    	if (!Phased.MEMBERS_SET_UP) {
		    		// if any member doesn't have their profile data, don't fire event
		    		for (let i in Phased.team.members) {
		    			if (!Phased.team.members[i].name) return;
		    		}

						_doAfter('MEMBERS_SET_UP');
		    	}
		    });
    	});

    	// always keep profile data in sync for any members on team
    	_FBRef.child(`team/${Phased.team.uid}/members`).on('child_changed', snap => {
    		$rootScope.$evalAsync(() => {
    			_.assign(Phased.team.members[snap.key()], snap.val());
    		});
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
		* 3. broadcast login
		*	4. fills user profile data, then calls init
    */
    var _onAuth = function onAuth(authData) {
    	if (authData && 'uid' in authData) {
				// 1. stash auth data
				Phased.authData = authData;
				
				// 2. use token to authenticate with our server
				$http.defaults.headers.post.Authorization = 'Bearer ' + authData.token;

				// 3. broadcast login
				Phased.LOGGED_IN = true;
				$rootScope.$broadcast(_RUNTIME_EVENTS.LOGIN);

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
    * broadcasts Phased:profileComplete
    */
    var _fillUserProfile = function fillUserProfile() {
    	return new Promise(function _fillUserProfilePromise(fulfill, reject) {
    		if (!('uid' in Phased.authData)) {
    			console.warn('Cannot gather user information; no UID set.');
    			reject();
    			return;
    		}
    		_FBRef.child('profile/' + Phased.authData.uid).on('value', function (snap) {
    			$rootScope.$evalAsync(() => {
	    			_.assign(Phased.user, snap.val(), { uid: Phased.authData.uid });
	    			_doAfter('PROFILE_SET_UP');
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
			return _FBAuth.$authWithPassword({email: email, password:password});
		}

		/*
		*	Logs a user out
		*/
		Phased.logout = function logout() {
			_FBAuth.$unauth();
		}


		/*
		*	Posts a generic status update
		*/
		Phased.postStatus = function postStatus(name, args = {}) {
			args.name = name; // to allow simple syntax: Phased.postStatus('my status');
			return _registerAfter('META_SET_UP', _doPostStatus, args);
		}

		/*
		*	Post a generic status update
		*	ALL STATUS UPDATES SHOLD USE THIS METHOD
		*
		*	1. check that properties are valid
		*	2. post to team
		*	3. update own currentStatus
		*/
		var _doPostStatus = function doPostStatus(args = {}, fulfill, reject) {
			const {name, type, projectID, taskID, startTime, endTime} = args;

			var newStatus = {
				user: Phased.user.uid,
				time: Firebase.ServerValue.TIMESTAMP // always posted as now
			};

			// 1. PROP VALIDATION
			// name
			if (!('name' in args) || typeof args.name != 'string') {
				console.warn('Cannot post a blank status update!');
				reject();
				return;
			} else {
				newStatus.name = name;
			}

			// type (should be, eg, Phased.meta.status.TYPE_ID.REPO_PUSH)
			if (type) {
				if (!(type in Phased.meta.status.TYPE))
					console.warn('Status type not available; posting plain status.');
				else
					newStatus.type = type;
			} else {
				newStatus.type = Phased.meta.status.TYPE_ID.UPDATE
			}

			// startTime
			if (startTime) {
				if (typeof startTime != 'number') {
					console.warn('Status startTime should be a timeStamp or null; posting as now.');
					newStatus.startTime = Firebase.ServerValue.TIMESTAMP;
				}  else {
					newStatus.startTime = startTime;
				}
			} else {
				console.warn('No startTime for status; posting as now.');
				newStatus.startTime = Firebase.ServerValue.TIMESTAMP;
			}

			// endTime
			if (endTime) {
				if (typeof endTime != 'number') {
					console.warn('Status endTime should be a timeStamp or null; posting without.');
				}  else {
					newStatus.endTime = endTime;
				}
			}

			// projectID
			if (projectID) {
				if (typeof projectID != 'string')
					console.warn('Status projectID should be a string or null; posting without.');
				else
					newStatus.projectID = projectID;
			}
			
			// taskID
			if (taskID) {
				if (typeof taskID != 'string')
					console.warn('Status taskID should be a string or null; posting without.');
				else
					newStatus.taskID = taskID;
			}

			// 2. POST TO TEAM
			var statusRef = _FBRef.child(`team/${Phased.team.uid}/statuses`).push(newStatus);

			// 3. POST TO USER
			_FBRef.child(`team/${Phased.team.uid}/members/${Phased.user.uid}/currentStatus`).set(statusRef.key());

			// fulfill promise
			fulfill();
		}
	})