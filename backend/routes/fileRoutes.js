import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import upload from '../middlewares/upload.js';
import {
    uploadFile,
    getUserFiles,
    createFolderTree,
    getUserFolders,
    getFolderContents,
    getTrashItems,
    restoreFile,
    restoreFolder,
    permanentlyDeleteFile,
    permanentlyDeleteFolder,
    createFolder,
    updateFileDeleteStatus,
    renameFile,
    updateFolderDeleteStatus,
    renameFolder,
    generateShareLink,
    getSharedResource,
    getFileDownloadUrl,
    shareResource,
    shareWithUsers,
    getSharedWithMe,
    getSharedFolderContents
} from '../controllers/fileController.js';

const router = express.Router();

router.post('/upload', authMiddleware, upload.single('file'), uploadFile);
router.post('/delete/:id', authMiddleware, updateFileDeleteStatus);
router.post('/rename/:id', authMiddleware, renameFile);
router.post('/share/:type/:id', authMiddleware, generateShareLink);
router.get('/share/:token', getSharedResource);
router.get('/download/:id', authMiddleware, getFileDownloadUrl);
router.post('/create-folder-tree', authMiddleware, createFolderTree);
router.post('/folders', authMiddleware, createFolder);
router.get('/', authMiddleware, getUserFiles);
router.get('/folders', authMiddleware, getUserFolders);
router.get('/folders/:id', authMiddleware, getFolderContents);
router.get('/trash', authMiddleware, getTrashItems);
router.post('/restore/file/:id', authMiddleware, restoreFile);
router.post('/restore/folder/:id', authMiddleware, restoreFolder);
router.post('/permanent/file/:id', authMiddleware, permanentlyDeleteFile);
router.post('/permanent/folder/:id', authMiddleware, permanentlyDeleteFolder);
router.post('/folders/delete/:id', authMiddleware, updateFolderDeleteStatus);
router.post('/folders/rename/:id', authMiddleware, renameFolder);
router.post('/share-with-user/:type/:id', authMiddleware, shareResource);
router.post('/share-with-users/:type/:id', authMiddleware, shareWithUsers);
router.get('/shared-with-me', authMiddleware, getSharedWithMe);
router.get('/shared-with-me/:id', authMiddleware, getSharedFolderContents);

export default router;
