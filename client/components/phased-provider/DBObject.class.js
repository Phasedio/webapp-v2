/**
*		Abstract class that manages its own sync with Firebase
*
*		@author Dave Riedstra
*		@version 0.0.1
*/

angular.module('webappV2App')
.factory('DBObject', ['$rootScope', function($rootScope) {
	class DBObject {
		/**
		*		Constructs an object that syncs intself with firebase
		*
		*		@param	FBRef			FireBase reference to the object
		*		@throws Error			if class is directly instantiated or if FBRef isn't set
		*/
		constructor(FBRef) {
			if (this.constructor === DBObject) {
				throw new Error('DBObject is an abstract class and should not be directly instantiated');
			}

			if (!(FBRef instanceof Firebase)) {
				throw new Error('DBObject: FBRef must be a Firebase reference; got ' + typeof FBRef);
			}

			// create hidden _ pseudo-private property holder
			Object.defineProperty( this, '_', {value: {}, configurable:false, writable:true, enumerable: false} );

			// define immutable ID property
			Object.defineProperty( this, 'ID', {value: FBRef.key(), configurable:false, writable:false, enumerable: true} );

			// set up _FBRef handlers for child_changed
			this._.FBRef = FBRef;

			this._.FBRef.on('child_changed', this.childChanged.bind(this));
		}

		/**
		*		Fired whenever a child of this object changes in the DB.
		*		Updates own property.
		*
		*		@param	{object}	snap		The relevant FireBase DataSnapshot
		*/
		childChanged(snap) {
			let id = snap.key();
			let val = snap.val();

			$rootScope.$evalAsync(() => {
				if (typeof val == 'object') {
					// merge without losing references
					// a) remove all current members not in new collection
					for (let i in this._[id]) {
						if (!(i in val))
							delete this._[id][i];
					}
					// b) add new members and synce current members
					_.merge(this._[id], val);
				} else {
					// simple assign
					this._[id] = val;
				}
			});
		}

		/**
		*		Removes all own FireBase event handlers to prepare for GC
		*/
		destroy() {
			// remove all _FBRef handlers
			this._.FBRef.off('child_changed');
		}

		/**
		*		Delete this object from the DB and the DOM
		*
		*/
		delete() {
			this._.FBRef.set(null).then(()=>{
				this.destroy();
			});
		}

		/**
		*		Edits the property of this object to match val exactly
		*
		*		@param	address		address of the property relative to the object
		*		@param	val				the new value for the property
		*/
		setProperty(address, val) {
			// update own data until FB child_changed is fired
			let path = address.split('/');
			
			if (val === null) // delete if null
				_.unset(this._, path);
			else 
				_.set(this._, path, val);

			// update DB val
			this._.FBRef.child(address).set(val);
		}

		/**
		*		Removes the given value from a collection (array or FB-array)
		*	
		*		@param	address		address of the collection
		*		@param	val 			value to remove
		*/
		removeFromCollection(address, val) {
			var coll = _.get(this._, address.replace(/\//g, '.'));
			var key = _.findKey(coll, o => _.isEqual(o, val));

			if (!!key) {
				this.setProperty(`${address}/${key}`, null);
			} else {
				console.warn(`Cannot find value ${val} at address ${address}`);
			}
		}

		/**
		*		Pushes a value to an object/array attribute (on this and FB)
		*
		*		@param 	{string}	address	address of the array where the new value will be pushed
		*		@param	{mixed}		val 		value that will be pushed
		*		@returns {string}					new key for the value
		*/
		pushVal(address, val) {
			// update DB
			let key = this._.FBRef.child(address).push(val).key();
			
			// update own data until FB child_changed is fired
			let path = address.split('/');
			path.push(key);
			_.set(this._, path, val);

			return key;
		}

		// 	DEFAULT ACCESSORS
		//	(get prop() needs to return this._.prop to avoid recursion)

		/** 	this.name 	*/
		get name() {
			return this._.name;
		}

		set name(val = '') {
			if (typeof val != 'string') {
				throw new TypeError((typeof this) + ' description must be string');
			} else if (val.length < 1) {
				throw new TypeError((typeof this) + ' name cannot be empty');
			} else { 
				this.setProperty('name', val);
				return val;
			}
		}

		/** 	description 	*/
		get description() {
			return this._.description;
		}

		set description(val = '') {
			if (typeof val != 'string' && val !== null) {
				throw new TypeError((typeof this) + ' description must be string or null, got ' + (typeof val));
			} else {
				this.setProperty('description', val);
				return val;
			}
		}
	}

	return DBObject;
}]);