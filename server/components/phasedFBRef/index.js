/*

The main purpose of this module is to provide a unified FireBase reference throughout
the various server modules in order to avoid Auth conflicts and make sure that our
reference is always authenticated.

(this will also cut down a lot on including firebase modules)

*/

var config = require('../../config/environment');
var Firebase = require("firebase");
var FirebaseTokenGenerator = require("firebase-token-generator");
var tokenGenerator = new FirebaseTokenGenerator(config.FSEC);

// This is the only FBRef that will be used on the server
var FBRef = new Firebase(config.FURL);

module.exports = {
	/**
	*
	*	Returns the FBRef after maybe starting the re-auth process
	*
	*/
	getRef : function getFBRef() {
		if (!FBRef.getAuth()) {
			// create token only when needed
			var token = tokenGenerator.createToken({uid: config.FUID});
			FBRef.authWithCustomToken(token, function(error, authData) {
				if (error) {
					console.log(error);
				}
			});
		}

		return FBRef;
	}
}

/**
*	reauthenticate our reference when its token expires
*/
FBRef.onAuth(function (authData) {
	if (!authData) {
		// FBRef has been deauthenticated somewhere; reauthenticate
		var token = tokenGenerator.createToken({uid: config.FUID});
		FBRef.authWithCustomToken(token, function(error, authData) {
			if (error) {
				console.log(error);
			} else {
				console.log('Reauthenticated FBRef');
			}
		});
	}
});
