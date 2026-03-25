const express = require('express');
const router = express.Router();

const { login, register, logout, verify } = require('../controllers/authController');

router.post('/login', login);

router.post('/register', register);

router.get('/logout', logout);

router.post('/verify', verify);


module.exports = router;