'use strict';

/*
*		a task factory to make task objects
*		constructor makes a task out of info already in DB
*		use TaskFactory.create() to make a new task
*		
*/
angular.module('webappV2App')
	.factory('TaskFactory', ['Phased', 'StatusFactory', '$rootScope', function(Phased, StatusFactory, $rootScope) {

		/** Class representing a task */
		class Task extends DBObject {
			/**
			*		Constructs a task that already exists in the database
			*
			*		@param	{string}	ID 		ID of the task
			*		@param	{object}	cfg		object with properties of the task (irrelevant props will be ignored)
			*		@fires 	Phased#STATUS_ADDED
			*/
			constructor(ID, cfg) {
				// fail if Phased team ID or member IDs aren't available

				// expand relevant properties from cfb

				// call super
				super(`/team/${Phased.team.uid}/tasks/${ID}`);

				// maybe link to Phased.team.tasks and Phased.team.projects[this.project]

				// link existing statuses

				// broadcast TASK_ADDED
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

		// watch for new tasks added to the DB and create them here
		// Phased.FBRef.child(`team/${Phased.team.uid}/tasks`).on('child_added', (snap) => {
		// 	let cfg = snap.val();
		// 	let id = snap.key();

		// 	let newTask = new Task(id, cfg);
		// });

		return TaskFactory;
	}]);
