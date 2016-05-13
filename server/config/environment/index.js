'use strict';

var path = require('path');
var _ = require('lodash');

function requiredProcessEnv(name) {
  if (!process.env[name]) {
    throw new Error('You must set the ' + name + ' environment variable');
  }
  return process.env[name];
}

// All configurations will extend these options
// ============================================
var all = {
  env: process.env.NODE_ENV,

  // Root path of server
  root: path.normalize(__dirname + '/../../..'),

  // Server port
  port: process.env.PORT || 9000,

  // Server IP
  ip: process.env.IP || '0.0.0.0',

  // Should we populate the DB with sample data?
  seedDB: false,

  // Secret for session, you will want to change this and make it an environment variable
  secrets: {
    session: 'webapp-v2-secret'
  },

  // MongoDB connection options
  mongo: {
    options: {
      db: {
        safe: true
      }
    }
  },

  FSEC : 'A50wFi5OxaLYNzb4jnEyFMQWmE8mjRyWJCKW723g',  // DB SECRECT
  FUID: 'phased-server',                               // AUTH UID
  STRIPE_SECRET : 'sk_live_nKZ1ouWkI3WuiVGK2hIvZUH1', // Stripe secret -- we should use the test one for dev
  MANDRILL_SECRET : 'B0N7XKd4RDy6Q7nWP2eFAA'          // Mandrill secret
};

// Export the config object based on the NODE_ENV
// ==============================================
module.exports = _.merge(
  all,
  require('./shared'),
  require('./' + process.env.NODE_ENV + '.js') || {});
