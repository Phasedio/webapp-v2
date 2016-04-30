/*
	GLOBAL CONFIG FOR CLIENT UNIT TESTS

	Don't run any tests in here; this is only to hold configs to run before/after
	each test in the suite.
*/

var sandbox;

// do once before testing
before(function(){
	sandbox = sinon.sandbox.create();
  sandbox.useFakeServer();
});

// do after each component test
afterEach(function(){
	sandbox.restore();
});