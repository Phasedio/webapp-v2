/**
*		Abstract class that manages its own sync with Firebase
*
*		@author Dave Riedstra
*		@version 0.0.1
*/

class DBObject {
	_ = {}; // holds own pseudo-private properties

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

		// set up _FBRef handlers for child_changed
		this._.FBRef = FBRef;

		FBRef.on('child_changed', snap => {
			let id = snap.key();
			let val = snap.val();
			console.log('child changed', id, val);
			this._[id] = val;
		});
	}

	/**
	*		Removes all own FireBase event handlers to prepare for GC
	*/
	destroy() {
		// remove all _FBRef handlers
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