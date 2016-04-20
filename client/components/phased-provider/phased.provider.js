angular.module('webappV2App')
	.provider('Phased', function PhasedProvider() {
		// private
		var $rootScope,
			_req_callbacks = [];

		// public-facing object
		var Phased = {
			SET_UP : false
		}

		this.$get = ['$rootScope', function $get(_rootScope) {
			$rootScope = _rootScope;
			Phased.SET_UP = true;
			console.log('phased', Phased);
			return Phased;
		}];

		console.log('defining phased', Phased);
		/*
		**
		**	INTERNAL FUNCTIONS
		**
		*/

    var _registerAsync = function(callback, args) {
      if (Phased.SET_UP)
        return callback(args);
      else
        _req_callbacks.push({callback : callback, args : args });
    }

    var _doAsync = function() {
      for (var i in _req_callbacks) {
        _req_callbacks[i].callback(_req_callbacks[i].args || undefined);
      }
      Phased.SET_UP = true;
      console.log('Phased:setup', Phased);
			$rootScope.$broadcast('Phased:setup');
    }

    /*
    **
    **	EXTERNAL FUNCTIONS
    **
    */

		/*
		*	Log a user in using username and password
		*/
		Phased.login = function login(username, password) {
			_registerAsync(doLogin, {username:username, password:password})
		}
		var doLogin = function doLogin(args) {
			console.log('doing login', args.username, args.password);
		}

	})