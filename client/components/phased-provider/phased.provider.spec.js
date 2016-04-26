'use strict';

describe('Component: PhasedProvider', function() {
  // stub a module to get a ref to the provider
  var PhasedProvider, sandbox;
  // other modules to save
  var $rootScope,
    $http,
    $location,
    $window,
    $firebaseAuth,
    Phased;

  var phasedMeta = {
    status : {
      "SOURCE" : [ "webapp", "mobile_app", "github", "google_calendar", "slack" ],
      "SOURCE_ID" : {
        "GITHUB" : 2,
        "GOOGLE_CALENDAR" : 3,
        "MOBILE_APP" : 1,
        "SLACK" : 4,
        "WEBAPP" : 0
      },
      "TYPE" : [ "update", "repo_push", "task_event", "calendar_event" ],
      "TYPE_ID" : {
        "CALENDAR_EVENT" : 3,
        "REPO_PUSH" : 1,
        "TASK_EVENT" : 2,
        "UPDATE" : 0
      }
    }
  }

  // a stub data snapshot
  var snapStub = {
    key : sinon.stub(),
    val : sinon.stub()
  }
  // a stub FBRef
  var FBRefStub = {
    push: sinon.stub().returns(snapStub),
    set: sinon.stub(),
    on: sinon.stub().returnsPromise().resolves({}),
    once: sinon.stub().returnsPromise().resolves({})
  };

  beforeEach(function (){
    sandbox = sinon.sandbox.create();
    sandbox.useFakeServer();
    // stub console methods
    sandbox.stub(window.console, 'log');
    sandbox.stub(window.console, 'warn');
    sandbox.stub(window.console, 'error');
    sandbox.spy(window, 'Firebase'); // constructor

    // stub some firebase methods to return some dummy data
    sandbox.spy(Firebase.prototype, 'onAuth');
    sandbox.spy(Firebase.prototype, 'unauth');
    sandbox.stub(Firebase.prototype, 'child', function () {
      return FBRefStub;
    });

    // create the dummy module
    angular.module('dummyModule', [])
    .config(['PhasedProvider', function(_PhasedProvider) {
      PhasedProvider = _PhasedProvider;
    }]);

    // inject into our module and stash some other modules
    // this will instantiate the Phased factory by calling PhasedProvider.$get
    module('webappV2App', 'dummyModule');
    inject(function(
      _$rootScope_,
      _$http_,
      _$location_,
      _$window_,
      _$firebaseAuth_,
      _Phased_) {
        $rootScope = _$rootScope_;
        $http = _$http_;
        $location = _$location_;
        $window = _$window_;
        $firebaseAuth = _$firebaseAuth_,
        Phased = _Phased_;
    });
  });

  afterEach(function () {
    sandbox.restore();
  });

  //
  //  TESTS
  //

  // CONFIG & CONSTRUCTION
  describe('construction and construction ($get)', function () {
    it('should be an object', function () {
      PhasedProvider.should.be.an('object');
    });

    // CONFIG
    describe('#config', function () {
      it('should return a promise', function () {
        PhasedProvider.config().should.be.an.instanceOf(Promise);
      });

      it('should fail without a Firebase URL', function () {
        PhasedProvider.config().should.be.rejected;
      });
    });

    // CONSTRUCTION
    describe('#construction', function () {
      it('should provide Phased factory', function () {
        expect(Phased).to.be.an('object');
      });

      it('should handle FB auth changes', function () {
        window.Firebase.should.be.a('function');
        assert(window.Firebase.called, 'FB was not instantiated');
        assert(Firebase.prototype.onAuth.called, 'onAuth was not called');
      });
    });
  });

  // LOGIN AND LOGOUT
  describe('login and logout', function () {
    it('should attempt to log in with FB', function () {
      sandbox.spy(Firebase.prototype, 'authWithPassword');
      Phased.login('d', 'a');
      assert(Firebase.prototype.authWithPassword.called, 'did not call authWithPassword');
      Firebase.prototype.authWithPassword.reset();
    });

    it('should return a FB promise', function () {
      // strictly speaking, this is a "then-able" and not a promise; since the return value of 
      // FB.authWithPassword isn't an instance of Promise
      // (so we check to see that "then" is a function rather than if it's a Promise)
      Phased.login('a', 'e').then.should.be.a('function');
    })

    it('should attempt to log out with FB', function () {
      Phased.logout();
      assert(Firebase.prototype.unauth.called, 'did not call unauth');
      Firebase.prototype.unauth.reset();
    });
  });

  // POSTING A STATUS
  describe('#postStatus', function () {
    it('should return a promise', function () {
      Phased.postStatus('test...').should.be.an.instanceOf(Promise);
    });

    it('should only post if meta and team are set up', function () {
      Phased.meta = phasedMeta;

      // 1. neither meta nor team
      Phased.META_SET_UP = false;
      Phased.TEAM_SET_UP = false;
      Phased.postStatus('test...');
      
      assert(!Firebase.prototype.child.called, 'attempted to call child before team or meta set up');
      assert(!FBRefStub.push.called, 'attempted to call push before team or meta set up');
      assert(!FBRefStub.set.called, 'attempted to call set before team or meta set up');

      Firebase.prototype.child.reset();
      FBRefStub.push.reset();
      FBRefStub.set.reset();

      // 2. meta but not team
      Phased.META_SET_UP = true;
      Phased.TEAM_SET_UP = false;
      Phased.postStatus('test...');
      
      assert(!Firebase.prototype.child.called, 'attempted to call child before team set up');
      assert(!FBRefStub.push.called, 'attempted to call push before team set up');
      assert(!FBRefStub.set.called, 'attempted to call set before team set up');

      Firebase.prototype.child.reset();
      FBRefStub.push.reset();
      FBRefStub.set.reset();

      // 3. team but not meta
      Phased.META_SET_UP = false;
      Phased.TEAM_SET_UP = true;
      Phased.postStatus('test...');
      
      assert(!Firebase.prototype.child.called, 'attempted to call child before meta set up');
      assert(!FBRefStub.push.called, 'attempted to call push before meta set up');
      assert(!FBRefStub.set.called, 'attempted to call set before meta set up');

      Firebase.prototype.child.reset();
      FBRefStub.push.reset();
      FBRefStub.set.reset();

      // 4. team and meta
      Phased.META_SET_UP = true;
      Phased.TEAM_SET_UP = true;
      Phased.postStatus('test...');
      
      assert(Firebase.prototype.child.called, 'failed to call child after set up');
      assert(FBRefStub.push.called, 'failed to call push after set up');
      assert(FBRefStub.set.called, 'failed to call set after set up');
    });

    it('should ensure the new status has no invalid keys', function () {
      var validKeys = ['user', 'name', 'type', 'projectID', 'taskID', 'startTime', 'endTime', 'time'];
      var statusKeys;
      Phased.meta = phasedMeta;

      // patch push to intercept the new status
      FBRefStub.push = function () {};
      sandbox.stub(FBRefStub, 'push', function (newStatus) {
        statusKeys = Object.keys(newStatus);
        return snapStub;
      });

      // 1. neither meta nor team
      Phased.META_SET_UP = true;
      Phased.TEAM_SET_UP = true;
      Phased.postStatus('test...');

      // 1. check that all keys are valid
      for (var i in statusKeys)
        validKeys.should.include(statusKeys[i], 'new status had invalid keys');
    });

    it('should ensure the new status has all of the required properties', function () {
      var requiredKeys = ['user', 'name', 'type', 'time'];
      var statusKeys;
      Phased.meta = phasedMeta;

      // patch push to intercept the new status
      FBRefStub.push = function () {};
      sandbox.stub(FBRefStub, 'push', function (newStatus) {
        statusKeys = Object.keys(newStatus);
        return snapStub;
      });

      // 1. neither meta nor team
      Phased.META_SET_UP = true;
      Phased.TEAM_SET_UP = true;
      Phased.postStatus('test...');

      // 2. check athat all required keys are represented
      for (var i in requiredKeys)
        statusKeys.should.include(requiredKeys[i], 'new status did not include required keys');
    });

  });
});
