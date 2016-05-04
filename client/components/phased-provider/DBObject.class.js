/**
*		Abstract class that manages its own sync with Firebase
*
*		@author Dave Riedstra
*		@version 0.0.1
*/

class DBObject {
	_FBRef; // reference to this object in Firebase

	/**
	*		Constructs an object that syncs intself with firebase
	*
	*		@param	address		complete FireBase address for the object
	*		@throws Error			if class is directly instantiated
	*/
	contruct(address = '') {
		if (this.constructor === DBObject) {
			throw new Error('DBObject is an abstract class and should not be directly instantiated');
		}
		// set up _FBRef handlers for child_changed
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
	editProperty(address, val) {
		// edit own property and sync with FB

		// only need to set DB val; FB sync will edit own prop
	}
}