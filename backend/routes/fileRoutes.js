import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
    getUploadUrl,
    saveFileMetadata,
    getUserFiles,
    createFolderTree,
    getUserFolders,
    getFolderContents,
    createFolder,
    updateFileDeleteStatus,
    renameFile,
    updateFolderDeleteStatus,
    renameFolder,
    generateShareLink,
    getSharedResource
} from '../controllers/fileController.js';

const router = express.Router();

router.post('/upload-url', authMiddleware, getUploadUrl);
router.post('/save', authMiddleware, saveFileMetadata);
router.post('/delete/:id', authMiddleware, updateFileDeleteStatus);
router.post('/rename/:id', authMiddleware, renameFile);
router.post('/share/:type/:id', authMiddleware, generateShareLink);
router.get('/share/:token', getSharedResource);
router.post('/create-folder-tree', authMiddleware, createFolderTree);
router.post('/folders', authMiddleware, createFolder);
router.get('/', authMiddleware, getUserFiles);
router.get('/folders', authMiddleware, getUserFolders);
router.get('/folders/:id', authMiddleware, getFolderContents);
router.post('/folders/delete/:id', authMiddleware, updateFolderDeleteStatus);
router.post('/folders/rename/:id', authMiddleware, renameFolder);

export default router;
