'use strict';

/*
*		a task factory to make task objects
*		constructor makes a task out of info already in DB
*		use TaskFactory.create() to make a new task
*		
*/
angular.module('webappV2App')
	.factory('TaskFactory', ['Phased', 'DBObject', 'StatusFactory', '$rootScope', function(Phased, DBObject, StatusFactory, $rootScope) {
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
					throw new Error('Invalid arguments supplied to Status');
				}

				if (!Phased.SET_UP) {
					throw new Error('Cannot create statuses before Phased is set up');
				}

				// call super
				super(FBRef.child(`/team/${Phased.team.uid}/tasks/${ID}`));

				// expand relevant properties from cfg
				({
					name : this._.name,
					projectID : this._.projectID,
					dueDate : this._.dueDate,
					assignment : this._.assignment,
					comments : this._.comments,
					status : this._.status
				} = cfg);

				// register read-only properties
				Object.defineProperty( this, 'created', {value: cfg.created, configurable:false, writeable:false, enumerable: true} );

				// link existing statuses
				for (let id in Phased.team.statuses) {
					if (!!Phased.statuses[id].taskID && Phased.statuses[id].taskID == ID) {
						this.statuses[id] = Phased.statuses[id];
					}
				}

				// update scope
				$rootScope.$evalAsync(() => {
					// link to Phased.team.tasks
					Phased.team.tasks[ID] = this;

					// maybe link to Phased.team.projects[this.project]
					if (cfg.projectID) {
						Phased.team.projects[projectID].tasks[ID] = this;
					}

					// broadcast TASK_ADDED
					$rootScope.$broadcast(Phased.RUNTIME_EVENTS.TASK_ADDED);
				});
			}

			/*
			*		Remove references that this task knows about
			*		
			*		@fires 	Phased#TASK_DELETED
			*/
			destroy() {
				// delete reference in Phased.team.tasks

				// fire TASK_DELETED

				// call super.destroy()
			}

			// 	ACCESSORS

			/**		dueDate		*/
			get dueDate() {
				return this._.dueDate;
			}

			set dueDate(val) {
				super.setProperty('dueDate', val);
			}

			/**		status		*/
			get status() {
				return this._.status;
			}

			set status(val) {
				super.setProperty('status', val);
			}

			/**		assignment 	*/
			get assignment() {
				return this._.assignment;
			}

			set assignment(val) {
				console.warn('Setting task assignment directly has no effect; please use Task#assignTo');
				return false;
			}

			/**		comments 	*/
			get comments() {
				return this._.comments;
			}

			set comments(val) {
				console.warn('Setting task comments directly has no effect; please use Task#addComment');
				return false;
			}

			//	ASSIGNMENT MANIP

			/**
			*		Assigns a task to a member on your team
			*	
			*		@param	{string}	uid 	UID for a member on the team or null to un-assign
			*		@throws TypeError				if uid is not a string
			*		@throws	ReferenceError 					if uid is not a member of the team
			*/
			assignTo(uid) {
				if (!(typeof uid == 'string' || uid == null)) {
					throw new TypeError('uid should be String or null, got ' + (typeof uid));
				}

				if (!!uid && !(uid in Phased.team.members)) {
					throw new ReferenceError(`Could not find member ${uid} in team`);
				}

				super.setProperty('assignment', {
					to : uid,
					by : Phased.user.uid,
					time : Firebase.ServerValue.TIMESTAMP
				});
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

				return super.pushVal('comments', {
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
		}

		/**	The task factory object */
		var TaskFactory = {
			Task : Task,
			/*
			*		Factory method for creating a new task and posting to the DB
			*		Does NOT return the task object
			*
			*		@param		{object}	args	attributes for the new task
			*		@returns	{Promise}
			*/
			create : function create (args) {
			}
		} 

		// set FBRef
		$rootScope.$on('Phased:meta', () => {
			FBRef = Phased._FBRef;
		});

		// watch for new tasks added to the DB and create them here
		// Phased.FBRef.child(`team/${Phased.team.uid}/tasks`).on('child_added', (snap) => {
		// 	let cfg = snap.val();
		// 	let id = snap.key();

		// 	let newTask = new Task(id, cfg);
		// });

		return TaskFactory;
	}]);
