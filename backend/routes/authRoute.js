import express from 'express';
import checkEmail from '../middlewares/checkEmail.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

import { login, register, logout, verify, generateExpiredAccessToken, getPasswordStatus, changePassword } from '../controllers/authController.js';

router.post('/login', login);
router.post('/register', checkEmail, register);
router.get('/logout', logout);
router.post('/verify', verify);
router.post('/generate-access-token', generateExpiredAccessToken);
router.get('/status', authMiddleware, getPasswordStatus);
router.post('/change-password', authMiddleware, changePassword);

export default router;