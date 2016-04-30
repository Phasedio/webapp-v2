(function(angular, undefined) {
  angular.module("webappV2App.constants", [])

.constant("appConfig", {
	"userRoles": [
		"guest",
		"user",
		"admin"
	],
	"FURL": "https://phased-dev2.firebaseio.com/"
})

;
})(angular);