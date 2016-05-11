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
    snapStub.key = sandbox.stub();
    snapStub.val = sandbox.stub();

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
      _$rootScope_, StatusFactory, _DBObject_) {
      $rootScope = _$rootScope_;
      sandbox.stub($rootScope, '$evalAsync', function (toDo) {
        toDo();
      });
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

    it('should fail when called without a FBRef', function () {
      class badDBOChild extends DBObject {}
      var mkBadChild = function () {
        new badDBOChild();
      }
      expect(mkBadChild).to.throw(Error);
    })

    it('should define pseudo-private _ property', function () {
      var myDBO = new that.DBObjectChild();
      expect(myDBO).to.have.property('_');
      var props = Object.getOwnPropertyDescriptor(myDBO, '_');

      expect(props.configurable).to.be.false;
      expect(props.writable).to.be.true;
      expect(props.enumerable).to.be.false;
    })

    it('should have ID, name, and description properties', function () {
      var myDBO = new that.DBObjectChild();
      expect(myDBO).to.have.property('ID');
      expect(myDBO).to.have.property('name');
      expect(myDBO).to.have.property('description');

      var props = Object.getOwnPropertyDescriptor(myDBO, 'ID');
      expect(props.configurable).to.be.false;
      expect(props.writable).to.be.false;
      expect(props.enumerable).to.be.true;
    })

    it('should have childChanged, destroy, delete, setProperty, removeFromCollection, and pushVal methods', function () {
      var myDBO = new that.DBObjectChild();
      expect(myDBO).to.have.property('childChanged')
        .that.is.a('function')
      expect(myDBO).to.have.property('destroy')
        .that.is.a('function')
      expect(myDBO).to.have.property('delete')
        .that.is.a('function')
      expect(myDBO).to.have.property('setProperty')
        .that.is.a('function')
      expect(myDBO).to.have.property('removeFromCollection')
        .that.is.a('function')
      expect(myDBO).to.have.property('pushVal')
        .that.is.a('function') 
    })
  })


  describe('.name and .description accessors', function () {
    // create an object to house "methods" to spy on
    var that = {};
    var myDBO;

    beforeEach(function () {
      that.DBObject = DBObject;
      sandbox.spy(that, 'DBObject'); // spy on DBObject constructor
      // a class child to extend DBObject 
      class DBObjectChild extends that.DBObject {
        constructor() {
          var myFb = new Firebase();
          super(myFb.child('never!'));
          this._.name = 'Billy Joel';
          this._.description = 'William Martin "Billy" Joel (born May 9, 1949) is an American pianist, singer-songwriter and a composer. Since releasing his first hit song, "Piano Man", in 1973, ...';
        }
      }
      that.DBObjectChild = DBObjectChild;
      myDBO = new that.DBObjectChild();
    });


    it('should return the same value as in the _ property', function () {
      expect(myDBO.name).to.equal(myDBO._.name);
      expect(myDBO.description).to.equal(myDBO._.description);
    })

    it('should only accept strings', function () {
      expect(() => myDBO.name = {}).to.throw(TypeError);
      expect(() => myDBO.name = 12).to.throw(TypeError);
      expect(() => myDBO.name = undefined).to.throw(TypeError);
      expect(() => myDBO.name = 'Billy Mae').to.not.throw(TypeError);

      expect(() => myDBO.description = {}).to.throw(TypeError);
      expect(() => myDBO.description = 12).to.throw(TypeError);
      expect(() => myDBO.description = 'mega').to.not.throw(TypeError);
    })

    it('should not allow empty name', function () {
      expect(() => myDBO.name = null).to.throw(TypeError);
      expect(myDBO.name).to.not.be.empty;

      expect(() => myDBO.name = undefined).to.throw(TypeError);
      expect(myDBO.name).to.not.be.empty;

      expect(() => myDBO.name = '').to.throw(TypeError);
      expect(myDBO.name).to.not.be.empty;
    })

    it('should allow empty description', function () {
      expect(() => myDBO.description = null).to.not.throw(TypeError);
      expect(myDBO.description).to.be.empty;

      expect(() => myDBO.description = undefined).to.not.throw(TypeError);
      expect(myDBO.description).to.be.empty;

      expect(() => myDBO.description = '').to.not.throw(TypeError);
      expect(myDBO.description).to.be.empty;
    })
  })

  describe('#childChanged', function () {
    // create an object to house "methods" to spy on
    var that = {};
    var myDBO;

    beforeEach(function () {
      that.DBObject = DBObject;
      sandbox.spy(that, 'DBObject'); // spy on DBObject constructor
      // a class child to extend DBObject 
      class DBObjectChild extends that.DBObject {
        constructor() {
          var myFb = new Firebase();
          super(myFb.child('never!'));
          this._.name = 'Billy Joel';
          this._.description = 'William Martin "Billy" Joel (born May 9, 1949) is an American pianist, singer-songwriter and a composer. Since releasing his first hit song, "Piano Man", in 1973, ...';
        }
      }
      that.DBObjectChild = DBObjectChild;
      myDBO = new that.DBObjectChild();
    });

    it('should update the respective property on _', function () {
      snapStub.key = sandbox.stub().returns('strProp');
      snapStub.val = sandbox.stub().returns('a value');
      myDBO.childChanged(snapStub);
      expect(myDBO._.strProp).to.equal(snapStub.val());

      snapStub.key = sandbox.stub().returns('numProp');
      snapStub.val = sandbox.stub().returns(5);
      myDBO.childChanged(snapStub);
      expect(myDBO._.numProp).to.equal(snapStub.val());

      snapStub.key = sandbox.stub();
      snapStub.val = sandbox.stub();
    });

    describe('deep merging object properties', function () {
      beforeEach(function () {
        // start state
        myDBO._.objProp = {
          existingProp  : 'exists',
          changedProp   : 'starts the same',
          removedProp   : 'will be removed',
          existingObjProp : {
            existingProp  : 'exists',
            changedProp   : 'starts the same',
            removedProp   : 'will be removed'
          }
        }

        snapStub.key = sandbox.stub().returns('objProp');

        // end state
        snapStub.val = sandbox.stub().returns({
          existingProp  : 'exists',
          newProp       : 'also exists',
          changedProp  : 'is different',
          existingObjProp : {
            existingProp  : 'exists',
            newProp       : 'also exists',
            changedProp  : 'is different',
          }
        });
        myDBO.childChanged(snapStub);
      })

      // FIREST LEVEL
      it('should add all new properties', function () {
        expect(myDBO._.objProp).to.have.property('newProp')
          .that.equals('also exists');
      })

      it('should not remove unchanged existing properties', function () {
        expect(myDBO._.objProp).to.have.property('existingProp')
          .that.equals('exists');
      })

      it('should update values of changed existing properties', function () {
        expect(myDBO._.objProp).to.have.property('changedProp')
          .that.equals('is different');
      })

      it('should remove all newly removed properties', function () {
        expect(myDBO._.objProp).to.not.have.property('removedProp')
      })


      // NEXT LEVEL
      it('should add all new properties to nested object property', function () {
        expect(myDBO._.objProp.existingObjProp).to.have.property('newProp')
          .that.equals('also exists');
      })

      it('should not remove unchanged existing properties to nested object property', function () {
        expect(myDBO._.objProp.existingObjProp).to.have.property('existingProp')
          .that.equals('exists');
      })

      it('should update values of changed existing properties to nested object property', function () {
        expect(myDBO._.objProp.existingObjProp).to.have.property('changedProp')
          .that.equals('is different');
      })

      it('should remove all newly removed properties to nested object property', function () {
        expect(myDBO._.objProp.existingObjProp).to.not.have.property('removedProp')
      })
    })
  });
});