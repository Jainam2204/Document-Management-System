import express from 'express';
// import checkEmail from '../middlewares/checkEmail.js';
// import authMiddleware from '../middlewares/authMiddleware.js'

const router = express.Router();

import { login, register, logout, verify, generateExpiredAccessToken } from '../controllers/authController.js';

router.post('/login', login);
router.post('/register', register);
router.get('/logout', logout);
router.post('/verify', verify);
router.post('/generate-access-token', generateExpiredAccessToken);

export default router;