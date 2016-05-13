'use strict';

var config = require('../../config/environment');
var Phased = require('../../components/phased');

var Firebase = require('firebase');
var FBRef = require('../../components/phasedFBRef').getRef();
var gravatar = require('gravatar');
// var stripe = require('stripe')(config.STRIPE_SECRET);
// var mandrill = require('mandrill-api/mandrill');
// var mandrill_client = new mandrill.Mandrill(config.MANDRILL_SECRET);

exports.index = function(req, res) {
	res.json([]);
};


/**
*
*	A new user is signing up for the service
*
*/

exports.registerUser = function(req, res) {
	var email = req.body.email,
		password = req.body.password;

	// 1. create Firebase user
	FBRef.createUser({email: email, password: password}, function(err, data) {
    if (err) {
    	console.dir(err);
    	res.send({
    		success: false,
    		err: err
    	});
    } else {
      var uid = data.uid; // stash UID
			/**
			*   Create a new profile for a user coming to the site
			*
			*   1. check if profile-in-waiting has been set up by some team admin
			*       1B - if so, add to those teams
			*   2. create profile
			*
			*/
      // 1.
		  FBRef.child('profile-in-waiting').orderByChild('email').equalTo(email).once('value', function(snap) {
	      var data = snap.val();
	      var profile = {
	        name: email.split('@')[0],
	        email: email,
	        gravatar: gravatar.url(email, {s:'40'}),
	        newUser : true
	      };

	      if (data) {
					// get profile-in-waiting (PIW)
					var PIWID = Object.keys(data)[0];
					var PIW = data[PIWID];

					// 1B.
					profile.teams = PIW.teams; // add to user's own teams
					for (var i in PIW.teams) {
					  // add to team member list
					  FBRef.child('team/' + PIW.teams[i] + '/members/' + uid).update({
					    role: Phased.meta.ROLE_ID.MEMBER // member
					  });
					}
	      }

	      // 2. create profile and remove PIW
	      FBRef.child('profile/' + uid).set(profile, function(err){
	      	if (!err) {
	          if (PIWID) {
	              FBRef.child('profile-in-waiting/' + PIWID).remove();
	          }
	          res.send({
	          	success: true,
	          	message : 'User and profile created'
	          });
	        } else {
	        	res.send({
	        		success: false,
	        		err: err
	        	});
	        	FBRef.removeUser({email : email, password : password}, function(err) {
	        		if (err) {
	        			console.log('error removing user');
	        			console.dir(err);
	        		}
	        	})
	        }
	      });
		  }, function(err) {
	      console.dir(err);
	      res.send({
	      	success: false,
	      	err: err
	      });
		  });
    }
  });
}

/**
*		
*	An existing user wants to register a new team
*
*/

exports.registerTeam = function (req, res) {
	var teamName = req.body.teamName,
		userID = req.body.userID;
	
	// do some kinda auth stuff here to ensure user is actually logged in
	console.log('api/register/team is not secured -- authentication needs to be implemented!');
	var authOkay = true;

	if (authOkay) {
		var teamRef = FBRef.child('team').push(makeTeam(teamName, userID));
		var teamID = teamRef.key();
		teamRef.then(() => {
			FBRef.child(`profile/${userID}/teams`).push(teamID).then(() => {
				res.send({success : true, teamID : teamID});
			});
		}, err => {
			console.log(err);
			res.send({success: false, error: err});
		})
	}
}


var makeTeam = function makeTeam(teamName, userID) {
	var newTeam = {
		details : {
			created : Firebase.ServerValue.TIMESTAMP,
			name : teamName
		},
		members : {}
	}
	newTeam.members[userID] = {
		role : Phased.meta.ROLE_ID.OWNER
	}

	return newTeam;
}