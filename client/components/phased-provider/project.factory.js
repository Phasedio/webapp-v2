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

				// expand relevant properties from cfb

				// call super
				super(FBRef(`/team/${Phased.team.uid}/projects/${ID}`));

				// link this to Phased.team.projects
				Phased.team.projects[ID] = this;
				
				// link existing statuses
				for (let id = Phased.statuses.length - 1; i >= 0; i--) {
					if (!!Phased.statuses[id].projectID && Phased.statuses[id].projectID == ID) {
						this.statuses[id] = Phased.statuses[id];
					}
				}

				// link existing tasks
				for (let id = Phased.tasks.length - 1; i >= 0; i--) {
					if (!!Phased.tasks[id].projectID && Phased.tasks[id].projectID == ID) {
						this.tasks[id] = Phased.tasks[id];
					}
				}

				// broadcast PROJECT_ADDED
				$rootScope.$broadcast(Phased.RUNTIME_EVENTS.PROJECT_ADDED);
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

		// set FBRef
		$rootScope.$on('Phased:meta', () => {
			FBRef = Phased._FBRef;
		});

		// watch for new projects added to the DB and create them here
		// Phased.FBRef.child(`team/${Phased.team.uid}/projects`).on('child_added', (snap) => {
		// 	let cfg = snap.val();
		// 	let id = snap.key();

		// 	let newProject = new Project(id, cfg);
		// });

		return ProjectFactory;
	}]);
