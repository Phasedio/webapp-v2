'use strict';

describe('Class: Task', function() {

  var DBObject;
  var TaskFactory;
  var StatusFactory;
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
    Firebase.ServerValue = {
      TIMESTAMP : 'ServerValue.TIMESTAMP'
    }
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
      _$rootScope_, _TaskFactory_, _StatusFactory_, _DBObject_, _Phased_) {
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
      StatusFactory = _StatusFactory_;
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
      beforeEach(function () {
        myTask._.assignment = {};
      })
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
      beforeEach(function () {
        myTask._.comments = {};
      })

      it('should fail if arg isnt a string comment', function () {
        expect(()=> myTask.addComment()).to.throw(TypeError);
        expect(()=> myTask.addComment(1234)).to.throw(TypeError);
        expect(()=> myTask.addComment('')).to.throw(TypeError);
        expect(()=> myTask.addComment({a:1})).to.throw(TypeError);
        expect(()=> myTask.addComment([1,3])).to.throw(TypeError);
      })

      it('should call pushVal', function () {
        sandbox.spy(myTask, 'pushVal');
        myTask.addComment('this is a comment');
        assert(myTask.pushVal.called, 'did not call pushVal');
        myTask.pushVal.restore();
      });

      it('should pass pushVal an object with text, user, and timestamp', function () {
        var args = {
          text: 'this is a comment',
          user: Phased.user.uid,
          time: Firebase.ServerValue.TIMESTAMP
        }
        myTask.addComment(args.text);
        expect(lastPushed).to.deep.equal(args);
      })

      it('should add comment to list of comments', function() {
        myTask.addComment('this is a comment');
        var key = Object.keys(myTask.comments).pop(); // should be only comment
        var comment = myTask.comments[key];
        expect(comment).to.have.property('text').that.equals('this is a comment');
        expect(comment).to.have.property('user').that.equals(Phased.user.uid);
        expect(comment).to.have.property('time'); // once FB transaction completes this will be an actual timestamp
      })
    })

    describe('#deleteComment', function() {
      beforeEach(function () {
        myTask._.comments = {
          'commentID' : {
            text : 'asdf',
            user : Phased.user.uid,
            time : 5646540000
          }
        };
      })
      it('should fail if the argument is not a string', function () {
        expect(()=> myTask.deleteComment()).to.throw(TypeError);
        expect(()=> myTask.deleteComment(1234)).to.throw(TypeError);
        expect(()=> myTask.deleteComment({a:1})).to.throw(TypeError);
        expect(()=> myTask.deleteComment([1,3])).to.throw(TypeError);
      })

      it('should fail if the argument is not a UID for an existing comment', function () {
        expect(()=> myTask.deleteComment('not a comment')).to.throw(ReferenceError);
      })

      it('should delete the comment', function () {
        myTask.deleteComment('commentID');
        expect(myTask.comments).to.be.empty;
      })
    })

    describe('#editComment', function() {
      beforeEach(function () {
        myTask._.comments = {
          'commentID' : {
            text : 'asdf',
            user : Phased.user.uid,
            time : 5646540000
          }
        };
      })

      it('should fail if the ID argument is not a string', function () {
        expect(()=> myTask.editComment()).to.throw(TypeError);
        expect(()=> myTask.editComment(1234, 'text')).to.throw(TypeError);
        expect(()=> myTask.editComment({a:1}, 'text')).to.throw(TypeError);
        expect(()=> myTask.editComment([1,3], 'text')).to.throw(TypeError);
      })

      it('should fail if the ID argument is not a UID for an existing comment', function () {
        expect(()=> myTask.editComment('not a comment', 'text')).to.throw(ReferenceError);
      })

      it('should fail if the text argument is a string', function () {
        expect(()=> myTask.editComment('commentID')).to.throw(TypeError);
        expect(()=> myTask.editComment('commentID', 1234)).to.throw(TypeError);
        expect(()=> myTask.editComment('commentID', {a:1})).to.throw(TypeError);
        expect(()=> myTask.editComment('commentID', [1,3])).to.throw(TypeError);
      })

      it('should edit the comment', function () {
        myTask.editComment('commentID', 'new text');
        expect(myTask.comments['commentID'].text).to.equal('new text');
      })
    })

    describe('#postStatus', function() {
      it('should fail if args are neither string nor object', function () {
        expect(()=> myTask.postStatus()).to.throw(TypeError);
        expect(()=> myTask.postStatus(1234)).to.throw(TypeError);
        expect(()=> myTask.postStatus(true)).to.throw(TypeError);

        expect(()=> myTask.postStatus({name:'val'})).to.not.throw(TypeError);
        expect(()=> myTask.postStatus('asdf')).to.not.throw(TypeError);
      })

      it('should call StatusFactory.create', function () {
        sandbox.stub(StatusFactory, 'create');
        myTask.postStatus('my lovely status');
        assert(StatusFactory.create.called, 'did not call StatusFactory.create');
        StatusFactory.create.restore();
      })

      it('should pass StatusFactory.create an object with the appropriate taskID', function () {
        sandbox.stub(StatusFactory, 'create');
        myTask.postStatus('my lovely status');
        var args = StatusFactory.create.args[0][0];
        expect(args.taskID).to.equal(myTask.ID);
        StatusFactory.create.restore();
      })
    })

    describe('#linkStatus', function() {
      beforeEach(function () {
        Phased.team.statuses = {
          'statusID' : new StatusFactory.Status('statusID', {name:'chillin', taskID : 'purpleTask'})
        }
        Phased.team.tasks = {
          'purpleTask' : new TaskFactory.Task('purpleTask', {name: 'purple', statusIDs : {'a':'statusID'}})
        }
        myTask = new TaskFactory.Task(ID, cfg);
        Phased.team.tasks[myTask.ID] = myTask;
      })

      it('should fail if arg is not a string', function () {
        expect(()=> myTask.linkStatus()).to.throw(TypeError);
        expect(()=> myTask.linkStatus(1234)).to.throw(TypeError);
        expect(()=> myTask.linkStatus(true)).to.throw(TypeError);
        expect(()=> myTask.linkStatus({name:'val'})).to.throw(TypeError);

        expect(()=> myTask.linkStatus('asdf')).to.not.throw(TypeError);
      })

      it('should fail if arg is not the UID of an existing status', function () {
        expect(()=> myTask.linkStatus('asdf')).to.throw(ReferenceError);
        expect(()=> myTask.linkStatus('statusID')).to.not.throw(ReferenceError);
      })

      it('should set status taskID to this task\'s ID', function () {
        myTask.linkStatus('statusID');
        expect(Phased.team.statuses['statusID'].taskID).to.equal(myTask.ID);
      })

      it('should add status ID to own statusIDs list', function () {
        myTask.linkStatus('statusID');
        expect(_.values(myTask.statusIDs)).to.contain('statusID');
      })

      it('should attempt to unlink the status from its old task, if it is already linked', function () {
        sandbox.spy(Phased.team.tasks['purpleTask'], 'unlinkStatus');
        Phased.team.tasks['purpleTask'].linkStatus('statusID'); // set up initial linkage
        myTask.linkStatus('statusID');
        assert(Phased.team.tasks['purpleTask'].unlinkStatus.calledWith('statusID'), 'did not attmept to call unlinkStatus');
        Phased.team.tasks['purpleTask'].unlinkStatus.restore();
      })
    })

    describe('#unlinkStatus', function() {
      beforeEach(function () {
        Phased.team.statuses = {
          'statusID' : new StatusFactory.Status('statusID', {name:'chillin', taskID : 'purpleTask'})
        }
        Phased.team.tasks = {
          'purpleTask' : new TaskFactory.Task('purpleTask', {name: 'purple', statusIDs : {'a':'statusID'}})
        }
        myTask = new TaskFactory.Task(ID, cfg);
        Phased.team.tasks[myTask.ID] = myTask;
      })

      it('should fail if arg is not a string', function () {
        expect(()=> myTask.unlinkStatus()).to.throw(TypeError);
        expect(()=> myTask.unlinkStatus(1234)).to.throw(TypeError);
        expect(()=> myTask.unlinkStatus(true)).to.throw(TypeError);
        expect(()=> myTask.unlinkStatus({name:'val'})).to.throw(TypeError);

        expect(()=> myTask.unlinkStatus('asdf')).to.not.throw(TypeError);
      })

      it('should empty the status\'s taskID', function () {
        Phased.team.tasks['purpleTask'].unlinkStatus('statusID');
        expect(Phased.team.statuses['statusID'].taskID).to.be.empty;
      })

      it('should remove the status\'s ID from the task\'s statusIDs', function () {
        Phased.team.tasks['purpleTask'].unlinkStatus('statusID');
        expect(_.values(Phased.team.tasks['purpleTask'].statusIDs)).to.not.include('statusID');
      })
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