'use strict';

describe('Class: Project', function() {
  var DBObject;
  var ProjectFactory;
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
    FBRefStubCl.prototype.key = sandbox.stub().returns('aKey');
    FBRefStubCl.prototype.val = sandbox.stub().returns({});
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
      _$rootScope_, _ProjectFactory_, _TaskFactory_, _StatusFactory_, _DBObject_, _Phased_) {
      $rootScope = _$rootScope_;
  		sandbox.stub($rootScope, '$broadcast', function (_evt_, _data_) {
  			lastBroadcastEvent = _evt_;
  			lastBroadcastEventData = _data_;
  			$rootScope.$emit(_evt_, _data_);
  		});

      sandbox.stub($rootScope, '$evalAsync', function (toDo) {
        toDo();
      });

      ProjectFactory = _ProjectFactory_;
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
        ROLE_ID : {ADMIN:1,MEMBER:0,OWNER:2},
        project : {
        	"HISTORY": ["created", "name changed", "description changed", "deadline changed", "archived", "unarchived"],
        	"HISTORY_ID": {
        		"ARCHIVED": 4,
        		"CREATED": 0,
        		"DEADLINE": 3,
        		"DESCRIPTION": 2,
        		"NAME": 1,
        		"UNARCHIVED": 5
        	},
        	"PRIORITY": ["high", "medium", "low"],
        	"PRIORITY_ID": {
        		"HIGH": 0,
        		"LOW": 2,
        		"MEDIUM": 1
        	},
        	"STATUS": ["In progress", "Complete", "Assigned", "Created", "In review", "Rejected"],
        	"STATUS_ID": {
        		"ASSIGNED": 2,
        		"COMPLETE": 1,
        		"CREATED": 3,
        		"IN_PROGRESS": 0,
        		"IN_REVIEW": 4,
        		"REJECTED": 5
        	}
        }
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
  			new ProjectFactory.Project(undefined, {});
  		}
  		var makeNumID = function () {
  			new ProjectFactory.Project(2134, {});
  		}
  		var makeObjID = function () {
  			new ProjectFactory.Project({a:'asdf'}, {});
  		}
  		var makeStrID = function () {
  			new ProjectFactory.Project('asdf', {});
  		}
  		expect(makeNoID).to.throw(Error);
  		expect(makeNumID).to.throw(Error);
  		expect(makeObjID).to.throw(Error);
  		expect(makeStrID).to.not.throw(Error);
  	})

  	it('should fail without a config object', function () {
  		Phased.SET_UP = true;
  		var makeNoCfg = function () {
  			new ProjectFactory.Project('-Kasdf');
  		}
  		var makeStrCfg = function () {
  			new ProjectFactory.Project('-Kasdf', '2134');
  		}
  		var makeNumCfg = function () {
  			new ProjectFactory.Project('-Kasdf', 2134);
  		}
  		var makeObjCfg = function () {
  			new ProjectFactory.Project('-Kasdf', {a:'asdf'});
  		}
  		expect(makeNoCfg).to.throw(Error);
  		expect(makeStrCfg).to.throw(Error);
  		expect(makeNumCfg).to.throw(Error);
  		expect(makeObjCfg).to.not.throw(Error);
  	})

  	it('should fail if Phased isnt set up', function () {
  		var makeTask = function () {
  			new ProjectFactory.Project('asdf', {});
  		}
  		expect(makeTask).to.throw(Error);
  	})

  	it('should extend DBObject', function() {
  		Phased.SET_UP = true;
  		var myProject = new ProjectFactory.Project('asdf', {});
  		expect(myProject).to.be.an.instanceOf(DBObject);
  	})

  	it('should pin relevant cfg params to _', function () {
  		Phased.SET_UP = true;
  		var cfg = {
  			name : 'sth',
  			description : 'sth',
  			dueDate : 'sth',
  			status : 3,
  			comments : {'asdf' : {}, '-Kasdf' : {}},
  			statusIDs : {'asdf' : {}, '-Kasdf' : {}},
  			taskIDs : {'asdf' : {}, '-Kasdf' : {}},
  			memberIDs : {'asdf' : {}, '-Kasdf' : {}}
  		}
  		var myProject = new ProjectFactory.Project('asdf', cfg);
  		for (var prop in cfg) {
  			let val = cfg[prop];
  			expect(myProject._).to.have.property(prop)
  				.that.equals(val);
  		}
  	})

    it('should ensure comments, memberIDs, taskIDs, and statusIDs have empty objects if they don\'t exist', function () {
      Phased.SET_UP = true;
      var cfg = {
        name : 'sth',
        projectID : 'sth'
      }
      var myProject = new ProjectFactory.Project('asdf', cfg);
      expect(myProject._).to.have.property('comments').that.is.an('object');
      expect(myProject._).to.have.property('memberIDs').that.is.an('object');
      expect(myProject._).to.have.property('taskIDs').that.is.an('object');
      expect(myProject._).to.have.property('statusIDs').that.is.an('object');
    })

  	it('should expose comments, memberIDs, taskIDs, and statusIDs ', function () {
  		Phased.SET_UP = true;
  		var cfg = {
  			comments : {'asdf' : {}, '-Kasdf' : {}},
  			statusIDs : {'asdf' : {}, '-Kasdf' : {}},
  			taskIDs : {'asdf' : {}, '-Kasdf' : {}},
  			memberIDs : {'asdf' : {}, '-Kasdf' : {}}
  		}
  		var myProject = new ProjectFactory.Project('asdf', cfg);
      expect(myProject.comments).to.equal(myProject._.comments).and.to.equal(cfg.comments);
      expect(myProject.memberIDs).to.equal(myProject._.memberIDs).and.to.equal(cfg.memberIDs);
      expect(myProject.taskIDs).to.equal(myProject._.taskIDs).and.to.equal(cfg.taskIDs);
      expect(myProject.statusIDs).to.equal(myProject._.statusIDs).and.to.equal(cfg.statusIDs);
  	})

  	it('should define immutable created prop', function () {
  		Phased.SET_UP = true;
  		var cfg = {
  			created : 54657983000
  		}
  		var myProject = new ProjectFactory.Project('asdf', cfg);
  		expect(myProject).to.have.property('created');
  		expect(myProject).to.have.ownPropertyDescriptor('created', {value: cfg.created, configurable:false, writable:false, enumerable: true});
  	})

  	it('should broadcast a PROJECT_ADDED event', function () {
  		Phased.SET_UP = true;
  		var cfg = {
  			created : 54657983000
  		}
  		new ProjectFactory.Project('asdf', cfg);

  		expect(lastBroadcastEvent).to.equal(Phased.RUNTIME_EVENTS.PROJECT_ADDED);
  		expect(lastBroadcastEventData).to.equal('asdf');
  	})
  })
	
	describe('methods', function () {
    var myProject, cfg, ID;
    beforeEach(function () {
      Phased.SET_UP = true;
      cfg = {
        name : 'sth',
        description : 'asdfasdf',
        created : 54657983000,
        dueDate : 'sth',
        comments : {'asdf' : {}, '-Kasdf' : {}},
        status : 3,
        statusIDs : {'asdf' : {}, '-Kasdf' : {}},
        taskIDs : {'asdf' : {}, '-Kasdf' : {}},
        memberIDs : {'asdf' : {}, '-Kasdf' : {}}
      }
      ID = '-KasdfmyProjectID';
      myProject = new ProjectFactory.Project(ID, cfg);
    })

    describe('#destroy', function () {
    	beforeEach(function () {
    		myProject = new ProjectFactory.Project(ID, cfg);
    	})

    	it('should broadcast PROJECT_DESTROYED event', function () {
    		var projID = myProject.ID;
    		myProject.destroy();
    		expect(lastBroadcastEvent).to.equal(Phased.RUNTIME_EVENTS.PROJECT_DESTROYED);
    		expect(lastBroadcastEventData).to.equal(projID);
    	})

    	it('should call super.destroy', function () {
    		sandbox.spy(DBObject.prototype, 'destroy');
    		myProject.destroy();
        assert(DBObject.prototype.destroy.called, 'DBObject.destroy was not called');
    	})
    })

    describe('#addMember', function () {
    	it('should fail if arg is not a string', function () {
        expect(() => myProject.addMember(1)).to.throw(TypeError);
        expect(() => myProject.addMember({a:1})).to.throw(TypeError);
        expect(() => myProject.addMember([1,2,3])).to.throw(TypeError);
        expect(() => myProject.addMember(undefined)).to.throw(TypeError);
        expect(() => myProject.addMember(null)).to.throw(TypeError);
    	})

    	it('should fail if arg is not the UID of a team member', function () {
    		expect(() => myProject.addMember('not a member')).to.throw(ReferenceError);
    		expect(() => myProject.addMember('memberID')).to.not.throw(ReferenceError);
    	})

    	it('should add member ID to memberIDs', function () {
    		myProject.addMember('memberID');
    		expect(_.values(myProject._.memberIDs)).to.contain('memberID', 'in _,');
    		expect(_.values(myProject.memberIDs)).to.contain('memberID', 'in accessor,');
    	})
    })

    describe('#removeMember', function () {
    	beforeEach(function () {
    		myProject._.memberIDs['asdf'] = 'memberID';
    	})

    	it('should fail if arg is not a string', function () {
        expect(() => myProject.removeMember(1)).to.throw(TypeError);
        expect(() => myProject.removeMember({a:1})).to.throw(TypeError);
        expect(() => myProject.removeMember([1,2,3])).to.throw(TypeError);
        expect(() => myProject.removeMember(undefined)).to.throw(TypeError);
        expect(() => myProject.removeMember(null)).to.throw(TypeError);
    	})

    	it('should fail if arg is not the UID of a team member', function () {
    		expect(() => myProject.removeMember('not a member')).to.throw(ReferenceError);
    		expect(() => myProject.removeMember('memberID')).to.not.throw(ReferenceError);
    	})

    	it('should remove the member from memberIDs', function () {
    		myProject.removeMember('memberID');
    		expect(_.values(myProject.memberIDs)).to.not.contain('memberID');
    	})
    })

    describe('#createTask', function () {
    	it('should fail if arg is not a string or cfg object', function () {
        expect(() => myProject.createTask(1)).to.throw(TypeError);
        expect(() => myProject.createTask(undefined)).to.throw(TypeError);
        expect(() => myProject.createTask(null)).to.throw(TypeError);

        expect(() => myProject.createTask({name:'asdf'})).to.not.throw(TypeError);
    	})

    	it('should call TaskFactory.create with an object with own ID ast projectID', function () {
    		sandbox.spy(TaskFactory, 'create');
    		myProject.createTask('get to the choppa');
    		assert(TaskFactory.create.called, 'TaskFactory.create was not called');

    		var args = TaskFactory.create.args[0][0];
    		expect(args).to.have.property('projectID').that.equals(myProject.ID);
    	})

    	it('should attempt to link new task to taskIDs', function () {
    		var taskID = 'someTask';
    		sandbox.stub(TaskFactory, 'create').returnsPromise().resolves(taskID);
    		sandbox.spy(myProject, 'linkTask');
    		myProject.createTask('get to the choppa');
    		assert(myProject.linkTask.called, 'linkTask was not called');
    		assert(myProject.linkTask.calledWith(taskID), 'linkTask was called with the wrong data');
    		myProject.linkTask.restore();
    		TaskFactory.create.restore();
    	})

    	it('should return a promise', function () {
    		myProject.createTask('return a promise').should.be.an.instanceOf(Promise);
    	})
    })

    describe('#linkTask', function () {
    	it('should fail if arg is not a string', function () {
        expect(() => myProject.linkTask(1)).to.throw(TypeError);
        expect(() => myProject.linkTask({a:1})).to.throw(TypeError);
        expect(() => myProject.linkTask([1,2,3])).to.throw(TypeError);
        expect(() => myProject.linkTask(undefined)).to.throw(TypeError);
        expect(() => myProject.linkTask(null)).to.throw(TypeError);
    	})

    	it('should fail if arg is not the UID of an existing task', function () {
    		Phased.team.tasks['taskID'] = new TaskFactory.Task('taskID', {name: 'juice some lemons'});
    		expect(() => myProject.linkTask('not a task')).to.throw(ReferenceError);
    		expect(() => myProject.linkTask('taskID')).to.not.throw(ReferenceError);
    	})

    	it('should add task ID to taskIDs', function () {
    		Phased.team.tasks['taskID'] = new TaskFactory.Task('taskID', {name: 'juice some lemons'});
    		myProject.linkTask('taskID');
    		expect(_.values(myProject._.taskIDs)).to.contain('taskID', 'in _,');
    		expect(_.values(myProject.taskIDs)).to.contain('taskID', 'in accessor,');
    	})

    	it('should set task projectID to this project ID', function () {
    		Phased.team.tasks['taskID'] = new TaskFactory.Task('taskID', {name: 'juice some lemons'});
    		myProject.linkTask('taskID');
    		expect(Phased.team.tasks['taskID']).to.have.property('projectID').that.equals(myProject.ID);
    	})

    	it('should unlink task from other project, if linked', function () {
    		Phased.team.tasks['taskID'] = new TaskFactory.Task('taskID', {name: 'juice some lemons', projectID : 'otherProj'});
    		Phased.team.projects['otherProj'] = new ProjectFactory.Project('otherProj', {name: 'asdf', taskIDs: {'asd' : 'taskID'}});
    		sandbox.spy(Phased.team.projects['otherProj'], 'unlinkTask');

    		myProject.linkTask('taskID');

    		assert(Phased.team.projects['otherProj'].unlinkTask.called, 'otherProj.unlinkTask was not called');
    		assert(Phased.team.projects['otherProj'].unlinkTask.calledWith('taskID'), 'otherProj.unlinkTask was called with bad data: ' + Phased.team.projects['otherProj'].unlinkTask.args[0][0]);
    	});
    })

    describe('#unlinkTask', function () {
    	beforeEach(function () {
    		Phased.team.tasks['taskID'] = new TaskFactory.Task('taskID', {name: 'juice some lemons', projectID: myProject.ID});
    		myProject._.taskIDs['asdf'] = 'taskID';
    	})
    	it('should fail if arg is not a string', function () {
        expect(() => myProject.unlinkTask(1)).to.throw(TypeError);
        expect(() => myProject.unlinkTask({a:1})).to.throw(TypeError);
        expect(() => myProject.unlinkTask([1,2,3])).to.throw(TypeError);
        expect(() => myProject.unlinkTask(undefined)).to.throw(TypeError);
        expect(() => myProject.unlinkTask(null)).to.throw(TypeError);
    	})

    	it('should the tasks projectID to ""', function () {
    		myProject.unlinkTask('taskID');
    		expect(Phased.team.tasks['taskID'].projectID).to.be.empty;
    	})

    	it('should remove the taskID from own taskIDs', function () {
    		myProject.unlinkTask('taskID');
    		expect(_.values(myProject.taskIDs)).to.not.contain('taskID');
    	})
    })

    describe('#addComment', function () {
    	
    })

    describe('#deleteComment', function () {
    	
    })

    describe('#editComment', function () {
    	
    })

    describe('#postStatus', function () {
      it('should fail if args are neither string nor object', function () {
        expect(()=> myProject.postStatus()).to.throw(TypeError);
        expect(()=> myProject.postStatus(1234)).to.throw(TypeError);
        expect(()=> myProject.postStatus(true)).to.throw(TypeError);

        expect(()=> myProject.postStatus({name:'val'})).to.not.throw(TypeError);
        expect(()=> myProject.postStatus('asdf')).to.not.throw(TypeError);
      })

      it('should call StatusFactory.create', function () {
        sandbox.stub(StatusFactory, 'create');
        myProject.postStatus('my lovely status');
        assert(StatusFactory.create.called, 'did not call StatusFactory.create');
        StatusFactory.create.restore();
      })

      it('should pass StatusFactory.create an object with the appropriate taskID', function () {
        sandbox.stub(StatusFactory, 'create');
        myProject.postStatus('my lovely status');
        var args = StatusFactory.create.args[0][0];
        expect(args.projectID).to.equal(myProject.ID);
        StatusFactory.create.restore();
      })

      it('should attempt to link new status to statusIDs', function () {
        var statusID = 'someTask';
        sandbox.stub(StatusFactory, 'create').returnsPromise().resolves(statusID);
        sandbox.spy(myProject, 'linkStatus');
        myProject.postStatus('mrrow');
        assert(myProject.linkStatus.called, 'linkStatus was not called');
        assert(myProject.linkStatus.calledWith(statusID), 'linkStatus was called with the wrong data');
        myProject.linkStatus.restore();
        StatusFactory.create.restore();
      })

      it('should return a promise', function () {
        myProject.postStatus('return a promise').should.be.an.instanceOf(Promise);
      })
    })

    describe('#linkStatus', function () {
    	
    })

    describe('#unlinkStatus', function () {
    	
    })

	})

	describe('accessors', function () {
    var myProject, cfg, ID;
    beforeEach(function () {
      Phased.SET_UP = true;
      cfg = {
        name : 'sth',
        description : 'asdfasdf',
        created : 54657983000,
        dueDate : 'sth',
        comments : {'asdf' : {}, '-Kasdf' : {}},
        status : 3,
        statusIDs : {'asdf' : {}, '-Kasdf' : {}},
        taskIDs : {'asdf' : {}, '-Kasdf' : {}},
        memberIDs : {'asdf' : {}, '-Kasdf' : {}}
      }
      ID = '-KasdfmyProjectID';
      myProject = new ProjectFactory.Project(ID, cfg);
    })

		it('should generally return the value in _', function () {
			expect(myProject.dueDate).to.equal(myProject._.dueDate);
			expect(myProject.status).to.equal(myProject._.status);
			expect(myProject.comments).to.equal(myProject._.comments);
			expect(myProject.memberIDs).to.equal(myProject._.memberIDs);
			expect(myProject.taskIDs).to.equal(myProject._.taskIDs);
		})
		describe('dueDate', function () {
			
		})

		describe('status', function () {
			
		})

		describe('comments', function () {
			
		})

		describe('memberIDs', function () {
			
		})

		describe('taskIDs', function () {
			
		})

	})

});