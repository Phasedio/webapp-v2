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
