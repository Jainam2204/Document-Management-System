import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import adminMiddleware from '../middlewares/adminMiddleware.js';
import { getUsedStorage, getAllUsers, updateUserRole, searchUsers, getRecentLogs } from '../controllers/userController.js';

const router = express.Router();

router.get('/used-storage', authMiddleware, getUsedStorage);
router.get('/search', authMiddleware, searchUsers);
router.get('/recent-logs', authMiddleware, getRecentLogs);

router.get('/all', authMiddleware, adminMiddleware, getAllUsers);

router.put('/role/:id', authMiddleware, adminMiddleware, updateUserRole);

export default router;