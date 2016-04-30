'use strict';

describe('Component: PhasedProvider', function() {
  // stub a module to get a ref to the provider
  var PhasedProvider;
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
    },
    task : {
      "HISTORY_ID" : {
        "ARCHIVED" : 1,
        "ASSIGNEE" : 5,
        "CATEGORY" : 7,
        "CREATED" : 0,
        "DEADLINE" : 6,
        "DESCRIPTION" : 4,
        "NAME" : 3,
        "PRIORITY" : 8,
        "STATUS" : 9,
        "UNARCHIVED" : 2
      },
      "PRIORITY" : [ "high", "medium", "low" ],
      "PRIORITY_ID" : {
        "HIGH" : 0,
        "LOW" : 2,
        "MEDIUM" : 1
      },
      "STATUS" : [ "In progress", "Complete", "Assigned", "Created" ],
      "STATUS_ID" : {
        "ASSIGNED" : 2,
        "COMPLETE" : 1,
        "CREATED" : 3,
        "IN_PROGRESS" : 0
      }
    }
  }

  // a stub data snapshot
  var snapStub;
  // a stub FBRef
  var FBRefStub;
  // data fed to push gets stashed here
  var lastPushed;
  // data fed to update gets stashed here
  var lastUpdated;

  beforeEach(function (){
    sandbox.spy(window, 'Firebase'); // constructor

    // stub some firebase methods to return some dummy data
    sandbox.spy(Firebase.prototype, 'onAuth');
    sandbox.spy(Firebase.prototype, 'unauth');
    sandbox.stub(Firebase.prototype, 'child', function () {
      return FBRefStub;
    });

    snapStub = sandbox.stub().returnsPromise().resolves({})();
    snapStub.key = sandbox.stub();
    snapStub.val = sandbox.stub();

    FBRefStub = {
      push: function (data) {
        lastPushed = data;
        return snapStub;
      },
      update: function (data) {
        lastUpdated = data;
        return snapStub;
      },
      set: sandbox.stub(),
      on: sandbox.stub().returnsPromise().resolves({}),
      once: sandbox.stub().returnsPromise().resolves({})
    };
    sandbox.spy(FBRefStub, 'push');
    sandbox.spy(FBRefStub, 'update');

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
    });

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

    it('should only post if meta, team, and profile are set up', function () {
      Phased.meta = phasedMeta;

      // 1. neither meta nor team
      Phased.META_SET_UP = false;
      Phased.TEAM_SET_UP = false;
      Phased.PROFILE_SET_UP = false;
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
      Phased.PROFILE_SET_UP = false;
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
      Phased.PROFILE_SET_UP = false;
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
      Phased.PROFILE_SET_UP = true;
      Phased.postStatus('test...');
      
      assert(Firebase.prototype.child.called, 'failed to call child after set up');
      assert(FBRefStub.push.called, 'failed to call push after set up');
      assert(FBRefStub.set.called, 'failed to call set after set up');
    });

    it('should ensure the new status has no invalid keys', function () {
      var validKeys = ['user', 'name', 'type', 'projectID', 'taskID', 'startTime', 'endTime', 'time'];
      var statusKeys;
      Phased.meta = phasedMeta;

      Phased.META_SET_UP = true;
      Phased.TEAM_SET_UP = true;
      Phased.PROFILE_SET_UP = true;
      Phased.postStatus('test...');
      
      assert(FBRefStub.push.called, 'did not try to push to FB');
      var statusKeys = Object.keys(lastPushed);
      expect(statusKeys).to.be.an('array');


      // 1. check that all keys are valid
      for (var i in statusKeys)
        validKeys.should.include(statusKeys[i], 'new status had invalid keys');
    });

    it('should ensure the new status has all of the required properties', function () {
      var requiredKeys = ['user', 'name', 'type', 'time'];
      var statusKeys;
      Phased.meta = phasedMeta;

      Phased.META_SET_UP = true;
      Phased.TEAM_SET_UP = true;
      Phased.PROFILE_SET_UP = true;
      Phased.postStatus('test...');

      assert(FBRefStub.push.called, 'did not try to push to FB');
      var statusKeys = Object.keys(lastPushed);
      expect(statusKeys).to.be.an('array');

      // 2. check athat all required keys are represented
      for (var i in requiredKeys)
        statusKeys.should.include(requiredKeys[i], 'new status did not include required keys');
    });
  });

  // ADDING A TASK
  describe('#addTask', function () {
    it('should return a promise', function () {
      Phased.addTask({name: 'test...'}).should.be.an.instanceOf(Promise);
    });

    it('should fail if not passed an object', function () {
      Phased.META_SET_UP = true;
      Phased.TEAM_SET_UP = true;
      Phased.PROFILE_SET_UP = true;

      Phased.addTask().should.be.rejected;
      Phased.addTask('test...').should.be.rejected;
      Phased.addTask(123).should.be.rejected;
    });

    it('should not run if any of meta, team, and profile are not set up', function () {
      Phased.meta = phasedMeta;
      Phased.team = {
        members : {
          'd' : true
        }
      };
      var dummyTask = {
        name: 'test',
        to: 'd'
      }
      var runTest = (setup) => {
        Phased.addTask(dummyTask);
      
        assert(!Firebase.prototype.child.called, 'attempted to call child with setup: ' + setup);
        assert(!FBRefStub.push.called, 'attempted to call push with setup: ' + setup);
        assert(!FBRefStub.set.called, 'attempted to call set with setup: ' + setup);

        Firebase.prototype.child.reset();
        FBRefStub.push.reset();
        FBRefStub.set.reset();
      }

      // all false
      Phased.META_SET_UP = false;
      Phased.TEAM_SET_UP = false;
      Phased.PROFILE_SET_UP = false;
      runTest('all false');

      // meta true
      Phased.META_SET_UP = true;
      Phased.TEAM_SET_UP = false;
      Phased.PROFILE_SET_UP = false;
      runTest('only meta');

      // team true
      Phased.META_SET_UP = false;
      Phased.TEAM_SET_UP = true;
      Phased.PROFILE_SET_UP = false;
      runTest('only team');

      // profile true
      Phased.META_SET_UP = false;
      Phased.TEAM_SET_UP = false;
      Phased.PROFILE_SET_UP = true;
      runTest('only profile');


      // meta & team true
      Phased.META_SET_UP = true;
      Phased.TEAM_SET_UP = true;
      Phased.PROFILE_SET_UP = false;
      runTest('only meta and team');

      // meta & profile true
      Phased.META_SET_UP = true;
      Phased.TEAM_SET_UP = false;
      Phased.PROFILE_SET_UP = true;
      runTest('only meta and profile');

      // team and profile true
      Phased.META_SET_UP = false;
      Phased.TEAM_SET_UP = true;
      Phased.PROFILE_SET_UP = true;
      runTest('only team and profile');
    });

    it('should ensure the new task has no invalid keys', function () {
      var validKeys = ['name', 'created', 'status', 'dueDate', 'description', 'assignment', 'tags'];
      var taskKeys;
      Phased.meta = phasedMeta;
      Phased.team = {
        members : {
          'd' : true
        },
        user: {
          uid : 'a'
        }
      };
      var dummyTask = {
        name: 'test',
        to: 'd'
      }

      Phased.META_SET_UP = true;
      Phased.TEAM_SET_UP = true;
      Phased.PROFILE_SET_UP = true;
      Phased.addTask(dummyTask).should.be.resolved;

      assert(FBRefStub.push.called, 'did not try to push to FB');
      var taskKeys = Object.keys(lastPushed);
      expect(taskKeys).to.be.an('array');

      // check that all keys are valid
      for (var i in taskKeys)
        validKeys.should.include(taskKeys[i], 'new task had invalid keys');
    });

    it('should ensure the new task has all the required keys', function () {
      var requiredKeys = ['name', 'created', 'assignment', 'status'];
      Phased.meta = phasedMeta;
      Phased.team = {
        members : {
          'd' : true
        }
      };
      var dummyTask = {
        name: 'test',
        to: 'd'
      }

      // do the test
      Phased.META_SET_UP = true;
      Phased.TEAM_SET_UP = true;
      Phased.PROFILE_SET_UP = true;
      Phased.addTask(dummyTask).should.be.resolved;

      assert(FBRefStub.push.called, 'did not try to push to FB');
      var taskKeys = Object.keys(lastPushed);
      expect(taskKeys).to.be.an('array');

      // check all required keys are present
      for (var i in requiredKeys)
        taskKeys.should.include(requiredKeys[i], 'new task is missing a key');
    });
  });

  // EDITING A TASK
  describe('#editTask', function () {
    // fill out some dummy tasks
    beforeEach(function () {
      Phased.META_SET_UP = true;
      Phased.TEAM_SET_UP = true;
      Phased.PROFILE_SET_UP = true;
      Phased.TASKS_SET_UP = true;

      Phased.team.tasks = {
        'A1' : {
          name : 'test task'
        }
      };
      Phased.team.members = {
        'yourID' : {
          currentTask : 'asdf'
        },
        'billsID' : {
          currentTask : 'asdf'
        }
      };
      Phased.user.uid = 'myID';
    });

    it('should return a promise', function () {
      Phased.editTask('taskID', {name: 'test...'}).should.be.an.instanceOf(Promise);
    });

    it('should fail if not passed an ID and an object', function () {
      Phased.editTask().should.be.rejected;
      Phased.editTask('test...').should.be.rejected;
      Phased.editTask(123).should.be.rejected;

      Phased.editTask('A1', 12).should.be.rejected;
      Phased.editTask('A1', 'purple').should.be.rejected;
      Phased.editTask('A1', false).should.be.rejected;
    });

    it('should fail if the ID is not a task', function () {
      Phased.editTask('not a task ID', {name: 'asd'}).should.be.rejected;
    });

    it('should update the data in firebase', function () {
      Phased.editTask('A1', {
        name: 'test'
      }).should.be.resolved;

      assert(FBRefStub.update.called, 'did not call FBRef.update');
    });

    it('should silently ignore malformed data', function () {
      Phased.editTask('A1', {
        name: 'a valid task name will be updated, but',
        description: {
          this_object: 'will not be updated'
        },
        nor: 'will this one'
      }).should.be.resolved;

      expect(lastUpdated).to.be.an('object');
      expect(lastUpdated).to.have.property('name').and.to.equal('a valid task name will be updated, but');
      expect(lastUpdated).to.not.have.property('description');
    });

    it('should fail if assigned to someone not on current team', function () {
      Phased.editTask('A1', {
        assignment : {
          to : 'notAnID'
        }
      }).should.be.rejected;
    });

    it('should set task.assignment.by to the current user if reassigned without an assigner', function () {
      Phased.editTask('A1', {
        assignment : {
          to : 'yourID'
        }
      }).should.be.resolved;

      expect(lastUpdated).to.have.property('assignment') // task.assignment
        .and.to.have.property('by')     // task.assignment.by
        .and.to.equal('myID');          // task.assignment.by == Phased.user.uid
    });
  });
});
