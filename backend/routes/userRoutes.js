import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { getUsedStorage } from '../controllers/userController.js';

const router = express.Router();

router.get('/used-storage', authMiddleware, getUsedStorage);

export default router;