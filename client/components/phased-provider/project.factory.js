'use strict';

/*
*		a project factory to make project objects
*		constructor makes a project out of info already in DB
*		use ProjectFactory.create() to make a new project
*		
*/
angular.module('webappV2App')
	.factory('ProjectFactory', ['Phased', 'DBObject', 'StatusFactory', 'TaskFactory', '$rootScope', function(Phased, DBObject, StatusFactory, TaskFactory, $rootScope) {
		var FBRef;

		/** Class representing a project */
		class Project extends DBObject {
			statuses = {};		// references to statuses associated with this project
			tasks = {};				// references to tasks associated with this project

			/**
			*		Constructs a project that already exists in the database
			*
			*		@param	{string}	ID 		ID of the project
			*		@param	{object}	cfg		object with properties of the project (irrelevant props will be ignored)
			*		@fires 	Phased#STATUS_ADDED
			*/
			constructor(ID, cfg) {
				// fail if Phased team ID or member IDs aren't available
				if (!ID || typeof ID != 'string' || !cfg || typeof cfg != 'object' || cfg == undefined) {
					throw new Error('Invalid arguments supplied to Project');
				}

				if (!Phased.SET_UP) {
					throw new Error('Cannot create projects before Phased is set up');
				}

				// call super
				super(FBRef.child(`/team/${Phased.team.uid}/projects/${ID}`));

				// expand relevant properties from cfg
				({
					name : this._.name,
					dueDate : this._.dueDate,
					assignment : this._.assignment,
					comments : this._.comments,
					status : this._.status,
					taskIDs : this._.taskIDs,
					statusIDs : this._.statusIDs,
					memberIDs : this._.memberIDs
				} = cfg);

				// ensure props exist
				this._.comments = this._.comments || {};
				this._.taskIDs = this._.taskIDs || {};
				this._.statusIDs = this._.statusIDs || {};
				this._.memberIDs = this._.memberIDs || {};

				// register read-only properties
				Object.defineProperty( this, 'created', {value: cfg.created, configurable:false, writeable:false, enumerable: true} );
				
				// broadcast PROJECT_ADDED
				$rootScope.$broadcast(Phased.RUNTIME_EVENTS.PROJECT_ADDED);
			}

			/*
			*		Remove references that this project knows about
			*		
			*		@fires 	Phased#PROJECT_DESTROYED
			*/
			destroy() {
				// fire PROJECT_DESTROYED
				$rootScope.$broadcast(Phased.RUNTIME_EVENTS.PROJECT_DESTROYED);

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
					super.setProperty('dueDate', val);
					return val;
				}
			}

			/**		status		*/
			get status() {
				return this._.status;
			}

			set status(val) {
				if (!val in Phased.meta.project.STATUS_ID) {
					throw new TypeError('Project status should be one of Phased.meta.project.STATUS_ID');
				} else {
					super.setProperty('status', val);
					return val;
				}
			}

			/**		comments 	*/
			get comments() {
				return this._.comments;
			}

			set comments(val) {
				console.warn('Setting project comments directly has no effect; please use Project#addComment');
				return false;
			}

			/**		memberIDs 	*/
			get memberIDs() {
				return this._.memberIDs;
			}

			set memberIDs(val) {
				console.warn('Setting project memberIDs directly has no effect; please use Project#addMember');
				return false;
			}

			/**		taskIDs 	*/
			get taskIDs() {
				return this._.taskIDs;
			}

			set taskIDs(val) {
				console.warn('Setting project taskIDs directly has no effect; please use Project#addTask');
				return false;
			}

			//	MEMBER MANIP

			/**
			*		Adds a team member to the project
			*
			*		@param	{string}	uid 	UID for a member on the team
			*		@throws TypeError				if uid is not a string
			*		@throws	ReferenceError 	if uid is not a member of the team
			*/
			addMember(uid) {
				if (!(typeof uid == 'string')) {
					throw new TypeError('uid should be String, got ' + (typeof uid));
				}

				if (!uid || !(uid in Phased.team.members)) {
					throw new ReferenceError(`Could not find member ${uid} in team`);
				}

				super.pushVal('members', uid);
			}

			/**
			*		Removes a team member from the project
			*
			*		@param	{string}	uid 	UID for a member on the project
			*		@throws TypeError				if uid is not a string
			*		@throws	ReferenceError 	if uid is not a member of the project
			*/
			removeMember(uid) {
				if (!(typeof uid == 'string')) {
					throw new TypeError('uid should be String, got ' + (typeof uid));
				}

				if (!uid || !(_.includes(this.memberIDs, uid))) {
					throw new ReferenceError(`Could not find member ${uid} in team`);
				}

				super.setProperty(`memberIDs/${uid}`, null);
			}

			// 	TASK MANIP

			/**
			*		Links an existing task to the project
			*
			*		@param	{string}	taskID 		ID of the task to associate with the project
			*		@throws	TypeError						if taskID isn't a string
			*		@throws	ReferenceError			if the task at taskID doesn't exist
			*/
			linkTask(taskID) {
				if (typeof taskID != 'string') {
					throw new TypeError('taskID should be String, got ' + (typeof taskID));
				}

				if (!taskID || !(taskID in Phased.team.tasks)) {
					throw new ReferenceError(`Could not find task ${taskID} in team`);
				}

				super.pushVal('taskIDs', taskID);
			}

			/**
			*		Creates a new task linked to the project
			*
			*/
			createTask(cfg) {

			}

			/**
			*		Removes a task from the project
			*
			*		@param	{string}	taskID 		ID of the task to remove from the project
			*		@throws	TypeError						if taskID isn't a string
			*		@throws	ReferenceError			if the task at taskID isn't linked to the project
			*/
			removeTask(taskID) {
				if (typeof taskID != 'string') {
					throw new TypeError('taskID should be String, got ' + (typeof taskID));
				}

				if (!taskID || !(taskID in this._.taskIDs)) {
					throw new ReferenceError(`Could not find task ${taskID} in team`);
				}

				super.setProperty(`taskIDs/${taskID}`, null);
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

			//	STATUS MANIP

			/**
			*		Adds a new status linked to the project 
			*
			*		@param 		{object}	args 	attributes for the new status
			*		@returns 	{Promise}
			*/
			postStatus(args) {
				if (typeof args == 'string') {
					args = {
						name : args
					}
				} else if (typeof args != 'object' || !!args) {
					throw new TypeError('args should be String or Object, got ' + typeof args);
				} 

				args.projectID = this.ID;

				return StatusFactory.create(args);
			}

			/**
			*		Links an existing status to the project
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
				
				super.pushVal('statusIDs', statusID);
			}
		}

		/**	The status factory object */
		var ProjectFactory = {
			Project : Project,
			/*
			*		Factory method for creating a new project and posting to the DB
			*		Does NOT return the project object
			*
			*		@param		{object}	args	attributes for the new project
			*		@returns	{Promise}
			*/
			create : function create (args) {
			}
		} 

		// set FBRef
		$rootScope.$on('Phased:meta', () => {
			FBRef = Phased._FBRef;
		});

		// watch for new projects added to the DB and create them here
		$rootScope.$on('Phased:teamComplete', () => {
			FBRef.child(`team/${Phased.team.uid}/projects`).on('child_added', (snap) => {
				let cfg = snap.val();
				let id = snap.key();

				$rootScope.$evalAsync( () => Phased.team.projects[id] = new Project(id, cfg) );
			});
		});

		// manage deleted project references
		$rootScope.$on(Phased.RUNTIME_EVENTS.PROJECT_DESTROYED, (projectID) => {
			delete Phased.team.projects[projectID];
		});

		// manage added statuses that might be relevant to a project
		$rootScope.$on(Phased.RUNTIME_EVENTS.STATUS_ADDED, ({statusID, projectID}) => {
			if (!!projectID) {
				try {
					Phased.team.projects[projectID].linkStatus(statusID);
				} catch (e) {
					console.log(e);
				}
			}
		});

		return ProjectFactory;
	}]);
