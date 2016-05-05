'use strict';

/*
*		a status factory to make status objects
*		constructor makes a status out of info already in DB
*		use StatusFactory.create() to post a new status
*		
*/
angular.module('webappV2App')
	.factory('StatusFactory', ['Phased', 'DBObject', '$rootScope', 'getUTCTimecode', function(Phased, DBObject, $rootScope, getUTCTimecode) {
		var FBRef; // root FBRef

		/** Class representing a status */
		class Status extends DBObject {
			/**
			*		Constructs a status that already exists in the database
			*
			*		@param	{string}	ID 		ID of the status
			*		@param	{object}	cfg		object with properties of the status (irrelevant props will be ignored)
			*		@fires 	Phased#STATUS_ADDED
			*		@throws	Error 					if Phased isn't ready or args are invalid
			*/
			constructor(ID, cfg) {
				// fail if Phased team ID or member IDs aren't available
				if (!ID || typeof ID != 'string' || !cfg || typeof cfg != 'object' || cfg == undefined) {
					throw new Error('Invalid arguments supplied to Status');
				}

				if (!Phased.SET_UP) {
					throw new Error('Cannot create statuses before Phased is set up');
				}

				// call super
				super(FBRef.child(`/team/${Phased.team.uid}/statuses/${ID}`));

				// expand relevant mutable properties from cfg to pseudo-privates
				({
					name : this._.name,
					projectID : this._.projectID,
					taskID : this._.taskID,
					startTime : this._.startTime,
					endTime : this._.endTime,
					totalTime : this._.totalTime,
				} = cfg);

				// register read-only properties
				Object.defineProperty( this, 'user', {value: cfg.user, configurable:false, writeable:false, enumerable: true} );
				Object.defineProperty( this, 'time', {value: cfg.time, configurable:false, writeable:false, enumerable: true} );
				
				// update scope
				$rootScope.$evalAsync(() => {
					// maybe link to Phased.team.statuses, Phased.team.tasks[cfg.task], Phased.team.projects[cfg.project]
					Phased.team.statuses[ID] = this;

					// broadcast STATUS_ADDED 
					$rootScope.$broadcast(Phased.RUNTIME_EVENTS.STATUS_ADDED);
				});
			}

			/*
			*		Remove references that this status knows about
			*		
			*		@fires 	Phased#STATUS_DELETED
			*/
			destroy() {
				$rootScope.$evalAsync(() => {
					// if this status is a user's most current, find their next-most-recent and set it as their current status
					var is_user_currentStatus = Phased.team.members[this.user].currentStatus == this.ID;
					if (is_user_currentStatus) {
						let userStatuses = _.sortBy(Phased.team.statuses, 'ID', (o) => {
							if (o.ID == this.ID) return false;
							return o.user == this.user ? o.startTime : false;
						});
						let last = _.last(userStatuses);
						Phased.rootScope.$evalAsync(()=>{
							Phased.team.members[this.user].currentStatus = last.ID;
						});
					}

					// delete reference in Phased.team.statuses
					delete Phased.team.statuses[this.ID];

					// fire STATUS_DELETED
					$rootScope.$broadcast(Phased.RUNTIME_EVENTS.STATUS_DELETED);

					// call super.destroy()
					super.destroy();
				});
			}

			// 	ACCESSORS
			//	(get prop() needs to return this._.prop to avoid recursion)
			//	(use setProperty to ensure DB sync)

			/** 	startTime 	*/
			get startTime() {
				return this._.startTime;
			}

			set startTime(val) {
				val = getUTCTimecode(val);
				if (!val) {
					throw new TypeError('Status startTime could not be parsed');
				} else if (!!this._.endTime && val > this._.endTime) {
					throw new Error('startTime cannot be after endTime');
				} else {
					super.setProperty('startTime', val);
					if (!!this._.endTime) {
						super.setProperty('totalTime', this._.endTime - val);
					}
					return val;
				}
			}

			/** 	endTime 	*/
			get endTime() {
				return this._.endTime;
			}

			set endTime(val) {
				val = getUTCTimecode(val);
				if (!val) {
					throw new TypeError('Status endTime could not be parsed');
				} else if (!this._.startTime) {
					throw new Error('Cannot end a status that has no startTime');
				} else if (val < this._.startTime) {
					throw new Error('endTime cannot be before startTime');
				} else {
					super.setProperty('endTime', val);
					super.setProperty('totalTime', val - this._.startTime);
					return val;
				}
			}

			/** 	totalTime 	*/
			get totalTime() {
				return this._.totalTime;
			}

			set totalTime(val) {
				throw new Error('Cannot edit totalTime directly; set startTime or endTime instead');
			}

			/** 	taskID 	*/
			get taskID() {
				return this._.taskID;
			}

			set taskID(val) {
				throw new Error('Setting taskID not yet implemented');
			}

			/** 	projectID 	*/
			get projectID() {
				return this._.projectID;
			}

			set projectID(val) {
				throw new Error('Setting projectID not yet implemented');
			}
		}

		/**	The status factory object */
		var StatusFactory = {
			Status : Status,
			/*
			*		Factory method for creating a new status and posting to the DB
			*		Does NOT return the status object; status is created from FB.on set below
			*
			*		@param		{object}	args	attributes for the new status
			*		@returns	{Promise}
			*/
			create : function create(args) {
				return new Promise((fulfill, reject) => {
					if (typeof args == 'string')
						args = {name : args};
					const {name, type, projectID, taskID, startTime, endTime} = args;

					if (!Phased || typeof Phased != 'object' || !Phased.SET_UP) {
						reject(Error('Cannot post status without Phased!'));
						return;
					}

					var newStatus = {
						user: Phased.user.uid,
						time: Firebase.ServerValue.TIMESTAMP // always posted as now
					};

					// 1. PROP VALIDATION
					// name
					if (!('name' in args) || typeof args.name != 'string') {
						reject(Error('Cannot post a blank status update!'));
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
					var statusRef = Phased._FBRef.child(`team/${Phased.team.uid}/statuses`).push(newStatus);
					var statusID = statusRef.key();

					// 3. POST TO USER
					statusRef.then(() => {
						Phased._FBRef.child(`team/${Phased.team.uid}/members/${Phased.user.uid}/currentStatus`)
						.set(statusID).then(fulfill, reject);
					}, reject);

					// 4. RETURN NEW STATUS OBJ -- don't need to do this, as team set up will watch for this already
					// newStatus.time = moment().unix();
					// return new Status(statusID, newStatus, _Phased, FBRef);
				});
			}
		} 

		// set FBRef
		$rootScope.$on('Phased:meta', () => {
			FBRef = Phased._FBRef;
		});

		// watch for new statuses added to the DB and create them here
		$rootScope.$on('Phased:teamComplete', () => {
			FBRef.child(`team/${Phased.team.uid}/statuses`).on('child_added', (snap) => {
				let cfg = snap.val();
				let id = snap.key();

				new Status(id, cfg);
			});
		});

		return StatusFactory;
	}]);
