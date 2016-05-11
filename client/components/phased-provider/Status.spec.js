'use strict';

describe('Class: Status', function() {

  var DBObject;
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
      _$rootScope_, _StatusFactory_, _DBObject_, _Phased_) {
      $rootScope = _$rootScope_;
  		sandbox.stub($rootScope, '$broadcast', function (_evt_, _data_) {
  			lastBroadcastEvent = _evt_;
  			lastBroadcastEventData = _data_;
  			$rootScope.$emit(_evt_, _data_);
  		});

      sandbox.stub($rootScope, '$evalAsync', function (toDo) {
        toDo();
      });
      StatusFactory = _StatusFactory_;
      DBObject = _DBObject_;
      Phased = _Phased_;

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
  			new StatusFactory.Status(undefined, {});
  		}
  		var makeNumID = function () {
  			new StatusFactory.Status(2134, {});
  		}
  		var makeObjID = function () {
  			new StatusFactory.Status({a:'asdf'}, {});
  		}
  		var makeStrID = function () {
  			new StatusFactory.Status('asdf', {});
  		}
  		expect(makeNoID).to.throw(Error);
  		expect(makeNumID).to.throw(Error);
  		expect(makeObjID).to.throw(Error);
  		expect(makeStrID).to.not.throw(Error);
  	})

  	it('should fail without a config object', function () {
  		Phased.SET_UP = true;
  		var makeNoCfg = function () {
  			new StatusFactory.Status('-Kasdf');
  		}
  		var makeStrCfg = function () {
  			new StatusFactory.Status('-Kasdf', '2134');
  		}
  		var makeNumCfg = function () {
  			new StatusFactory.Status('-Kasdf', 2134);
  		}
  		var makeObjCfg = function () {
  			new StatusFactory.Status('-Kasdf', {a:'asdf'});
  		}
  		expect(makeNoCfg).to.throw(Error);
  		expect(makeStrCfg).to.throw(Error);
  		expect(makeNumCfg).to.throw(Error);
  		expect(makeObjCfg).to.not.throw(Error);
  	})

  	it('should fail if Phased isnt set up', function () {
  		var makeStatus = function () {
  			new StatusFactory.Status('asdf', {});
  		}
  		expect(makeStatus).to.throw(Error);
  	})

  	it('should extend DBObject', function() {
  		Phased.SET_UP = true;
  		var myStatus = new StatusFactory.Status('asdf', {});
  		expect(myStatus).to.be.an.instanceOf(DBObject);
  	})

  	it('should pin relevant cfg params to _', function () {
  		Phased.SET_UP = true;
  		var cfg = {
  			name : 'sth',
  			projectID : 'sth',
  			taskID : 'sth',
  			startTime : 'sth',
  			endTime : 'sth',
  			totalTime : 'sth'
  		}
  		var myStatus = new StatusFactory.Status('asdf', cfg);
  		for (var prop in cfg) {
  			let val = cfg[prop];
  			expect(myStatus._).to.have.property(prop)
  				.that.equals(val);
  		}
  	})

  	it('should expose taskID and projectID', function () {
  		Phased.SET_UP = true;
  		var cfg = {
  			projectID : 'sth',
  			taskID : 'sth'
  		}
  		var myStatus = new StatusFactory.Status('asdf', cfg);
  		expect(myStatus.taskID).to.equal(myStatus._.taskID).and.to.equal(cfg.taskID);
  		expect(myStatus.projectID).to.equal(myStatus._.projectID).and.to.equal(cfg.projectID);
  	})

  	it('should define fixed user and time props', function () {
  		Phased.SET_UP = true;
  		var cfg = {
  			user : 'someUID',
  			time : 54657983000
  		}
  		var myStatus = new StatusFactory.Status('asdf', cfg);
  		expect(myStatus).to.have.property('user');
  		expect(myStatus).to.have.ownPropertyDescriptor('user', {value: cfg.user, configurable:false, writable:false, enumerable: true});

  		expect(myStatus).to.have.property('time');
  		expect(myStatus).to.have.ownPropertyDescriptor('time', {value: cfg.time, configurable:false, writable:false, enumerable: true});
  	})

  	it('should broadcast a STATUS_ADDED event', function () {
  		Phased.SET_UP = true;
  		var cfg = {
  			user : 'someUID',
  			time : 54657983000
  		}
  		var myStatus = new StatusFactory.Status('asdf', cfg);

  		expect(lastBroadcastEvent).to.equal(Phased.RUNTIME_EVENTS.STATUS_ADDED);
  		expect(lastBroadcastEventData).to.equal('asdf');
  	})
  })

  describe('methods', function() {
  	var myStatus, cfg, ID;
  	beforeEach(function () {
  		Phased.SET_UP = true;
  		cfg = {
  			name : 'sth',
  			projectID : 'sth',
  			taskID : 'sth',
  			startTime : 'sth',
  			endTime : 'sth',
  			totalTime : 'sth',
  			user : 'someUID',
  			time : 54657983000
  		}
  		ID = '-Kasdkew4312qzxorsomething';
  	});

  	describe('#destroy', function () {
  		beforeEach(function () {
  			myStatus = new StatusFactory.Status(ID, cfg);
  		});

  		it('should fire STATUS_DESTROYED with identifying info', function () {
  			var data = {
  				statusID : myStatus.ID,
  				projectID : myStatus.projectID,
  				taskID : myStatus.taskID
  			}
  			myStatus.destroy();

	  		expect(lastBroadcastEvent).to.equal(Phased.RUNTIME_EVENTS.STATUS_DESTROYED);
	  		expect(lastBroadcastEventData).to.deep.equal(data);
  		})

  		it('should call super.destroy', function () {
  			sandbox.spy(DBObject.prototype, 'destroy');
  			myStatus.destroy();
  			assert(DBObject.prototype.destroy.called, 'DBObject.destroy was not called');
  		});
  	});

  	describe('#delete', function () {
  		beforeEach(function () {
  			myStatus = new StatusFactory.Status(ID, cfg);
  			Phased.team.members[cfg.user] = {
  				currentStatus: ID
  			}
  		});

  		it('should update the currentStatus attr of its user if needed', function () {
  			expect(Phased.team.members[cfg.user].currentStatus).to.equal(ID);
  			myStatus.delete();
  			assert(FBRefStub.prototype.set.called, 'FBRef.set was not called');
  			expect(lastSet).to.not.equal(ID);
  		})

  		it('should call super.delete', function () {
  			sandbox.spy(DBObject.prototype, 'delete');
  			myStatus.delete();
  			assert(DBObject.prototype.delete.called, 'DBObject.delete was not called');
  		});
  	});
  });

  describe('accessors', function () {
  	var myStatus, cfg, ID;
  	beforeEach(function () {
  		Phased.SET_UP = true;
  		cfg = {
  			name : 'sth',
  			projectID : 'sth',
  			taskID : 'sth',
  			startTime : 1463004841200,
  			endTime : 1463009841200,
  			totalTime : 5000000,
  			user : 'someUID',
  			time : 54657983000
  		}
  		ID = '-Kasdkew4312qzxorsomething';
  		myStatus = new StatusFactory.Status(ID, cfg);
  	});

		it('should generally return the value kept in _', function () {
			expect(myStatus.startTime).to.equal(myStatus._.startTime);
			expect(myStatus.endTime).to.equal(myStatus._.endTime);
			expect(myStatus.totalTime).to.equal(myStatus._.totalTime);
		});

		describe('set startTime', function () {
			it('should fail if val isn\'t Date-like', function () {
				var setStartTime = function (newT) {
					myStatus.startTime = newT;
				}
				// with undefined
				expect(setStartTime.bind(undefined, undefined)).to.throw(TypeError);
				// with some string
				expect(setStartTime.bind(undefined, 'asome')).to.throw(TypeError);
				// with object
				expect(setStartTime.bind(undefined, {a:1})).to.throw(TypeError);
			})

			it('should not fail if val is Date-like', function () {
				var setStartTime = function (newT) {
					myStatus.startTime = newT;
				}
				// with Date
				expect(setStartTime.bind(undefined, new Date())).to.not.throw(TypeError);
				// with Moment
				expect(setStartTime.bind(undefined, new moment())).to.not.throw(TypeError);
				// with timestamp
				expect(setStartTime.bind(undefined, 1463009841200)).to.not.throw(TypeError);
			});

			it('should call setProperty', function () {
				sandbox.spy(DBObject.prototype, 'setProperty');
				myStatus.startTime = 1463009841200;
				assert(DBObject.prototype.setProperty.called, 'did not call super.setProperty');
			})

			it('should update totalTime', function () {
				myStatus.startTime = myStatus.endTime - 200;
				expect(myStatus.totalTime).to.equal(200);
			})
		})

		describe('set endTime', function () {
			it('should fail if val isn\'t Date-like', function () {
				var setEndTime = function (newT) {
					myStatus.endTime = newT;
				}
				// with undefined
				expect(setEndTime.bind(undefined, undefined)).to.throw(TypeError);
				// with some string
				expect(setEndTime.bind(undefined, 'asome')).to.throw(TypeError);
				// with object
				expect(setEndTime.bind(undefined, {a:1})).to.throw(TypeError);
			})

			it('should not fail if val is Date-like', function () {
				var setEndTime = function (newT) {
					myStatus.startTime = newT;
				}
				// with Date
				expect(setEndTime.bind(undefined, new Date())).to.not.throw(TypeError);
				// with Moment
				expect(setEndTime.bind(undefined, new moment())).to.not.throw(TypeError);
				// with timestamp
				expect(setEndTime.bind(undefined, 1463009841201)).to.not.throw(TypeError);
			});

			it('should call setProperty', function () {
				sandbox.spy(DBObject.prototype, 'setProperty');
				myStatus.endTime = 1463009841201;
				assert(DBObject.prototype.setProperty.called, 'did not call super.setProperty');
			})

			it('should fail if new end is before start', function () {
				expect(() => {myStatus.endTime = myStatus.startTime - 200}).to.throw(Error);
			})

			it('should update totalTime', function () {
				myStatus.endTime = myStatus.startTime + 200;
				expect(myStatus.totalTime).to.equal(200);
			})
		})
  })
});