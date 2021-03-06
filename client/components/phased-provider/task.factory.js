'use strict';

/*
*		a task factory to make task objects
*		constructor makes a task out of info already in DB
*		use TaskFactory.create() to make a new task
*		
*/
angular.module('webappV2App')
	.factory('TaskFactory', ['appConfig', 'getUTCTimecode', 'Phased', 'DBObject', 'StatusFactory', '$rootScope', function(appConfig, getUTCTimecode, Phased, DBObject, StatusFactory, $rootScope) {
		var FBRef;

		/** Class representing a task */
		class Task extends DBObject {
			/**
			*		Constructs a task that already exists in the database
			*
			*		@param	{string}	ID 		ID of the task
			*		@param	{object}	cfg		object with properties of the task (irrelevant props will be ignored)
			*		@fires 	Phased#TASK_ADDED
			*/
			constructor(ID, cfg) {
				// fail if Phased team ID or member IDs aren't available
				if (!ID || typeof ID != 'string' || !cfg || typeof cfg != 'object' || cfg == undefined) {
					throw new Error('Invalid arguments supplied to Task');
				}

				if (!Phased.TEAM_SET_UP || ! Phased.META_SET_UP) {
					throw new Error('Cannot create tasks before Phased team or meta is set up');
				}

				// call super
				super(FBRef.child(`/team/${Phased.team.uid}/tasks/${ID}`));

				// expand relevant properties from cfg
				({
					name : this._.name,
					description : this._.description,
					projectID : this._.projectID,
					dueDate : this._.dueDate,
					assignment : this._.assignment,
					comments : this._.comments,
					status : this._.status,
					statusIDs : this._.statusIDs
				} = cfg);

				// ensure props exist
				this._.comments = this._.comments || {};
				this._.assignment = this._.assignment || {};
				this._.statusIDs = this._.statusIDs || {};

				this.statusIDs = this._.statusIDs;
				this.projectID = this._.projectID;

				// register read-only properties
				Object.defineProperty( this, 'created', {value: cfg.created, configurable:false, writable:false, enumerable: true} );

				// broadcast TASK_ADDED
				$rootScope.$broadcast(Phased.RUNTIME_EVENTS.TASK_ADDED, ID);
			}

			/*
			*		Remove references that this task knows about
			*		
			*		@fires 	Phased#TASK_DESTROYED
			*/
			destroy() {
				// fire TASK_DESTROYED
				$rootScope.$broadcast(Phased.RUNTIME_EVENTS.TASK_DESTROYED, {taskID: this.ID, projectID : this.projectID});

				// call super.destroy()
				super.destroy();
			}

			// 	ACCESSORS

			/**		dueDate		*/
			get dueDate() {
				return this._.dueDate;
			}

			set dueDate(val) {
				val = getUTCTimecode(val);
				if (!val) {
					throw new TypeError('Task dueDate could not be parsed');
				} else {
					this.setProperty('dueDate', val);
					return val;
				}
			}

			/**		status		*/
			get status() {
				return this._.status;
			}

			set status(val) {
				if (!(val in _.values(Phased.meta.task.STATUS_ID))) {
					throw new TypeError('Task status should be one of Phased.meta.task.STATUS_ID');
				} else {
					this.setProperty('status', val);
					return val;
				}
			}

			/**		assignment 	*/
			get assignment() {
				return this._.assignment;
			}

			set assignment(val) {
				throw new Error('Setting task assignment directly has no effect; please use Task#assignTo');
			}

			/**		comments 	*/
			get comments() {
				return this._.comments;
			}

			set comments(val) {
				throw new Error('Setting task comments directly has no effect; please use Task#addComment');
			}

			/**		description 	*/
			get description() {
				return this._.description;
			}

			set description(val) {
				if (typeof val != 'string')
					throw new TypeError(`description should be a string, got ${typeof val}`);

				this.setProperty('dueDate', val);
				return val;
			}
			

			//	ASSIGNMENT MANIP

			/**
			*		Assigns a task to a member on your team
			*	
			*		@param	{string}	uid 	UID for a member on the team or null to un-assign
			*		@throws TypeError				if uid is not a string
			*		@throws	ReferenceError 	if uid is not a member of the team
			*/
			assignTo(uid) {
				if (!(typeof uid == 'string' || uid == null)) {
					throw new TypeError('uid should be String or null, got ' + (typeof uid));
				}

				if (!!uid && !(uid in Phased.team.members)) {
					throw new ReferenceError(`Could not find member ${uid} in team`);
				}
				
				let assignment = {
					by : Phased.user.uid,
					time : Firebase.ServerValue.TIMESTAMP
				}

				if (!!uid) assignment.to = uid;
				
				this.setProperty('assignment', assignment);
			}

			//	COMMENT MANIP

			/**
			*		Adds a comment to the task
			*
			*		@param 	{string}	text 	text of the comment
			*		@throws	TypeError				if text is not a string or empty
			*/
			addComment(text) {
				if (!(typeof text == 'string') || text.length < 1) {
					throw new TypeError('Cannot add empty comment to task');
				}

				return this.pushVal('comments', {
					text : text,
					user : Phased.user.uid,
					time : Firebase.ServerValue.TIMESTAMP
				});
			}

			/**
			*		Deletes a comment locally and remotely
			*
			*		@param 	{string}	commentID		ID of the comment to delete
			*		@throws	TypeError							if the comment ID is not a string
			*		@throws	ReferenceError				if the comment is not found
			*/
			deleteComment(commentID) {
				if (!(typeof commentID == 'string')) {
					throw new TypeError('commentID should be string, got ' + (typeof commentID));
				}

				if (!(commentID in this.comments)) {
					throw new ReferenceError(`Could not find comment ${commentID} for task ${this.ID}`);
				}

				super.setProperty(`comments/${commentID}`, null);
			}

			/**
			*		Updates text for the comment at commentID
			*
			*		@param 	{string} 	commentID		ID of the comment to edit
			*		@param 	{string}	text 				text of the comment
			*		@throws	TypeError							if text is not a string or empty
			*		@throws	ReferenceError				if the comment is not found
			*/
			editComment(commentID, text) {
				if (!(typeof commentID == 'string')) {
					throw new TypeError('commentID should be string, got ' + (typeof commentID));
				}

				if (!(typeof text == 'string')) {
					throw new TypeError('commentID should be string, got ' + (typeof commentID));
				}

				if (!(commentID in this.comments)) {
					throw new ReferenceError(`Could not find comment ${commentID} for task ${this.ID}`);
				}

				super.setProperty(`comments/${commentID}/text`, text);
			}

			//	STATUS MANIP

			/**
			*		Adds a new status linked to the task 
			*
			*		@param 		{object}	args 	attributes for the new status
			*		@returns 	{Promise}
			*/
			postStatus(args) {
				if (typeof args == 'string') {
					args = {
						name : args
					}
				} else if (typeof args != 'object' && !!args) {
					throw new TypeError('args should be String or Object, got ' + typeof args);
				} 

				args.taskID = this.ID;

				return new Promise((fulfill, reject) => {
					StatusFactory.create(args).then((statusID) => {
						this.linkStatus(statusID);
						fulfill(statusID);
					}, reject);
				})
			}

			/**
			*		Links an existing status to the task
			*
			*		@param 	{string}	statusID 	ID of the status to link
			*		@throws	TypeError 					if statusID isn't a string
			*		@throws	ReferenceError			if status doesn't exist
			*/
			linkStatus(statusID) {
				if (!(typeof statusID == 'string')) {
					throw new TypeError('statusID should be string, got ' + (typeof statusID));
				}

				if (!(statusID in Phased.team.statuses)) {
					throw new ReferenceError(`Could not find ${statusID} in team statuses`);
				}

				let status = Phased.team.statuses[statusID];
				if (!!status.taskID && status.taskID != this.ID) {
					console.log('Status currently linked to a task; unlinking from other task...');
					let oldTask = Phased.team.tasks[Phased.team.statuses[statusID].taskID];
					oldTask.unlinkStatus(statusID);
				}

				// set status' taskID
				Phased.team.statuses[statusID].taskID = this.ID;
				
				return super.pushVal('statusIDs', statusID);
			}

			/**
			*		Unlinks a status from the task
			*
			*		@param 	{string}	statusID 	ID of the status to unlink
			*		@throws	TypeError 					if statusID isn't a string
			*/
			unlinkStatus(statusID) {
				if (!(typeof statusID == 'string')) {
					throw new TypeError('statusID should be string, got ' + (typeof statusID));
				}

				if (statusID in Phased.team.statuses)
					Phased.team.statuses[statusID].taskID = '';

				super.removeFromCollection('statusIDs', statusID);
			}

			//	LIFETIME METHODS

			/**
			*		User starts / resumes working on this task
			*/
			workOn() {
				this.status = Phased.meta.task.STATUS_ID.IN_PROGRESS;
				StatusFactory.create({
					name : `${appConfig.strings.status.prefix.task.inProgress}: ${this.name}`,
					taskID : this.ID
				}).then(statusID => {
					this.linkStatus(statusID);
				}, err => {
					console.warn('Posting status for task failed!', err);
				});
			}

			/**
			*		Self-assign a task
			*		shorthand for this.assignTo(me);
			*/
			take() {
				this.assignTo(Phased.user.uid);
			}

			/**
			*		Self-assign a task and immediately start working on it
			*		Shorthand for this.assignTo(me); this.workOn()
			*		
			*/
			takeAndWorkOn() {
				this.take();
				return this.workOn();
			}

			/**
			*		The user has completed working on a task and submits it for review
			*/
			submitForReview() {
				this.status = Phased.meta.task.STATUS_ID.IN_REVIEW;
				StatusFactory.create({
					name : `${appConfig.strings.status.prefix.task.inReview}: ${this.name}`,
					taskID : this.ID
				}).then(statusID => {
					this.linkStatus(statusID);
				}, err => {
					console.warn('Posting status for task failed!', err);
				});
			}

			/**
			*		The user (if admin) approves of a task that has been submit for review
			*/
			approve() {
				if (Phased.team.members[Phased.user.uid].role != Phased.meta.ROLE_ID.ADMIN 
					&& Phased.team.members[Phased.user.uid].role != Phased.meta.ROLE_ID.OWNER) {
					throw new Error('User must be admin to approve or reject task completion');
				}

				if (this.status != Phased.meta.task.STATUS_ID.IN_REVIEW) {
					throw new Error('Task must be in review before approval or rejection');
				}

				this.status = Phased.meta.task.STATUS_ID.COMPLETE;
				
				StatusFactory.create({
					name : `${appConfig.strings.status.prefix.task.approvedReview}: ${this.name}`,
					taskID : this.ID
				}).then(statusID => {
					this.linkStatus(statusID);
				}, err => {
					console.warn('Posting status for task failed!', err);
				});
			}

			/**
			*		The user (if admin) rejects a task that has been submit for review
			*/
			reject() {
				if (Phased.team.members[Phased.user.uid].role != Phased.meta.ROLE_ID.ADMIN
					&& Phased.team.members[Phased.user.uid].role != Phased.meta.ROLE_ID.OWNER) {
					throw new Error('User must be admin to approve or reject task completion');
				}

				if (this.status != Phased.meta.task.STATUS_ID.IN_REVIEW) {
					throw new Error('Task must be in review before approval or rejection');
				}

				this.status = Phased.meta.task.STATUS_ID.REJECTED;
				
				StatusFactory.create({
					name : `${appConfig.strings.status.prefix.task.approvedReview}: ${this.name}`,
					taskID : this.ID
				}).then(statusID => {
					this.linkStatus(statusID)
				}, err => {
					console.warn('Posting status for task failed!', err);
				});
			}
		}

		/**	The task factory object */
		var TaskFactory = {
			Task : Task,
			/**
			*		Factory method for creating a new task and posting to the DB
			*		Does NOT return the task object
			*
			*		ALL TASK CREATION SHOLD USE THIS METHOD
			*
			*		1. check that properties are valid
			*			- supplies "created" timestamp and CREATED status
			*			- requires "name" and either "to" or "assignment"
			*				- when using "to", will assume current user as "by". use "assignment" obj to bypass.
			*			- optionally "dueDate", "description", "tags"
			*				- "dueDate" can be Date, Moment, or timestamp
			*					- when Date or timestamp, assumed to be in local time
			*					- when Moment, can be either (Moment keeps track internally - see documentation for moment#utc)
			*					- does NOT check if due date is in the future
			*				- "tags" can be either an array of tags or an object with tags as keys and truthy values
			*					- not yet implemented
			*		2. post to team
			*
			*		@param		{object}	args	attributes for the new task (or string name)
			*		@returns	{Promise}				resolved with new task's ID; rejected with any error
			*/
			create : function create (args) {
				return new Promise((fulfill, reject) => {
					if (typeof args == 'string') {
						args = {name: args};
					} else if (typeof args != 'object') {
						var msg = 'TaskFactory.createTask expects an object or string; got ' + (typeof args);
						console.warn(msg);
						reject(new Error(msg));
						return;
					}

					if (!Phased || typeof Phased != 'object' || !Phased.SET_UP) {
						reject(Error('Cannot make a task without Phased!'));
						return;
					}

					// destructure args
					const { name, dueDate, description, to, assignment, tags } = args;

					// simplest object
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
					if (!!to) {	// if to is set
						if (typeof to == 'string' && to in Phased.team.members) { // and it's a member's UID
							// assignment is to that person, by the current user
							newTask.assignment = {
								to: to,
								by: Phased.user.uid
							};
						} else {
							var msg = 'task.to must be the UID for a team member; got ' + (typeof to);
							console.warn(msg, to);
							reject(new Error(msg));
							return;
						}
					} else if (!!assignment) { // if to isn't set and assignment is
						if (typeof assignment == 'object' && // and the assignment is an object
							'to' in assignment && 'by' in assignment && // and it has to and by keys
							assignment.to in Phased.team.members && assignment.by in Phased.team.members) { // and they're valid member UIDS
							// specific assignment
							newTask.assignment = {
								to: assignment.to,
								by: assignment.by
							}
						} else {
							var msg = 'task.assignment should be an object with "to" and "by" keys; got ' + (typeof assignment);
							console.warn(msg);
							reject(new Error(msg));
							return;
						}
					} else {
						var msg = 'Neither task.to nor task.assignment were set; task will be created as unassigned.';
						console.log(msg);
						newTask.assignment = {
							by: Phased.user.uid
						}
					}

					// dueDate (could be Date, Moment, or timestamp)
					if (dueDate) {
						let timecode = getUTCTimecode(dueDate);
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

					var newTaskRef = FBRef.child(`team/${Phased.team.uid}/tasks`).push(newTask);
					var newTaskID = newTaskRef.key();
					newTaskRef.then(() => {
						fulfill(newTaskID);
					}, reject);
				});
			}
		} 

		// set FBRef
		$rootScope.$on(Phased.INIT_EVENTS.META_SET_UP, () => {
			FBRef = Phased._FBRef;
		});

		// watch for new tasks added to the DB and create them here
		// also watch for tasks that have been deleted from the DB
		$rootScope.$on(Phased.INIT_EVENTS.TEAM_SET_UP, () => {
			FBRef.child(`team/${Phased.team.uid}/tasks`).on('child_added', (snap) => {
				let cfg = snap.val();
				let id = snap.key();

				$rootScope.$evalAsync( () => Phased.team.tasks[id] = new Task(id, cfg) );
			});

			FBRef.child(`team/${Phased.team.uid}/tasks`).on('child_removed', (snap) => {
				let id = snap.key();
				let task = Phased.team.tasks[id];

				if (task instanceof Task) {
					$rootScope.$evalAsync(() => {
						task.destroy(); // remove all FB watches etc
						delete Phased.team.tasks[id]; // delete reference in Phased service
					});
				}
			})
		});

		// shut down when switching teams
		$rootScope.$on(Phased.RUNTIME_EVENTS.TEAM_SWITCH, () => {
			// kill all tasks
			for (var i in Phased.team.tasks) {
				Phased.team.tasks[i].destroy();
			}

			// stop watching for current team tasks
			FBRef.child(`team/${Phased.team.uid}/tasks`).off('child_added');
			FBRef.child(`team/${Phased.team.uid}/tasks`).off('child_removed');
		});

		// manage deleted task references
		$rootScope.$on(Phased.RUNTIME_EVENTS.TASK_DESTROYED, ({taskID, projectID}) => {
			delete Phased.team.tasks[taskID];
			if (!!projectID && !!Phased.team.projects[projectID])
				delete Phased.team.projects[projectID].tasks[taskID];
		});

		// manage added statuses that might be relevant to a task
		$rootScope.$on(Phased.RUNTIME_EVENTS.STATUS_ADDED, ({statusID, taskID}) => {
			if (!!taskID) {
				try {
					Phased.team.tasks[taskID].linkStatus(statusID);
				} catch (e) {
					console.log(e);
				}
			}
		});

		return TaskFactory;
	}]);
