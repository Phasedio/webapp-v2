'use strict';

/*
*		a status
*		constructor makes a status out of info already in DB
*		use Status.postNew() to post a new status (returns the instance)
*
*
*/
(function() {
	var _Phased;

	class Status {
		_Phased;
		_FBRef;

		constructor(ID, args) {
			if (!_Phased || typeof _Phased !== 'object') {
				throw new Error('Cannot create status without Phased!');
				return;
			}
			this._FBRef = _Phased._FBRef.root().child(`team/${_Phased.team.uid}/statuses/${ID}`);
			this.ID = this.id = ID; // just to be nice
			const {name, type, user, time, startTime, endTime, totalTime} = args;
			this.name				= name;
			this.type				= type;
			this.user				= user;
			this.time				= time;
			this.startTime	= startTime;
			this.endTime		= endTime;
			this.totalTime	= totalTime;
			if (!!startTime && !!endTime && !totalTime) {
				this.totalTime = endTime - startTime;
			}

			this._FBRef.on('child_changed', (snap) => {
				this[snap.key()] = snap.val();
				_Phased.rootScope.$broadcast(_Phased.RUNTIME_EVENTS.STATUS_CHANGED)
				_Phased.rootScope.$apply();
			});
			_Phased.rootScope.$broadcast(_Phased.RUNTIME_EVENTS.STATUS_ADDED);
		}

		/*
		*		Call to remove all FBRef event handlers
		*/
		destroy() {
			this._FBRef.off('child_changed');
			_Phased.rootScope.$broadcast(_Phased.RUNTIME_EVENTS.STATUS_DELETED);
			// if this status is a user's most current, find their next-most-recent and set it as their current status
			var is_user_currentStatus = _Phased.team.members[this.user].currentStatus == this.ID;
			if (is_user_currentStatus) {
				var userStatuses = _.sortBy(_Phased.team.statuses, 'id', (o) => {
					if (o.ID == this.ID) return false;
					return o.user == this.user ? o.startTime : false;
				});
				var last = _.last(userStatuses);
				_Phased.rootScope.$evalAsync(()=>{
					_Phased.team.members[this.user].currentStatus = last.ID;
				});
			}
		}
	}

	angular.module('webappV2App')
		.factory('StatusFactory', function() {
			return {
				setPhased : (p) => _Phased = p,
				Status : Status,
				/*
				*		Factory method for creating a new status and posting to the DB
				*		Does NOT return the status object; be sure to watch for new statuses from Phased for that.
				*/
				postNewStatus : function postNewStatus (args) {
					if (typeof args == 'string')
						args = {name : args};
					const {name, type, projectID, taskID, startTime, endTime} = args;

					if (!_Phased || typeof _Phased != 'object') {
						throw new Error('Cannot post status without Phased!');
						return;
					}

					var newStatus = {
						user: _Phased.user.uid,
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

					// type (should be, eg, _Phased.meta.status.TYPE_ID.REPO_PUSH)
					if (type) {
						if (!(type in _Phased.meta.status.TYPE))
							console.warn('Status type not available; posting plain status.');
						else
							newStatus.type = type;
					} else {
						newStatus.type = _Phased.meta.status.TYPE_ID.UPDATE
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
					var statusRef = _Phased._FBRef.child(`team/${_Phased.team.uid}/statuses`).push(newStatus);
					var statusID = statusRef.key();

					// 3. POST TO USER
					statusRef.then(() => {
						_Phased._FBRef.child(`team/${_Phased.team.uid}/members/${_Phased.user.uid}/currentStatus`).set(statusID);
					}, (e)=>{console.log(e)});

					// 4. RETURN NEW STATUS OBJ -- don't need to do this, as team set up will watch for this already
					// newStatus.time = moment().unix();
					// return new Status(statusID, newStatus, _Phased, FBRef);
				}
			} 
		});

})();