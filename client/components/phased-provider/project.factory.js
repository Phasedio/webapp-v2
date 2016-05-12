'use strict';

/*
*		a project factory to make project objects
*		constructor makes a project out of info already in DB
*		use ProjectFactory.create() to make a new project
*		
*/
angular.module('webappV2App')
	.factory('ProjectFactory', ['getUTCTimecode', 'Phased', 'DBObject', 'StatusFactory', 'TaskFactory', '$rootScope', function(getUTCTimecode, Phased, DBObject, StatusFactory, TaskFactory, $rootScope) {
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
					description : this._.description,
					dueDate : this._.dueDate,
					comments : this._.comments,
					status : this._.status,
					taskIDs : this._.taskIDs,
					statusIDs : this._.statusIDs,
					memberIDs : this._.memberIDs
				} = cfg);

				// ensure props exist
				this.comments = this._.comments = this._.comments || {};
				this.taskIDs = this._.taskIDs = this._.taskIDs || {};
				this.statusIDs = this._.statusIDs = this._.statusIDs || {};
				this.memberIDs = this._.memberIDs = this._.memberIDs || {};

				// register read-only properties
				Object.defineProperty( this, 'created', {value: cfg.created, configurable:false, writable:false, enumerable: true} );
				
				// broadcast PROJECT_ADDED
				$rootScope.$broadcast(Phased.RUNTIME_EVENTS.PROJECT_ADDED, ID);
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
			*		Creates a new task linked to the project
			*
			*		@param 		{object}	args 	attributes for the new task
			*		@returns 	{Promise}
			*/
			createTask(args) {
				if (typeof args == 'string') {
					args = {
						name : args
					}
				} else if (typeof args != 'object' || !!args) {
					throw new TypeError('args should be String or Object, got ' + typeof args);
				} 

				args.projectID = this.ID;

				return TaskFactory.create(args);
			}

			/**
			*		Links an existing task to the project
			*
			*		@param 	{string}	taskID 		ID of the task to link
			*		@throws	TypeError 					if taskID isn't a string
			*		@throws	ReferenceError			if task doesn't exist
			*/
			linkTask(taskID) {
				if (!(typeof taskID == 'string')) {
					throw new TypeError('taskID should be string, got ' + (typeof taskID));
				}

				if (!(taskID in Phased.team.tasks)) {
					throw new ReferenceError(`Could not find ${taskID} in team tasks`);
				}

				let task = Phased.team.tasks[taskID];
				if (!!task.proejctID && task.projectID != this.ID) {
					console.log('Task currently linked to a project; unlinking from other project...');
					let oldProj = Phased.team.projects[Phased.team.tasks[taskID].proejctID];
					oldProj.unlinkTask(taskID);
				}

				// set task's projectID
				Phased.team.tasks[taskID].projectID = this.ID;
				
				return super.pushVal('taskIDs', taskID);
			}

			/**
			*		Unlinks a task from the project
			*
			*		@param 	{string}	taskID 		ID of the task to unlink
			*		@throws	TypeError 					if taskID isn't a string
			*/
			unlinkTask(taskID) {
				if (!(typeof taskID == 'string')) {
					throw new TypeError('taskID should be string, got ' + (typeof taskID));
				}

				if (taskID in Phased.team.tasks)
					Phased.team.tasks[taskID].projectID = undefined;

				super.removeFromCollection('taskIDs', taskID);
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

				let status = Phased.team.statuses[statusID];
				if (!!status.projectID && status.projectID != this.ID) {
					console.log('Status currently linked to a project; unlinking from other project...');
					let oldProj = Phased.team.tasks[Phased.team.statuses[statusID].projectID];
					oldProj.unlinkStatus(statusID);
				}

				// set status' projectID
				Phased.team.statuses[statusID].projectID = this.ID;
				
				super.pushVal('statusIDs', statusID);
			}

			/**
			*		Unlinks a status from the project
			*
			*		@param 	{string}	statusID 	ID of the status to unlink
			*		@throws	TypeError 					if statusID isn't a string
			*/
			unlinkStatus(statusID) {
				if (!(typeof statusID == 'string')) {
					throw new TypeError('statusID should be string, got ' + (typeof statusID));
				}

				if (statusID in Phased.team.statuses && Phased.team.statuses[statusID].projectID == this.ID)
					Phased.team.statuses[statusID].projectID = undefined;

				super.removeFromCollection('statusIDs', statusID);
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
			*		@returns	{Promise}				resolved with new Project's ID
			*/
			create : function create (args) {
				return new Promise((fulfill, reject) => {
					if (typeof args == 'string') {
						args = {name: args};
					} else if (typeof args != 'object') {
						var msg = 'ProjectFactory.createProject expects an object or string; got ' + (typeof args);
						console.warn(msg);
						reject(new Error(msg));
						return;
					}

					if (!Phased || typeof Phased != 'object' || !Phased.SET_UP) {
						reject(new Error('Cannot make a project without Phased!'));
						return;
					}

					// destructure args
					const { name, description, dueDate, memberIDs, taskIDs } = args;

					// simplest object
					var newProject = {
						created: Firebase.ServerValue.TIMESTAMP, // now
						status: Phased.meta.project.STATUS_ID.CREATED
					}

					// 1. PROP VALIDATION
					// name
					if (!('name' in args) || typeof name != 'string') {
						var msg = 'Cannot post a nameless project!';
						console.warn(msg);
						reject(new Error(msg));
						return;
					} else {
						newProject.name = name;
					}

					// description
					if (description) {
						if (typeof description == 'string')
							newProject.description = description;
						else
							console.warn('project.description should be a string; got ' + (typeof description));
					}

					// dueDate (could be Date, Moment, or timestamp)
					if (dueDate) {
						let timecode = getUTCTimecode(dueDate);
						if (!!timecode) {
							newProject.dueDate = timecode;
						} else {
							console.warn('"dueDate" should be a Date, Moment, or numeric timestamp. Not using supplied value (' + typeof dueDate + ')');
						}
					}

					// memberIDs
					let projMembers = [];
					if (memberIDs) {
						if (typeof memberIDs == 'object') {
							// loop through to ensure each is actually a member
							for (var i in memberIDs) {
								let memberID = memberIDs[i];
								if (memberID in Phased.team.members)
									projMembers.push(memberID)
								else
									console.warn(`${memberID} is not a member on the current team; ignoring`);
							}
						} else {
							console.warn('Expected object or array for project.memberIDs, ignoring supplied ' + (typeof memberIDs));
						}
					}

					// taskIDs
					let projTasks = [];
					if (taskIDs) {
						if (typeof taskIDs == 'object') {
							// loop through to ensure each is actually a task
							for (var i in taskIDs) {
								let taskID = taskIDs[i];
								if (taskID in Phased.team.tasks)
									projTasks.push(taskID)
								else
									console.warn(`${taskID} is not a task on the current team; ignoring`);
							}
						} else {
							console.warn('Expected object or array for project.taskIDs, ignoring supplied ' + (typeof taskIDs));
						}
					}

					// 2. SEND TO SERVER
					var newProjectRef = FBRef.child(`team/${Phased.team.uid}/projects`).push(newProject);
					var newProjectID = newProjectRef.key();
					newProjectRef.then(() => {
						// push up member and task ID arrays to get unique FB keys properly initiated
						for (var i in projMembers) {
							newProjectRef.child('memberIDs').push(projMembers[i]);
						}
						for (var i in projTasks) {
							newProjectRef.child('taskIDs').push(projTasks[i]);
						}
						fulfill(newProjectID);
					}, reject);
				});
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

			FBRef.child(`team/${Phased.team.uid}/projects`).on('child_removed', (snap) => {
				let id = snap.key();
				let project = Phased.team.projects[id];

				if (project instanceof Project) {
					$rootScope.$evalAsync(() => {
						project.destroy(); // remove all FB watches etc
						delete Phased.team.projects[id]; // delete reference in Phased service
					});
				}
			})
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

		// manage added tasks that might be relevant to a project
		$rootScope.$on(Phased.RUNTIME_EVENTS.TASK_ADDED, ({taskID, projectID}) => {
			if (!!projectID) {
				try {
					Phased.team.projects[projectID].linkTask(taskID);
				} catch (e) {
					console.log(e);
				}
			}
		});

		return ProjectFactory;
	}]);
