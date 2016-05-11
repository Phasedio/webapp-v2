'use strict';

describe('Class: DBObject', function() {

  var DBObject;
  // other modules to save
  var $rootScope;

  // a stub data snapshot
  var snapStub;
  // a stub FBRef
  var FBRefStub;
  // data fed to push gets stashed here
  var lastPushed;
  // data fed to update gets stashed here
  var lastUpdated;
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
    snapStub.key = sandbox.stub();
    snapStub.val = sandbox.stub();

    class FBRefStubCl extends Firebase {
    };

    FBRefStubCl.prototype.then = sandbox.stub();
    FBRefStubCl.prototype.key = sandbox.stub();
    FBRefStubCl.prototype.val = sandbox.stub();
    FBRefStubCl.prototype.set = sandbox.stub();
    FBRefStubCl.prototype.on = sandbox.stub().returnsPromise().resolves({});
    FBRefStubCl.prototype.once = sandbox.stub().returnsPromise().resolves({});
    FBRefStubCl.prototype.push = sandbox.spy(function (data) {
      lastPushed = data;
      return snapStub;
    });
    FBRefStubCl.prototype.update = sandbox.spy(function (data) {
      lastUpdated = data;
      return snapStub;
    });

    FBRefStub = FBRefStubCl;

    // create the dummy module
    angular.module('dummyModule', [])
    // inject into our module and stash some other modules
    // this will instantiate the DBObject class as extended by StatusFactory
    module('webappV2App', 'dummyModule');
    inject(function(
      _$rootScope_, StatusFactory, _DBObject_) {
      $rootScope = _$rootScope_;
      DBObject = _DBObject_;
    });
  });

  afterEach(function() {
    sandbox.reset();
  });


  //
  //	TESTS
  //

  describe('#constructor', function () {
    // create an object to house "methods" to spy on
    var that = {};

    beforeEach(function () {
      that.DBObject = DBObject;
      sandbox.spy(that, 'DBObject'); // spy on DBObject constructor
      // a class child to extend DBObject 
      class DBObjectChild extends that.DBObject {
        constructor() {
          var myFb = new Firebase();
          super(myFb.child('never!'));
        }
      }
      that.DBObjectChild = DBObjectChild;
    });


  	it('should fail when called directly (needs to be extended)', function () {
  		var mkDBO = function mkDBO() {
  			new DBObject();
  		}
  		expect(mkDBO).to.throw(Error);
  	})

    it('should be called when a child class is instantiated', function () {
      new that.DBObjectChild();
      assert(that.DBObject.called, 'DBObject constructor was not called');
    })
  })
});