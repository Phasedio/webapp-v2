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
		*		@param	address		complete FireBase address for the object
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

			// set up _FBRef handlers for child_changed
			this._.FBRef = FBRef;

			FBRef.on('child_changed', snap => {
				let id = snap.key();
				let val = snap.val();

				$rootScope.$evalAsync(() => {
					this._[id] = val;
				});
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
		*		Edits the property of this object to match val exactly
		*
		*		@param	address		address of the property relative to the object
		*		@param	val				the new value for the property
		*/
		setProperty(address, val) {
			// only need to set DB val; FB sync will edit own prop
			this._.FBRef.child(address).set(val);
		}
	}

	return DBObject;
}]);