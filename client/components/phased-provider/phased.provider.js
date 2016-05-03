'use strict';
angular.module('webappV2App')
.provider('Phased', function PhasedProvider() {
		// private
		var $rootScope,
		$http,
		$location,
		$window,
		_FBRef,
		_FURL,
		_appConfig,
		_INIT_EVENTS = {
			SET_UP : 'Phased:setup',
			META_SET_UP : 'Phased:meta',
			PROFILE_SET_UP : 'Phased:profileComplete',
			TEAM_SET_UP : 'Phased:teamComplete',
			MEMBERS_SET_UP : 'Phased:membersComplete',
			TASKS_SET_UP : 'Phased:tasksComplete',
			STATUSES_SET_UP : 'Phased:statusesComplete'
		},
		_RUNTIME_EVENTS = {
			// NB: Phased:login is broadcast immediately after firebase auth
			// and therefore before any data has been loaded from the server
			LOGIN : 'Phased:login', 
			LOGOUT : 'Phased:logout',

			STATUS_ADDED : 'Phased:newStatus',
			STATUS_CHANGED : 'Phased:changedStatus',
			STATUS_DELETED : 'Phased:deletedStatus',

			TASK_ADDED : 'Phased:newTask',
			TASK_CHANGED : 'Phased:changedTask',
			TASK_DELETED : 'Phased:deletedTask'
		},
		// tasks to do after the indicated events
		_toDoAfter = {
			SET_UP : [],
			META_SET_UP : [],
			PROFILE_SET_UP : [],
			TEAM_SET_UP : [],
			MEMBERS_SET_UP : [],
			TASKS_SET_UP : [],
			STATUSES_SET_UP : []
		},
		_CONFIG = {},
		_DEFAULTS = {
			STATUS_LIMIT : 30,
			TEAM : {
				details : {},
				members : {},
				statuses : {},
				tasks : {}
			}
		},
		_oldestStatusTime = new Date().getTime(),
		_getUTCTimecode;

		// public-facing object
		var Phased = {
			// init status flags
			SET_UP : false,
			LOGGED_IN : false,
			META_SET_UP : false,
			PROFILE_SET_UP : false,
			TEAM_SET_UP : false,
			MEMBERS_SET_UP : false,
			TASKS_SET_UP : false,
			STATUSES_SET_UP : false,
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
		this.$get = ['$rootScope', '$http', '$location', '$window', 'getUTCTimecode', 'appConfig',
		function $get(_$rootScope_, _$http_, _$location_, _$window_, _getUTCTimecode_, _appConfig_) {
			$rootScope = _$rootScope_;
			$http = _$http_;
			$location = _$location_;
			$window = _$window_;
			_getUTCTimecode = _getUTCTimecode_;
			_appConfig = _appConfig_;

			_FBRef = new Firebase(_FURL);

			// listeners for changes in auth and connection state go here
			_FBRef.onAuth(_onAuth);

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
			// console.log('dying of a ' + source);
			// 1. user has logged out
			if (source.toLowerCase() == 'logout') {
				$rootScope.$evalAsync(() => {
					// reset all init events
					for (let event in _INIT_EVENTS)
						Phased[event] = false;
					
					Phased.authData = false;
					Phased.LOGGED_IN = false;
					Phased.user = {};
					Phased.team = angular.copy(_DEFAULTS.TEAM);

					// broadcast logout
					$rootScope.$broadcast(_RUNTIME_EVENTS.LOGOUT);
				});
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
		*	Registers a job to be done now or after all events in conditions have happened
		*
		*	eg: _registerAfter('SET_UP', countTo, 5) // will call countTo(5) as soon as Phased.SET_UP
		*	eg: _registerAfter(['META_SET_UP', 'PROFILE_SET_UP'], countTo, 5) // will call once after both Phased.META_SET_UP and PROFILE_SET_UP have passed
		*/
		var _registerAfter = function registerAfter(conditions, callback, args) {
    	// if there is only one condition, make it into an array
    	if (typeof conditions == 'string')
    		conditions = [conditions];

    	// for each condition,
    	//	a) check it is valid
    	//	b) if it's met, remove from remaining conditions to check for
    	for (var i = conditions.length -1; i >= 0; i--) { // start at end so we can rm els
    		let event = conditions[i];

    		if (!(event in _INIT_EVENTS)) {
    			console.warn(`${event} is not a valid event`);
    			return;
    		}

	    	// remove condition if passed
	    	if (Phased[event]) {
	    		conditions.pop(i);
	    	}
	    }

	    // if no more conditions remain, do immediately;
	    if (conditions.length < 1) {
	    	return new Promise((fulfill, reject) => {
	    		callback(args, fulfill, reject);
	    	});
	    }

	    // otherwise, register to do after each remaining condition
	    return new Promise((fulfill, reject) => {
	    	var thisJob = {
	    		callback : callback,
	    		args : args,
	    		fulfill: fulfill,
	    		reject: reject,
	    		conditions: conditions
	    	}
	    	for (var i in conditions) {
	    		let event = conditions[i];
	    		_toDoAfter[event].push(thisJob);
	    	}
	    });
	  }

    /*
    *	called to emit a specific event
    *
    *	1. do all callbacks needing to be done after that event
    *		only do these if their other conditions have also been met
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
	      	let job = _toDoAfter[event][i]; // job should be the same object in other locations in _toDoAfter
	      	// check if job has remaining conditions
	      	if (job.conditions.length > 1) {
	      		// more conditions other than this remain; don't do job
	      		// but DO remove own condition (as it has passed)
	      		job.conditions.pop(job.conditions.indexOf(event));
	      	} else {
	      		// no more conditions remain; do job
	      		job.callback(job.args || undefined, job.fulfill, job.reject);
	      	}
	      }
	      // clear saved jobs for this event
	      _toDoAfter[event] = [];

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
    	props = ['details', 'members', 'statuses', 'tasks'],
    	completed = [];

    	var maybeTeamComplete = prop => {
    		completed.push(prop);
    		// if props == completed
    		if (_.xor(props, completed).length == 0)
    			_doAfter('TEAM_SET_UP');
    	}

    	// details
    	_FBRef.child(`team/${teamID}/details`).once('value', snap => {
    		_.assign(Phased.team.details, snap.val());
    		maybeTeamComplete('details');
    	});

    	// members
    	_FBRef.child(`team/${teamID}/members`).once('value', snap => {
    		_.assign(Phased.team.members, snap.val());
    		maybeTeamComplete('members');
    		_getMembers();
    	});

    	// statuses (limited)
    	_FBRef.child(`team/${teamID}/statuses`)
    	.limitToLast(_DEFAULTS.STATUS_LIMIT).once('value', snap => {
    		_.assign(Phased.team.statuses, snap.val());
    		// find oldest status time and save val for pagination
    		for (var i in Phased.team.statuses) {
    			if (Phased.team.statuses[i].time < _oldestStatusTime)
    				_oldestStatusTime = Phased.team.statuses[i].time;
    		}
    		_doAfter('STATUSES_SET_UP');
    		maybeTeamComplete('statuses');
    	});

    	// all tasks
    	_FBRef.child(`team/${teamID}/tasks`).once('value', snap => {
    		_.assign(Phased.team.tasks, snap.val());
    		_doAfter('TASKS_SET_UP');
    		maybeTeamComplete('tasks');
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
    			_.assign(Phased.team.members[uid].profile, Phased.user);
    			maybeMembersComplete();
    		} else {
    			_FBRef.child(`profile/${uid}`).once('value', snap => {
    				_.assign(Phased.team.members[uid].profile, snap.val());
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
    	completed = [],
    	now = moment.utc().unix();

    	var maybeTeamComplete = prop => {
    		if (Phased.TEAM_SET_UP) return;
    		completed.push(prop);
    		// if props == completed
    		if (_.xor(props, completed).length == 0)
    			_doAfter('TEAM_SET_UP');
    	}

    	//
    	// details
    	_FBRef.child(`team/${teamID}/details`).on('value', snap => {
    		$rootScope.$evalAsync(() => {
    			_.assign(Phased.team.details, snap.val());
    		});
    		maybeTeamComplete('details');
    	});

    	//
    	// members
    	// get list of members on team currently
    	_FBRef.child(`team/${teamID}/members`).once('value', snap => {
    		_.assign(Phased.team.members, snap.val());
    		maybeTeamComplete('members');
    	});

    	// always keep profile data in sync for any members on team
    	_FBRef.child(`team/${teamID}/members`).on('child_added', snap => {
    		let uid = snap.key();
    		_.assign(Phased.team.members[uid], snap.val());
    		_watchMember(uid);
    	});

    	// delete members from team when removed; also unwatch
    	_FBRef.child(`team/${teamID}/members`).on('child_removed', snap => {
    		let uid = snap.key();
    		_FBRef.child(`team/${teamID}/members/${uid}`).off('value'); // unwatch
    		$rootScope.$evalAsync(() => {
    			delete Phased.team.members[uid]; // delete from team
    		});
    	});

    	//
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
    		_doAfter('STATUSES_SET_UP');
    		maybeTeamComplete('statuses');
    	});

			// watch for statuses added after what we've already collected are added
			_FBRef.child(`team/${teamID}/statuses`)
			.orderByChild('time').startAt(new Date().getTime())
			.on('child_added', snap => {
				$rootScope.$evalAsync(() => {
					Phased.team.statuses[snap.key()] = snap.val();
					$rootScope.$broadcast(_RUNTIME_EVENTS.STATUS_ADDED);
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

			//
			// tasks
    	// get list of members on team currently
    	_FBRef.child(`team/${teamID}/tasks`)
    	.orderByChild('created').endAt(now)
    	.once('value', snap => {
    		_.assign(Phased.team.tasks, snap.val());
    		
    		for (let uid in Phased.team.tasks)
    			_watchTask(uid);

    		_doAfter('TASKS_SET_UP');
    		maybeTeamComplete('tasks');
    	});

    	// watch tasks
    	_FBRef.child(`team/${teamID}/tasks`)
    	.orderByChild('created').startAt(now)
    	.on('child_added', snap => {
    		let uid = snap.key();
    		Phased.team.tasks[uid] = snap.val();
    		_watchTask(uid);
    		$rootScope.$broadcast(_RUNTIME_EVENTS.TASK_ADDED);
    	});

    	// delete and unwatch tasks
    	_FBRef.child(`team/${teamID}/tasks`).on('child_removed', snap => {
    		let uid = snap.key();
    		_FBRef.child(`team/${teamID}/tasks/${uid}`).off('value'); // unwatch
    		$rootScope.$evalAsync(() => {
  				delete Phased.team.tasks[uid]; // delete from team	
  				$rootScope.$broadcast(_RUNTIME_EVENTS.TASK_DELETED);
  			});
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
    			var _newVals = snap.val();
    			Phased.team.members[uid].profile = Phased.team.members[uid].profile || {};
    			_.assign(Phased.team.members[uid].profile, _newVals); 			// add new values
    			_.forOwn(Phased.team.members[uid].profile, (val, key) => {	// remove possibly deleted ones
    				if (!_newVals.hasOwnProperty(key))
    					delete Phased.team.members[uid].profile[key];
    			});

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
    			var uid = snap.key(), _newVals = snap.val();
    			_.assign(Phased.team.members[uid], _newVals);
    			_.forOwn(Phased.team.members[uid], (val, key) => {	// remove possibly deleted ones (other than profile)
    				if (key !== 'profile' && !_newVals.hasOwnProperty(key))
    					delete Phased.team.members[uid][key];
    			});
    		});
    	});
    }

    /*
		*	Set up data binding for a single task on a team
		*	broadcasts TASK_CHANGED
		*/
		var _watchTask = function watchTask(uid) {
			var teamID = Phased.team.uid;
			_FBRef.child(`team/${teamID}/tasks/${uid}`).on('value', snap => {
				$rootScope.$evalAsync(() => {
					var uid = snap.key(), _newVals = snap.val();
					if (!!_newVals) {
		  			_.assign(Phased.team.tasks[uid], _newVals); 			// add new values
		  			_.forOwn(Phased.team.tasks[uid], (val, key) => {	// remove possibly deleted ones
		  				if (!_newVals.hasOwnProperty(key))
		  					delete Phased.team.tasks[uid][key];
		  			});
		  			$rootScope.$broadcast(_RUNTIME_EVENTS.TASK_CHANGED);
		  		} else {
		  			delete Phased.team.tasks[uid];
		  			$rootScope.$broadcast(_RUNTIME_EVENTS.TASK_DELETED);
		  		}
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
    *	Fills logged in user's profile
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
			return _FBRef.authWithPassword({email: email, password:password});
		}

		/*
		*	Logs a user out
		*/
		Phased.logout = function logout() {
			_FBRef.unauth();
		}

		/*
		*	Posts a generic status update
		*/
		Phased.postStatus = function postStatus(args = {}) {
			if (typeof args == 'string')
				args = {name : args};
			return _registerAfter(['TEAM_SET_UP', 'META_SET_UP', 'PROFILE_SET_UP'], _doPostStatus, args);
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
			statusRef.then(() => {
				_FBRef.child(`team/${Phased.team.uid}/members/${Phased.user.uid}/currentStatus`).set(statusRef.key(), (err) => {
					if (err) {
						reject(err);
					} else {
						fulfill();
					}
				});
			}, reject);
		}

		/*
		*	Creates an assignment
		*/
		Phased.addTask = function addTask(task = {}) {
			return _registerAfter(['TEAM_SET_UP', 'META_SET_UP', 'PROFILE_SET_UP'], _doAddTask, task);
		}

		/*
		*	Post new task to the team
		*	ALL TASK CREATION SHOLD USE THIS METHOD
		*
		*	1. check that properties are valid
		*		- supplies "created" timestamp and CREATED status
		*		- requires "name" and either "to" or "assignment"
		*			- when using "to", will assume current user as "by". use "assignment" obj to bypass.
		*		- optionally "dueDate", "description", "tags"
		*			- "dueDate" can be Date, Moment, or timestamp
		*				- when Date or timestamp, assumed to be in local time
		*				- when Moment, can be either (Moment keeps track internally - see documentation for moment#utc)
		*				- does NOT check if due date is in the future
		*			- "tags" can be either an array of tags or an object with tags as keys and truthy values
		*				- not yet implemented
		*	2. post to team
		*/
		var _doAddTask = function doAddTask(args = {}, fulfill, reject) {
			const {name, dueDate, description, to, assignment, tags} = args;

			if (typeof args != 'object') {
				var msg = 'Phased.addTask expects an object; got ' + (typeof args);
				console.warn(msg);
				reject(new Error(msg));
				return;
			}
			
			var newTask = {
				created: Firebase.ServerValue.TIMESTAMP, // now
				status: Phased.meta.task.STATUS_ID.CREATED
			}

			// 1. PROP VALIDATION
			// name
			if (!('name' in args) || typeof name != 'string') {
				var msg = 'Cannot post a nameless task!';
				console.warn(msg);
				reject(new Error(msg));
				return;
			} else {
				newTask.name = name;
			}

			// description
			if (!!description) {
				if (typeof description == 'string')
					newTask.description = description;
				else
					console.warn('task.description should be a string; got ' + (typeof description));
			}
			
			// assignment or to
			// prefer to
			if (!!to) {
				if (typeof to == 'string' && to in Phased.team.members) {
					newTask.assignment = {
						to : to,
						by : Phased.user.uid
					};
				} else {
					var msg = 'task.to must be the UID for a team member; got ' + (typeof to);
					console.warn(msg, to);
					reject(new Error(msg));
					return;
				}
			} else if (!!assignment) {
				if (typeof assignment == 'object') {
					if ('to' in assignment && 'by' in assignment) {
						if (assignment.to in Phased.team.members && assignment.by in Phased.team.members) {
							newTask.assignment = {
								to : assignment.to,
								by : assignment.by
							}
						}
					} else {
						var msg = 'task.assignment should be an object with "to" and "by" keys; got ' + (typeof assignment);
						console.warn(msg);
						reject(new Error(msg));
						return;
					}
				} else {
					var msg = 'task.assignment should be an object with "to" and "by" keys; got ' + (typeof assignment);
					console.warn(msg);
					reject(new Error(msg));
					return;
				}
			} else {
				var msg = 'Neither task.to nor task.assignment were set; one or the other is required.';
				console.warn(msg);
				reject(new Error(msg));
				return;
			}

			// dueDate (could be Date, Moment, or timestamp)
			if (dueDate) {
				let timecode = _getUTCTimecode(dueDate);
				if (!!timecode) {
					newTask.dueDate = timecode;
				} else {
					console.warn('"dueDate" should be a Date, Moment, or numeric timestamp. Not using supplied value (' + typeof dueDate + ')');
				}
			}

			// tags
			if (tags) {
				console.warn('Task tags are not implemented yet.');
			}

			// 2. SEND TO SERVER
			console.log('new task', newTask);

			_FBRef.child(`team/${Phased.team.uid}/tasks`).push(newTask).then(fulfill, reject);
		}

		/*
		*	Generic task editing
		*/
		Phased.editTask = function editTask(taskID = '', vals = {}) {
			return _registerAfter(['TASKS_SET_UP', 'TEAM_SET_UP', 'META_SET_UP', 'PROFILE_SET_UP'], _doEditTask, {taskID : taskID, vals : vals});
		}

		/*
		*	Tries to update all valid key-values in args.vals for the task with ID args.taskID
		*/
		var _doEditTask = function doEditTask(args = {}, fulfill = ()=>{}, reject = ()=>{}) {
			const {vals, taskID} = args;
			const params = {
				string 	: ['name', 'description'],
				date 		: ['dueDate'],
				user 		: ['assignment.to', 'assignment.by'],
				meta 		: [{
					path : 'status',
					metaLocation : 'task.STATUS',
					metaIDLocation : 'task.STATUS_ID'
				}]
			};
			var update = {};

			// reject if bad inputs
			if (typeof taskID != 'string' || typeof vals != 'object') {
				var msg = `Phased.editTask expects a taskID and an object; got ${typeof taskID} and ${typeof vals}`;
				console.warn(msg);
				reject(new Error(msg));
				return;
			}

			// reject if task doesn't exist
			if (!(taskID in Phased.team.tasks)) {
				var msg = `${taskID} is not an extant task for the current team (did you mean to call Phased.addTask?)`;
				console.warn(msg);
				reject(new Error(msg));
				return;
			}

			// check all strings
			for (var i = params.string.length - 1; i >= 0; i--) {
				let path = params.string[i];
				let val = _.get(vals, path);
				if (typeof val == 'string') {
					_.set(update, path, val);
				}
			}

			// check all dates
			for (var i = params.date.length - 1; i >= 0; i--) {
				let path = params.date[i];
				let val = _.get(vals, path);

				if (!!val) {
					let timecode = _getUTCTimecode(val);
					if (!!timecode)
						_.set(update, path, timecode);
					else
						console.warn(`${typeof val} "${val}" at ${path} is not a valid date-like object; ignoring`);
				}
			}

			// check all user IDs
			for (var i = params.user.length - 1; i >= 0; i--) {
				let path = params.user[i];
				let val = _.get(vals, path);
				if (typeof val == 'string' && val in Phased.team.members)
					_.set(update, path, val);
				else if (val !== undefined)
					console.warn(`${typeof val} "${val}" at ${path} is not the ID of a current team member; ignoring`);
			}

			// ensure assignment.by is the current user if assignment.to has changed and assignment.by is not set
			// registering the conditions as functions in order to avoid variable reference errors
			var updateHasAssignment = !!update.assignment;
			var taskHasAssignment = !!Phased.team.tasks[taskID].assignment;
			var updateAssignmentDiffThanCurrent = () => !!update.assignment.to && update.assignment.to !== Phased.team.tasks[taskID].assignment.to;
			var updateHasNoAssigner = () => !update.assignment.by;
			if (updateHasAssignment && updateHasNoAssigner() && (!taskHasAssignment || (taskHasAssignment && updateAssignmentDiffThanCurrent()))) {
				update.assignment.by = Phased.user.uid;
			}

			// check all meta
			for (var i = params.meta.length - 1; i >= 0; i--) {
				let path = params.meta[i].path;
				let val = _.get(vals, path);
				let metaLocation = _.get(Phased.meta, params.meta[i].metaLocation);
				let metaIDLocation = _.get(Phased.meta, params.meta[i].metaIDLocation);
				
				if (typeof val == 'string') {
					let maybeID = _.findKey(metaLocation, (o) => o === val );
					if (val in metaIDLocation) {
						// val is valid name of meta ID (eg, 'ASSIGNED' for Phased.meta.task.STATUS_ID.ASSIGNED)
						_.set(update, path, metaIDLocation[val]);
					} else if (!!maybeID) {
						// val is valid description of meta (eg, 'In progress' for Phased.meta.task.STATUS[0])
						_.set(update, path, maybeID);
					}
				} else if (typeof val == 'number' && val in metaLocation) {
					// val is valid ID of meta
					_.set(update, path, val);
				} else if (val !== undefined) {
					// invalid
					console.warn(`${typeof val} "${val}" at ${path} is neither a valid meta ID nor meta name; ignoring`);
				}
			}

			_FBRef.child(`team/${Phased.team.uid}/tasks/${taskID}`).update(update).then((err) => {
				if (err)
					reject(err);
				else
					fulfill();
			});
		}

		/*
		*	The user starts/resumes working on a task
		*
		*	Alias for _doEditTask
		*/
		Phased.workOnTask = function workOnTask(taskID = '') {
			return _registerAfter(['TASKS_SET_UP', 'TEAM_SET_UP', 'META_SET_UP', 'PROFILE_SET_UP'], 
				_doWorkOnTask, taskID);
		}

		var _doWorkOnTask = function doWorkOnTask(taskID, fulfill, reject) {
			Phased.editTask(taskID, {
				status: Phased.meta.task.STATUS_ID.IN_PROGRESS
			})
			.then(() => {
				Phased.postStatus(`${_appConfig.strings.status.prefix.task.inProgress}: ${Phased.team.tasks[taskID].name}`)
				.then(fulfill, reject);
			}, reject);
		}

		/*
		*	The user has completed working on a task and submits it for review
		*
		*	Alias for _doEditTask
		*/
		Phased.submitTaskForReview = function submitTaskForReview(taskID = '') {
			return _registerAfter(['TASKS_SET_UP', 'TEAM_SET_UP', 'META_SET_UP', 'PROFILE_SET_UP'], 
				_doSubmitTaskForReview, taskID);
		}

		var _doSubmitTaskForReview = function doSubmitTaskForReview(taskID, fulfill, reject) {
			Phased.editTask(taskID, {
				status: Phased.meta.task.STATUS_ID.IN_REVIEW
			})
			.then(() => {
				Phased.postStatus(`${_appConfig.strings.status.prefix.task.inReview}: ${Phased.team.tasks[taskID].name}`)
				.then(fulfill, reject);
			}, reject);
		}

		/*
		*	The user (if admin) approves of a task that has been submit for review
		*
		*	Alias for _doEditTask
		*/
		Phased.approveTaskInReview = function approveTaskInReview(taskID = '') {
			return _registerAfter(['TASKS_SET_UP', 'TEAM_SET_UP', 'META_SET_UP', 'PROFILE_SET_UP'], 
				_doApproveTaskInReview, taskID);
		}

		var _doApproveTaskInReview = function doApproveTaskInReview(taskID, fulfill, reject) {
			if (Phased.team.members[Phased.user.uid].role != Phased.meta.ROLE_ID.ADMIN) {
				reject(new Error('User must be admin to approve or reject task completion'));
				return;
			}

			if (Phased.team.tasks[taskID].status != Phased.meta.task.STATUS_ID.IN_REVIEW) {
				var msg = 'Task must be in review before approval or rejection';
				console.warn(msg);
				reject(new Error(msg));
				return;
			}

			Phased.editTask(taskID, {
				status: Phased.meta.task.STATUS_ID.COMPLETE
			})
			.then(() => {
				Phased.postStatus(`${_appConfig.strings.status.prefix.task.approvedReview}: ${Phased.team.tasks[taskID].name}`)
				.then(fulfill, reject);
			}, reject);
		}

		/*
		*	The user (if admin) rejects a task that has been submit for review
		*
		*	Alias for _doEditTask
		*/
		Phased.rejectTaskInReview = function rejectTaskInReview(taskID = '', comment = '') {
			return _registerAfter(['TASKS_SET_UP', 'TEAM_SET_UP', 'META_SET_UP', 'PROFILE_SET_UP'], 
				_doRejectTaskInReview, taskID);
		}

		var _doRejectTaskInReview = function doRejectTaskInReview(taskID, fulfill, reject) {
			if (Phased.team.members[Phased.user.uid].role != Phased.meta.ROLE_ID.ADMIN) {
				reject(new Error('User must be admin to approve or reject task completion'));
				return;
			}

			if (Phased.team.tasks[taskID].status != Phased.meta.task.STATUS_ID.IN_REVIEW) {
				var msg = 'Task must be in review before approval or rejection';
				console.warn(msg);
				reject(new Error(msg));
				return;
			}

			Phased.editTask(taskID, {
				status: Phased.meta.task.STATUS_ID.REJECTED
			})
			.then(() => {
				Phased.postStatus(`${_appConfig.strings.status.prefix.task.rejectedReview}: ${Phased.team.tasks[taskID].name}`)
				.then(fulfill, reject);
			}, reject);
		}
		
		/*
		*	Comment on a task as the current user
		*
		*/
		Phased.commentOnTask = function commentOnTask(taskID, text) {
			return _registerAfter(['TASKS_SET_UP', 'PROFILE_SET_UP'], 
				_doCommentOnTask, {taskID:taskID, text: text});
		}

		var _doCommentOnTask = function doCommentOnTask(args, fulfill = ()=>{}, reject = ()=>{}) {
			const {taskID, text} = args;

			if (!(taskID in Phased.team.tasks)) {
				var msg = `Cannot comment on task that may or may not exist (${taskID})`;
				console.warn(msg);
				return reject(new Error(msg));
			}

			var comment = {
				text : text,
				user : Phased.user.uid,
				time : Firebase.ServerValue.TIMESTAMP
			}
			_FBRef.child(`team/${Phased.team.uid}/tasks/${taskID}/comments`).push(comment).then(fulfill, reject);
		}

	})