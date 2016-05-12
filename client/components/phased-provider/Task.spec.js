'use strict';

describe('Class: Task', function() {

  var DBObject;
  var TaskFactory;
  var Phased;

  // other modules to save
  var $rootScope;
	var lastBroadcastEvent;
	var lastBroadcastEventData;

  // a stub data snapshot
  var snapStub;
  // a stub FBRef
  var FBRefStub;
  // data fed to push gets stashed here
  var lastPushed;
  // data fed to update gets stashed here
  var lastUpdated;
  // data fed to set gets stashed here
  var lastSet;
  // last event passed to FBRef.off
  var lastOffEvent;
  // a stub Firebase
  var Firebase = function Firebase(FURL) {}

  beforeEach(function() {
    Firebase.prototype.onAuth = sandbox.spy();
    Firebase.prototype.unauth = sandbox.spy();
    Firebase.prototype.child = sandbox.spy(function() {
      return new FBRefStub();
    });
    sandbox.stub(window, 'Firebase', Firebase); // replace window Firebase object with our own stubbed version

    snapStub = sandbox.stub().returnsPromise().resolves({})();
    snapStub.key = sandbox.stub().returns('-Kasdfwerasdfasdfsomestupidsh');
    snapStub.val = sandbox.stub().returns('a very nice val');

    class FBRefStubCl extends Firebase {
    };

    FBRefStubCl.prototype.then = sandbox.stub();
    FBRefStubCl.prototype.key = sandbox.stub();
    FBRefStubCl.prototype.val = sandbox.stub();
    FBRefStubCl.prototype.set = sandbox.stub();
    FBRefStubCl.prototype.on = sandbox.stub().returnsPromise().resolves({});
    FBRefStubCl.prototype.off = sandbox.spy(function (evt) {
      lastOffEvent = evt;
    });
    FBRefStubCl.prototype.once = sandbox.stub().returnsPromise().resolves({});
    FBRefStubCl.prototype.push = sandbox.spy(function (data) {
      lastPushed = data;
      return snapStub;
    });
    FBRefStubCl.prototype.update = sandbox.spy(function (data) {
      lastUpdated = data;
      return snapStub;
    });
    FBRefStubCl.prototype.set = sandbox.spy(function (data) {
      lastSet = data;
      return snapStub;
    });

    FBRefStub = FBRefStubCl;

    // create the dummy module
    angular.module('dummyModule', [])
    // inject into our module and stash some other modules
    // this will instantiate the DBObject class as extended by StatusFactory
    module('webappV2App', 'dummyModule');
    inject(function(
      _$rootScope_, _TaskFactory_, _DBObject_, _Phased_) {
      $rootScope = _$rootScope_;
  		sandbox.stub($rootScope, '$broadcast', function (_evt_, _data_) {
  			lastBroadcastEvent = _evt_;
  			lastBroadcastEventData = _data_;
  			$rootScope.$emit(_evt_, _data_);
  		});

      sandbox.stub($rootScope, '$evalAsync', function (toDo) {
        toDo();
      });

      TaskFactory = _TaskFactory_;
      DBObject = _DBObject_;
      Phased = _Phased_;

      // fill some Phased data
      Phased.team.members = {
        'someID' : {
          role : 1
        },
        'myID' : {
          role : 1
        },
        'adminID' : {
          role : 1
        },
        'memberID' : {
          role : 0
        },
        'ownerID' : {
          role : 2
        }
      }
      Phased.user = {
        uid : 'myID'
      }

      Phased.meta = {
        ROLE : ["member","admin","owner"],
        ROLE_ID : {ADMIN:1,MEMBER:0,OWNER:2}
      }

      $rootScope.$broadcast('Phased:meta'); // to cue Factory to save FBRef
    });
  });


  //
  // TESTS
  //

  describe('#constructor', function() {
  	it('should fail without an ID', function () {
  		Phased.SET_UP = true;
  		var makeNoID = function () {
  			new TaskFactory.Task(undefined, {});
  		}
  		var makeNumID = function () {
  			new TaskFactory.Task(2134, {});
  		}
  		var makeObjID = function () {
  			new TaskFactory.Task({a:'asdf'}, {});
  		}
  		var makeStrID = function () {
  			new TaskFactory.Task('asdf', {});
  		}
  		expect(makeNoID).to.throw(Error);
  		expect(makeNumID).to.throw(Error);
  		expect(makeObjID).to.throw(Error);
  		expect(makeStrID).to.not.throw(Error);
  	})

  	it('should fail without a config object', function () {
  		Phased.SET_UP = true;
  		var makeNoCfg = function () {
  			new TaskFactory.Task('-Kasdf');
  		}
  		var makeStrCfg = function () {
  			new TaskFactory.Task('-Kasdf', '2134');
  		}
  		var makeNumCfg = function () {
  			new TaskFactory.Task('-Kasdf', 2134);
  		}
  		var makeObjCfg = function () {
  			new TaskFactory.Task('-Kasdf', {a:'asdf'});
  		}
  		expect(makeNoCfg).to.throw(Error);
  		expect(makeStrCfg).to.throw(Error);
  		expect(makeNumCfg).to.throw(Error);
  		expect(makeObjCfg).to.not.throw(Error);
  	})

  	it('should fail if Phased isnt set up', function () {
  		var makeTask = function () {
  			new TaskFactory.Task('asdf', {});
  		}
  		expect(makeTask).to.throw(Error);
  	})

  	it('should extend DBObject', function() {
  		Phased.SET_UP = true;
  		var myTask = new TaskFactory.Task('asdf', {});
  		expect(myTask).to.be.an.instanceOf(DBObject);
  	})

  	it('should pin relevant cfg params to _', function () {
  		Phased.SET_UP = true;
  		var cfg = {
  			name : 'sth',
  			projectID : 'sth',
  			dueDate : 'sth',
  			assignment : {'to' : '{}', 'by' : 'milkman'},
  			comments : {'asdf' : {}, '-Kasdf' : {}},
  			status : 3,
  			statusIDs : {'asdf' : {}, '-Kasdf' : {}}
  		}
  		var myTask = new TaskFactory.Task('asdf', cfg);
  		for (var prop in cfg) {
  			let val = cfg[prop];
  			expect(myTask._).to.have.property(prop)
  				.that.equals(val);
  		}
  	})

    it('should ensure comments, assignment, and statusIDs have empty objects if they don\'t exist', function () {
      Phased.SET_UP = true;
      var cfg = {
        name : 'sth',
        projectID : 'sth'
      }
      var myTask = new TaskFactory.Task('asdf', cfg);
      expect(myTask).to.have.property('comments').that.is.an('object');
      expect(myTask).to.have.property('assignment').that.is.an('object');
      expect(myTask).to.have.property('statusIDs').that.is.an('object');
    })

  	it('should expose projectID and statusIDs', function () {
  		Phased.SET_UP = true;
  		var cfg = {
  			projectID : 'sth',
  			statusIDs : {'sth':{},'qwre':{}}
  		}
  		var myTask = new TaskFactory.Task('asdf', cfg);
  		expect(myTask.statusIDs).to.equal(myTask._.statusIDs).and.to.equal(cfg.statusIDs);
  		expect(myTask.projectID).to.equal(myTask._.projectID).and.to.equal(cfg.projectID);
  	})

  	it('should define immutable created prop', function () {
  		Phased.SET_UP = true;
  		var cfg = {
  			created : 54657983000
  		}
  		var myTask = new TaskFactory.Task('asdf', cfg);
  		expect(myTask).to.have.property('created');
  		expect(myTask).to.have.ownPropertyDescriptor('created', {value: cfg.created, configurable:false, writable:false, enumerable: true});
  	})

  	it('should broadcast a TASK_ADDED event', function () {
  		Phased.SET_UP = true;
  		var cfg = {
  			created : 54657983000
  		}
  		var myTask = new TaskFactory.Task('asdf', cfg);

  		expect(lastBroadcastEvent).to.equal(Phased.RUNTIME_EVENTS.TASK_ADDED);
  		expect(lastBroadcastEventData).to.equal('asdf');
  	})
  })

  describe('methods', function () {
    var myTask, cfg, ID;
    beforeEach(function () {
      Phased.SET_UP = true;
      cfg = {
        name : 'sth',
        created : 54657983000,
        projectID : 'sth',
        dueDate : 'sth',
        assignment : {'to' : '{}', 'by' : 'milkman'},
        comments : {'asdf' : {}, '-Kasdf' : {}},
        status : 3,
        statusIDs : {'asdf' : {}, '-Kasdf' : {}}
      }
      ID = '-KasdfmyTaskID';
      myTask = new TaskFactory.Task(ID, cfg);
    })

    describe('#destroy', function () {
      afterEach(function () {
        myTask = new TaskFactory.Task(ID, cfg);
      });

      it('should broadcast TASK_DESTROYED with identifying info', function () {
        var data = {
          projectID : myTask.projectID,
          taskID : myTask.taskID
        }
        myTask.destroy();

        expect(lastBroadcastEvent).to.equal(Phased.RUNTIME_EVENTS.TASK_DESTROYED);
        expect(lastBroadcastEventData).to.deep.equal(data);
      })

      it('should call super.destroy', function () {
        sandbox.spy(DBObject.prototype, 'destroy');
        myTask.destroy();
        assert(DBObject.prototype.destroy.called, 'DBObject.destroy was not called');
      });
    })

    describe('#assignTo', function() {
      it('should fail if argument is not a string or nil', function () {
        // will fail
        expect(() => myTask.assignTo(1)).to.throw(TypeError);
        expect(() => myTask.assignTo({a:1})).to.throw(TypeError);
        expect(() => myTask.assignTo([1,2,3])).to.throw(TypeError);

        // will be okay for type
        expect(() => myTask.assignTo()).to.not.throw(TypeError);
        expect(() => myTask.assignTo(null)).to.not.throw(TypeError);
        expect(() => myTask.assignTo('possibleUID')).to.not.throw(TypeError);
      })

      it('should fail if argument is not an ID of a team members', function () {
        expect(() => myTask.assignTo('billy joel')).to.throw(ReferenceError);
        expect(() => myTask.assignTo('memberID')).to.not.throw(ReferenceError);
      })

      it('should call setProperty', function () {
        sandbox.spy(myTask, 'setProperty');
        myTask.assignTo('memberID');
        assert(myTask.setProperty.called, 'setProperty was not called');
      })

      it('should update assignment.to to provided userID', function () {
        myTask.assignTo('memberID');
        expect(myTask.assignment).to.have.property('to').that.equals('memberID');
      })

      it('should remove assignment.to when passed nil', function () {
        myTask.assignTo();
        expect(myTask.assignment).to.not.have.property('to')
      })

      it('should always update assignment.by to current user ID', function () {
        myTask.assignTo('memberID');
        expect(myTask.assignment).to.have.property('by').that.equals(Phased.user.uid);
        myTask.assignTo();
        expect(myTask.assignment).to.have.property('by').that.equals(Phased.user.uid);
      })
    })

    describe('#addComment', function() {

    })

    describe('#deleteComment', function() {

    })

    describe('#editComment', function() {

    })

    describe('#postStatus', function() {

    })

    describe('#linkStatus', function() {

    })

    describe('#unlinkStatus', function() {

    })

    describe('#workOn', function() {

    })

    describe('#take', function() {

    })

    describe('#takeAndWorkOn', function() {

    })

    describe('#submitForReview', function() {

    })

    describe('#approve', function() {

    })

    describe('#reject', function() {

    })

  })

  describe('accessors', function () {
    var myTask, cfg, ID;
    beforeEach(function () {
      Phased.SET_UP = true;
      cfg = {
        name : 'sth',
        created : 54657983000,
        projectID : 'sth',
        dueDate : 'sth',
        assignment : {'to' : '{}', 'by' : 'milkman'},
        comments : {'asdf' : {}, '-Kasdf' : {}},
        status : 3,
        statusIDs : {'asdf' : {}, '-Kasdf' : {}}
      }
      ID = '-KasdfmyTaskID';
      myTask = new TaskFactory.Task(ID, cfg);
    })

    describe('dueDate', function () {

    });
    describe('status', function () {

    });
    describe('assignment', function () {

    });
    describe('comments', function () {

    });
  })
});