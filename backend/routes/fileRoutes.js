import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
    getUploadUrl,
    saveFileMetadata,
    getUserFiles,
    createFolderTree,
    getUserFolders
} from '../controllers/fileController.js';

const router = express.Router();

router.post('/upload-url', authMiddleware, getUploadUrl);
router.post('/save', authMiddleware, saveFileMetadata);
router.post('/create-folder-tree', authMiddleware, createFolderTree);
router.get('/', authMiddleware, getUserFiles);
router.get('/folders', authMiddleware, getUserFolders);

export default router;
