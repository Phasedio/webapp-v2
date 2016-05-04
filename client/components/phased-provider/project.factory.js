'use strict';

/*
*		a project factory to make project objects
*		constructor makes a project out of info already in DB
*		use ProjectFactory.create() to make a new project
*		
*/
angular.module('webappV2App')
	.factory('ProjectFactory', ['Phased', 'StatusFactory', 'TaskFactory', '$rootScope', function(Phased, StatusFactory, TaskFactory, $rootScope) {

		/** Class representing a project */
		class Project extends DBObject {
			/**
			*		Constructs a project that already exists in the database
			*
			*		@param	{string}	ID 		ID of the project
			*		@param	{object}	cfg		object with properties of the project (irrelevant props will be ignored)
			*		@fires 	Phased#STATUS_ADDED
			*/
			constructor(ID, cfg) {
				// fail if Phased team ID or member IDs aren't available

				// expand relevant properties from cfb

				// call super
				super(`/team/${Phased.team.uid}/projects/${ID}`);

				// maybe link to Phased.team.tasks and Phased.team.projects[this.project]

				// link existing statuses and tasks

				// broadcast PROJECT_ADDED
			}

			/*
			*		Remove references that this project knows about
			*		
			*		@fires 	Phased#PROJECT_DELETED
			*/
			destroy() {
				// delete reference in Phased.team.projects

				// fire PROJECT_DELETED

				// call super.destroy()
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

		// watch for new projects added to the DB and create them here
		// Phased.FBRef.child(`team/${Phased.team.uid}/projects`).on('child_added', (snap) => {
		// 	let cfg = snap.val();
		// 	let id = snap.key();

		// 	let newProject = new Project(id, cfg);
		// });

		return ProjectFactory;
	}]);
