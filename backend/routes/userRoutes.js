import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import adminMiddleware from '../middlewares/adminMiddleware.js';
import { getUsedStorage, getAllUsers, updateUserRole } from '../controllers/userController.js';

const router = express.Router();

router.get('/used-storage', authMiddleware, getUsedStorage);

router.get('/all', authMiddleware, adminMiddleware, getAllUsers);

router.put('/role/:id', authMiddleware, adminMiddleware, updateUserRole);

export default router;