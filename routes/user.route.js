const express = require('express');
const router = express.Router();
const userService = require('../services/userService');

router.post('/register', userService.register);
router.post('/login', userService.login);

module.exports = router;