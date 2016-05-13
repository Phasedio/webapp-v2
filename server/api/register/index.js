'use strict';

var express = require('express');
var controller = require('./register.controller');

var router = express.Router();

router.get('/', controller.index);
router.post('/user', controller.registerUser);
router.post('/team', controller.registerTeam);

module.exports = router;
