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

  beforeEach(function() {
    sandbox.spy(window, 'Firebase'); // constructor

    // stub some firebase methods to return some dummy data
    sandbox.spy(Firebase.prototype, 'onAuth');
    sandbox.spy(Firebase.prototype, 'unauth');
    sandbox.stub(Firebase.prototype, 'child', function() {
      return FBRefStub;
    });

    snapStub = sandbox.stub().returnsPromise().resolves({})();
    snapStub.key = sandbox.stub();
    snapStub.val = sandbox.stub();

    FBRefStub = {
      push: function(data) {
        lastPushed = data;
        return snapStub;
      },
      update: function(data) {
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
  	it('should fail when called directly (needs to be extended)', function () {
  		var mkDBO = function mkDBO() {
  			new DBObject();
  		}
  		expect(mkDBO).to.throw(Error);
  	})
  })
});