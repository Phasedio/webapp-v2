(function(angular, undefined) {
  angular.module("webappV2App.constants", [])

.constant("appConfig", {
	"userRoles": [
		"guest",
		"user",
		"admin",
		"owner"
	],
	"FURL": "https://phased-dev2.firebaseio.com/",
	"strings": {
		"status": {
			"prefix": {
				"task": {
					"inProgress": "Focus",
					"inReview": "Submit for review",
					"approvedReview": "Approved",
					"rejectedReview": "Rejected"
				}
			}
		}
	}
})

;
})(angular);