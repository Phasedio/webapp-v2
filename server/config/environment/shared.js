'use strict';

exports = module.exports = {
  // List of user roles
  userRoles: ['guest', 'user', 'admin', 'owner'],
  // Firebase vars
  FURL : 'https://phased-dev2.firebaseio.com/',       // DB URL
  // copy
  strings: {
  	status: {
  		prefix: {
  			task: {
	  			inProgress: 'Focus',
	  			inReview: 'Submit for review',
	  			approvedReview: 'Approved',
	  			rejectedReview: 'Rejected'
	  		}
  		}
  	}
  }
};
