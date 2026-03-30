import 'dotenv/config';
import { PutObjectCommand, HeadObjectCommand, DeleteObjectCommand, DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import s3 from '../config/s3.js';
import File from '../models/File.js';
import Folder from '../models/Folder.js';
import User from '../models/User.js';
import Counter from '../models/Counter.js';
import ShareLink from '../models/ShareLink.js';
import { generateToken } from '../utils/generateToken.js';
import { generateDownloadUrl } from '../utils/generateDownloadURL.js';
import { v4 as uuidv4 } from 'uuid';
import { getUniqueFileName, folderNameExists, findExistingFolder } from '../utils/uniqueName.js';

const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Split an array into smaller chunks.
 * @param array - The source array to split.
 * @param size - Maximum number of items per chunk.
 * @returns An array of array chunks.
 */
const chunkArray = (array, size) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
};

/**
 * Recursively collect descendant folder IDs for a set of root folders.
 * @param rootFolderIds - The starting folder IDs to traverse.
 * @param ownerId - Owner ID used to restrict results.
 * @returns A flattened list of descendant folder IDs.
 */
const findDescendantFolderIds = async (rootFolderIds, ownerId) => {
    const allFolderIds = [...rootFolderIds];
    let queue = [...rootFolderIds];

    while (queue.length) {
        const children = await Folder.find({ parentFolder: { $in: queue }, owner: ownerId }).select('_id').lean();
        const nextIds = children.map((child) => child._id);
        if (!nextIds.length) break;
        allFolderIds.push(...nextIds);
        queue = nextIds;
    }

    return allFolderIds;
};

/**
 * Remove multiple objects from AWS S3 in batches.
 * @param keys - List of S3 object keys to delete.
 * @returns A promise that resolves after delete operations complete.
 */
const deleteS3Objects = async (keys) => {
    const validKeys = keys.filter(Boolean);
    if (!validKeys.length) return;

    const keyBatches = chunkArray(validKeys, 1000);
    for (const batch of keyBatches) {
        const command = new DeleteObjectsCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Delete: {
                Objects: batch.map((key) => ({ Key: key })),
                Quiet: true,
            },
        });
        await s3.send(command);
    }
};

/**
 * Remove a single object from AWS S3.
 * @param key - S3 key for the object to delete.
 * @returns A promise that resolves when the object is deleted.
 */
const deleteS3Object = async (key) => {
    if (!key) return;
    const command = new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
    });
    await s3.send(command);
};

/**
 * Restore all deleted ancestor folders of a given folder.
 * @param folderId - The folder whose parent chain should be restored.
 * @param ownerId - Owner ID used for folder lookup.
 * @returns A promise that resolves after the parent chain is restored.
 */
const restoreParentFolderChain = async (folderId, ownerId) => {
    const traverseIds = [];
    let currentId = folderId;

    while (currentId) {
        const folder = await Folder.findOne({ _id: currentId, owner: ownerId });
        if (!folder) break;
        traverseIds.unshift(folder._id);
        currentId = folder.parentFolder;
    }

    if (!traverseIds.length) return;

    await Folder.updateMany(
        { _id: { $in: traverseIds }, owner: ownerId, isDeleted: true },
        { $set: { isDeleted: false, deletedAt: null } }
    );
};

/**
 * Permanently delete expired trash items for a user.
 * @param ownerId - User ID whose trash should be cleaned.
 * @returns A promise that resolves when cleanup completes.
 */
const cleanupExpiredTrash = async (ownerId) => {
    const expirationThreshold = new Date(Date.now() - TRASH_RETENTION_MS);

    const expiredFiles = await File.find({
        owner: ownerId,
        isDeleted: true,
        deletedAt: { $lt: expirationThreshold },
    }).lean();

    if (expiredFiles.length) {
        await deleteS3Objects(expiredFiles.map((file) => file.s3Key));
        const totalSize = expiredFiles.reduce((sum, file) => sum + (file.size || 0), 0);
        await File.deleteMany({ _id: { $in: expiredFiles.map((file) => file._id) } });
        await User.findByIdAndUpdate(ownerId, { $inc: { storageUsed: -totalSize } });
    }

    const expiredFolders = await Folder.find({
        owner: ownerId,
        isDeleted: true,
        deletedAt: { $lt: expirationThreshold },
    }).lean();

    for (const folder of expiredFolders) {
        try {
            const descendantFolderIds = await findDescendantFolderIds([folder._id], ownerId);
            const filesToDelete = await File.find({ owner: ownerId, folder: { $in: descendantFolderIds } }).lean();
            if (filesToDelete.length) {
                await deleteS3Objects(filesToDelete.map((file) => file.s3Key));
                const totalSize = filesToDelete.reduce((sum, file) => sum + (file.size || 0), 0);
                await User.findByIdAndUpdate(ownerId, { $inc: { storageUsed: -totalSize } });
                await File.deleteMany({ _id: { $in: filesToDelete.map((file) => file._id) } });
            }
            await Folder.deleteMany({ _id: { $in: descendantFolderIds }, owner: ownerId });
        } catch (error) {
            console.error('Error cleaning expired folder trash:', error);
        }
    }
};

/**
 * Soft delete a folder and all of its descendants.
 * @param folderId - Root folder to move to trash.
 * @param ownerId - Owner ID used to limit the update scope.
 * @returns A promise that resolves after the folder tree is marked deleted.
 */
const softDeleteFolderTree = async (folderId, ownerId) => {
    const folderIds = await findDescendantFolderIds([folderId], ownerId);
    const timestamp = new Date();

    await Folder.updateMany(
        { _id: { $in: folderIds }, owner: ownerId, isDeleted: false },
        { $set: { isDeleted: true, deletedAt: timestamp } }
    );

    await File.updateMany(
        { owner: ownerId, folder: { $in: folderIds }, isDeleted: false },
        { $set: { isDeleted: true, deletedAt: timestamp } }
    );
};

/**
 * Restore a soft-deleted folder tree from trash.
 * @param folderId - Root folder ID to restore.
 * @param ownerId - Owner ID used to scope the restore.
 * @returns A promise that resolves after the folder tree is restored.
 */
const restoreFolderTree = async (folderId, ownerId) => {
    const folderIds = await findDescendantFolderIds([folderId], ownerId);

    await Folder.updateMany(
        { _id: { $in: folderIds }, owner: ownerId, isDeleted: true },
        { $set: { isDeleted: false, deletedAt: null } }
    );

    await File.updateMany(
        { owner: ownerId, folder: { $in: folderIds }, isDeleted: true },
        { $set: { isDeleted: false, deletedAt: null } }
    );
};

/**
 * Permanently delete a file record and its S3 object.
 * @param fileId - File ID to delete.
 * @param ownerId - Owner ID used for file lookup.
 * @returns The deleted file document, or null if not found.
 */
const permanentlyDeleteFileById = async (fileId, ownerId) => {
    const file = await File.findOne({ _id: fileId, owner: ownerId });
    if (!file) {
        return null;
    }

    try {
        await deleteS3Object(file.s3Key);
    } catch (error) {
        console.error('S3 object delete failed for file:', fileId, error);
    }

    await File.deleteOne({ _id: fileId, owner: ownerId });
    await User.findByIdAndUpdate(ownerId, { $inc: { storageUsed: -(file.size || 0) } });
    return file;
};

/**
 * Permanently delete a folder tree and all associated files.
 * @param folderId - Folder ID to delete.
 * @param ownerId - Owner ID used for folder lookup.
 * @returns The deleted root folder document, or null if not found.
 */
const permanentlyDeleteFolderById = async (folderId, ownerId) => {
    const rootFolder = await Folder.findOne({ _id: folderId, owner: ownerId });
    if (!rootFolder) {
        return null;
    }

    const folderIds = await findDescendantFolderIds([folderId], ownerId);
    const filesToDelete = await File.find({ owner: ownerId, folder: { $in: folderIds } }).lean();
    const fileKeys = filesToDelete.map((file) => file.s3Key).filter(Boolean);
    if (fileKeys.length) {
        await deleteS3Objects(fileKeys);
    }

    const totalSize = filesToDelete.reduce((sum, file) => sum + (file.size || 0), 0);
    await File.deleteMany({ _id: { $in: filesToDelete.map((file) => file._id) } });
    await Folder.deleteMany({ _id: { $in: folderIds }, owner: ownerId });
    await User.findByIdAndUpdate(ownerId, { $inc: { storageUsed: -totalSize } });
    return rootFolder;
};

/**
 * Generate a signed S3 upload URL for a new file.
 * @param req - Express request object containing file details in body.
 * @param res - Express response object used to return upload URL.
 * @returns HTTP 200 with uploadUrl and s3Key, or HTTP 400/500 on error.
 */
export const getUploadUrl = async (req, res) => {
    try {
        const { fileName, fileType, fileSize } = req.body;

        if (!fileName || !fileType || !fileSize) {
            return res.status(400).json({
                success: false,
                message: 'fileName, fileType, and fileSize are required',
            });
        }

        const user = req.user;
        const remainingStorage = user.storageLimit - user.storageUsed;

        if (fileSize > remainingStorage) {
            return res.status(400).json({
                success: false,
                message: 'Not enough storage space',
            });
        }

        const s3Key = `uploads/${user._id}/${uuidv4()}-${fileName}`;

        const command = new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: s3Key,
            ContentType: fileType,
        });

        const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 120 });

        res.status(200).json({
            success: true,
            uploadUrl,
            s3Key,
        });
    } catch (error) {
        console.error('Error in getUploadUrl: ' + error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate upload URL',
        });
    }
};

/**
 * Persist newly uploaded file metadata to the database.
 * @param req - Express request object containing file metadata in body.
 * @param res - Express response object for success or error response.
 * @returns HTTP 201 with the created file record or HTTP 400/500 on failure.
 */
export const saveFileMetadata = async (req, res) => {
    try {
        const { name, s3Key, size, type, folderId } = req.body;

        if (!name || !s3Key || !size) {
            return res.status(400).json({
                success: false,
                message: 'name, s3Key, and size are required',
            });
        }

        const uniqueName = await getUniqueFileName(req.user._id, folderId || null, name);

        const counter = await Counter.findOneAndUpdate(
            { collectionName: 'files' },
            { $inc: { count: 1 } },
            { new: true, upsert: true }
        );

        const file = await File.create({
            id: counter.count,
            name: uniqueName,
            s3Key,
            size,
            type: type || 'application/octet-stream',
            folder: folderId || null,
            owner: req.user._id,
        });

        await User.findByIdAndUpdate(req.user._id, {
            $inc: { storageUsed: size },
        });

        res.status(201).json({
            success: true,
            message: 'File saved successfully',
            file,
        });
    } catch (error) {
        console.error('Error in saveFileMetadata: ' + error);
        res.status(500).json({
            success: false,
            message: 'Failed to save file metadata',
        });
    }
};

/**
 * Retrieve user files for the current folder or root location.
 * @param req - Express request object containing optional folderId query.
 * @param res - Express response object used to return file list.
 * @returns HTTP 200 with files array or HTTP 500 on failure.
 */
export const getUserFiles = async (req, res) => {
    try {
        const { folderId } = req.query;

        const query = {
            owner: req.user._id,
            isDeleted: false,
        };

        if (folderId) {
            query.folder = folderId;
        } else {
            query.folder = null;
        }

        const files = await File.find(query)
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({
            success: true,
            files,
        });
    } catch (error) {
        console.error('Error in getUserFiles: ' + error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch files',
        });
    }
};

/**
 * Create a nested folder structure based on a set of paths.
 * @param req - Express request object with rootName and subPaths in body.
 * @param res - Express response object used to return created folders mapping.
 * @returns HTTP 201 with path-to-id map or HTTP 400/500 on failure.
 */
export const createFolderTree = async (req, res) => {
    try {
        const { rootName, subPaths } = req.body;

        if (!rootName) {
            return res.status(400).json({
                success: false,
                message: 'rootName is required',
            });
        }

        const userId = req.user._id;

        const pathToIdMap = {};

        let rootFolder = await findExistingFolder(userId, null, rootName);

        if (!rootFolder) {
            const rootCounter = await Counter.findOneAndUpdate(
                { collectionName: 'folders' },
                { $inc: { count: 1 } },
                { new: true, upsert: true }
            );

            rootFolder = await Folder.create({
                id: rootCounter.count,
                name: rootName,
                parentFolder: null,
                owner: userId,
            });
        }

        pathToIdMap[''] = rootFolder._id.toString();

        if (subPaths && subPaths.length > 0) {
            const sorted = [...subPaths].sort(
                (a, b) => a.split('/').length - b.split('/').length
            );

            for (const relativePath of sorted) {
                const parts = relativePath.split('/');
                const folderName = parts[parts.length - 1];
                const parentPath = parts.slice(0, -1).join('/');

                const parentId = parentPath === ''
                    ? rootFolder._id
                    : pathToIdMap[parentPath];

                if (!parentId) {
                    console.warn(`Parent not found for path: ${relativePath}`);
                    continue;
                }

                const existing = await findExistingFolder(userId, parentId, folderName);

                if (existing) {
                    pathToIdMap[relativePath] = existing._id.toString();
                    continue;
                }

                const counter = await Counter.findOneAndUpdate(
                    { collectionName: 'folders' },
                    { $inc: { count: 1 } },
                    { new: true, upsert: true }
                );

                const folder = await Folder.create({
                    id: counter.count,
                    name: folderName,
                    parentFolder: parentId,
                    owner: userId,
                });

                pathToIdMap[relativePath] = folder._id.toString();
            }
        }

        res.status(201).json({
            success: true,
            message: 'Folder tree created successfully',
            pathToIdMap,
        });
    } catch (error) {
        console.error('Error in createFolderTree: ' + error);
        res.status(500).json({
            success: false,
            message: 'Failed to create folder tree',
        });
    }
};

/**
 * Retrieve user folders for the current parent folder or root.
 * @param req - Express request object containing optional parentFolder query.
 * @param res - Express response object used to return folder list.
 * @returns HTTP 200 with folders array or HTTP 500 on failure.
 */
export const getUserFolders = async (req, res) => {
    try {
        const { parentFolder } = req.query;

        const query = {
            owner: req.user._id,
            isDeleted: false,
        };

        if (parentFolder) {
            query.parentFolder = parentFolder;
        } else {
            query.parentFolder = null;
        }

        const folders = await Folder.find(query)
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({
            success: true,
            folders,
        });
    } catch (error) {
        console.error('Error in getUserFolders: ' + error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch folders',
        });
    }
};

/**
 * Retrieve files and subfolders inside a specific folder.
 * @param req - Express request object containing folder id in params.
 * @param res - Express response object returning folder contents.
 * @returns HTTP 200 with folder details or HTTP 400/500 on failure.
 */
export const getFolderContents = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Folder ID is required',
            });
        }

        const folder = await Folder.findOne({
            _id: id,
            owner: req.user._id,
            isDeleted: false,
        });

        if (!folder) {
            return res.status(404).json({
                success: false,
                message: 'Folder not found',
            });
        }

        const subfolders = await Folder.find({
            parentFolder: id,
            owner: req.user._id,
            isDeleted: false,
        }).sort({ createdAt: -1 }).lean();

        const files = await File.find({
            folder: id,
            owner: req.user._id,
            isDeleted: false,
        }).sort({ createdAt: -1 }).lean();

        res.status(200).json({
            success: true,
            folder: {
                _id: folder._id,
                id: folder.id,
                name: folder.name,
                parentFolder: folder.parentFolder,
            },
            files,
            subfolders,
        });
    } catch (error) {
        console.error('Error in getFolderContents: ' + error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch folder contents',
        });
    }
};

/**
 * Retrieve soft-deleted files and folders for the current user.
 * @param req - Express request object with authenticated user on req.user.
 * @param res - Express response object returning trash contents.
 * @returns HTTP 200 with files and folders in trash or HTTP 500 on failure.
 */
export const getTrashItems = async (req, res) => {
    try {
        await cleanupExpiredTrash(req.user._id);

        const threshold = new Date(Date.now() - TRASH_RETENTION_MS);

        const files = await File.find({
            owner: req.user._id,
            isDeleted: true,
            deletedAt: { $gte: threshold },
        })
            .sort({ deletedAt: -1 })
            .lean();

        const folders = await Folder.find({
            owner: req.user._id,
            isDeleted: true,
            deletedAt: { $gte: threshold },
        })
            .sort({ deletedAt: -1 })
            .lean();

        return res.status(200).json({
            success: true,
            files,
            folders,
        });
    } catch (error) {
        console.error('Error in getTrashItems: ' + error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch trash items',
        });
    }
};

/**
 * Restore a soft-deleted file from trash.
 * @param req - Express request object containing file id in params.
 * @param res - Express response object returning operation result.
 * @returns HTTP 200 on success or HTTP 404/500 on failure.
 */
export const restoreFile = async (req, res) => {
    try {
        const file = await File.findOne({
            _id: req.params.id,
            owner: req.user._id,
            isDeleted: true,
        });

        if (!file) {
            return res.status(404).json({
                success: false,
                message: 'File not found in trash',
            });
        }

        if (file.folder) {
            await restoreParentFolderChain(file.folder, req.user._id);
        }

        file.isDeleted = false;
        file.deletedAt = null;
        await file.save();

        return res.status(200).json({
            success: true,
            message: 'File restored successfully',
        });
    } catch (error) {
        console.error('Error in restoreFile: ' + error);
        res.status(500).json({
            success: false,
            message: 'Failed to restore file',
        });
    }
};

/**
 * Restore a soft-deleted folder and its descendants from trash.
 * @param req - Express request object containing folder id in params.
 * @param res - Express response object returning operation result.
 * @returns HTTP 200 on success or HTTP 404/500 on failure.
 */
export const restoreFolder = async (req, res) => {
    try {
        const folder = await Folder.findOne({
            _id: req.params.id,
            owner: req.user._id,
            isDeleted: true,
        });

        if (!folder) {
            return res.status(404).json({
                success: false,
                message: 'Folder not found in trash',
            });
        }

        if (folder.parentFolder) {
            await restoreParentFolderChain(folder.parentFolder, req.user._id);
        }

        await restoreFolderTree(folder._id, req.user._id);

        return res.status(200).json({
            success: true,
            message: 'Folder restored successfully',
        });
    } catch (error) {
        console.error('Error in restoreFolder: ' + error);
        res.status(500).json({
            success: false,
            message: 'Failed to restore folder',
        });
    }
};

/**
 * Permanently delete a single file from trash and S3.
 * @param req - Express request object containing file id in params.
 * @param res - Express response object returning operation result.
 * @returns HTTP 200 on success or HTTP 404/500 on failure.
 */
export const permanentlyDeleteFile = async (req, res) => {
    try {
        const file = await File.findOne({
            _id: req.params.id,
            owner: req.user._id,
            isDeleted: true,
        });

        if (!file) {
            return res.status(404).json({
                success: false,
                message: 'File not found in trash',
            });
        }

        await permanentlyDeleteFileById(file._id, req.user._id);

        return res.status(200).json({
            success: true,
            message: 'File permanently deleted',
        });
    } catch (error) {
        console.error('Error in permanentlyDeleteFile: ' + error);
        res.status(500).json({
            success: false,
            message: 'Failed to permanently delete file',
        });
    }
};

/**
 * Permanently delete a folder tree and associated files from trash.
 * @param req - Express request object containing folder id in params.
 * @param res - Express response object returning operation result.
 * @returns HTTP 200 on success or HTTP 404/500 on failure.
 */
export const permanentlyDeleteFolder = async (req, res) => {
    try {
        const folder = await Folder.findOne({
            _id: req.params.id,
            owner: req.user._id,
            isDeleted: true,
        });

        if (!folder) {
            return res.status(404).json({
                success: false,
                message: 'Folder not found in trash',
            });
        }

        await permanentlyDeleteFolderById(folder._id, req.user._id);

        return res.status(200).json({
            success: true,
            message: 'Folder permanently deleted',
        });
    } catch (error) {
        console.error('Error in permanentlyDeleteFolder: ' + error);
        res.status(500).json({
            success: false,
            message: 'Failed to permanently delete folder',
        });
    }
};

/**
 * Create a new folder in the user's directory.
 * @param req - Express request object with folder name and optional parentId.
 * @param res - Express response object returning created folder details.
 * @returns HTTP 201 on success or HTTP 400/500 on failure.
 */
export const createFolder = async (req, res) => {
    try {
        const { name, parentId } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Folder name is required',
            });
        }

        const userId = req.user._id;
        const trimmedName = name.trim();

        if (await folderNameExists(userId, parentId || null, trimmedName)) {
            return res.status(400).json({
                success: false,
                message: 'A folder with this name already exists in the current location',
            });
        }

        const counter = await Counter.findOneAndUpdate(
            { collectionName: 'folders' },
            { $inc: { count: 1 } },
            { new: true, upsert: true }
        );

        const folder = await Folder.create({
            id: counter.count,
            name: trimmedName,
            parentFolder: parentId || null,
            owner: userId,
        });

        res.status(201).json({
            success: true,
            message: 'Folder created successfully',
            folder,
        });
    } catch (error) {
        console.error('Error in createFolder: ' + error);
        res.status(500).json({
            success: false,
            message: 'Failed to create folder',
        });
    }
};

/**
 * Soft delete a file by updating its delete status.
 * @param req - Express request object containing file id in params.
 * @param res - Express response object returning operation result.
 * @returns HTTP 200 on success or HTTP 404/400 on errors.
 */
export const updateFileDeleteStatus = async (req, res) => {
    try {
        const fileId = req.params.id;

        const file = await File.findOne({
            _id: fileId,
            owner: req.user._id,
            isDeleted: false
        });

        if (!file) {
            return res.status(404).send({
                success: false,
                message: 'File not found'
            });
        }

        file.isDeleted = true;
        file.deletedAt = new Date();

        await file.save();

        return res.status(200).json({
            success: true,
            message: 'File moved to trash successfully'
        });
    } catch (err) {
        console.error('Error : ', err);
        res.status(400).json({
            success: false,
            message: 'Error occured while deleting file'
        });
    }
}

/**
 * Soft delete a folder tree by updating delete status for all descendants.
 * @param req - Express request object containing folder id in params.
 * @param res - Express response object returning operation result.
 * @returns HTTP 200 on success or HTTP 404/400 on errors.
 */
export const updateFolderDeleteStatus = async (req, res) => {
    try {
        const folderId = req.params.id;

        const folder = await Folder.findOne({
            _id: folderId,
            owner: req.user._id,
            isDeleted: false
        });

        if (!folder) {
            return res.status(404).send({
                success: false,
                message: 'Folder not found'
            });
        }

        await softDeleteFolderTree(folder._id, req.user._id);

        return res.status(200).json({
            success: true,
            message: 'Folder moved to trash successfully'
        });
    } catch (err) {
        console.error('Error : ', err);
        res.status(400).json({
            success: false,
            message: 'Error occured while deleting folder'
        });
    }
}

/**
 * Rename an existing file within the user's folder.
 * @param req - Express request object containing file id in params and newName in body.
 * @param res - Express response object returning updated file or error.
 * @returns HTTP 200 on success or HTTP 400/404 on error.
 */
export const renameFile = async (req, res) => {
    try {
        const fileId = req.params.id;
        const { newName } = req.body;

        if (!newName || !newName.trim()) {
            return res.status(400).send({
                success: false,
                message: 'New name must not be empty'
            });
        }

        const file = await File.findOne({
            _id: fileId,
            owner: req.user._id,
            isDeleted: false
        });

        if (!file) {
            return res.status(404).send({
                success: false,
                message: 'File not found'
            });
        }

        const trimmedName = newName.trim();
        const folderId = file.folder || null;

        file.name = await getUniqueFileName(req.user._id, folderId, trimmedName, fileId);

        await file.save();

        return res.status(200).json({
            success: true,
            message: 'File renamed successfully',
            file
        });
    } catch (err) {
        console.error('Error : ', err);
        res.status(400).json({
            success: false,
            message: 'Error occured while renaming file'
        });
    }
}

/**
 * Rename an existing folder within the user's directory.
 * @param req - Express request object containing folder id in params and newName in body.
 * @param res - Express response object returning updated folder or error.
 * @returns HTTP 200 on success or HTTP 400/404 on failure.
 */
export const renameFolder = async (req, res) => {
    try {
        const folderId = req.params.id;
        const { newName } = req.body;

        if (!newName || !newName.trim()) {
            return res.status(400).send({
                success: false,
                message: 'New folder name must not be empty'
            });
        }

        const folder = await Folder.findOne({
            _id: folderId,
            owner: req.user._id,
            isDeleted: false
        });

        if (!folder) {
            return res.status(404).send({
                success: false,
                message: 'Folder not found'
            });
        }

        const trimmedName = newName.trim();

        if (await folderNameExists(req.user._id, folder.parentFolder || null, trimmedName, folderId)) {
            return res.status(400).json({
                success: false,
                message: 'A folder with this name already exists in the same location'
            });
        }

        folder.name = trimmedName;
        await folder.save();

        return res.status(200).json({
            success: true,
            message: 'Folder renamed successfully',
            folder
        });
    } catch (err) {
        console.error('Error : ', err);
        res.status(400).json({
            success: false,
            message: 'Error occured while renaming folder'
        });
    }
}

/**
 * Generate a shareable URL for a file or folder.
 * @param req - Express request object containing resource type and id in params and optional expiry in body.
 * @param res - Express response object returning the share link.
 * @returns HTTP 201 with share URL or appropriate error responses.
 */
export const generateShareLink = async (req, res) => {
    try {
        const { expiry } = req.body;
        const { type, id } = req.params;

        if (!['file', 'folder'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid resource type for sharing'
            });
        }

        const Model = type === 'file' ? File : Folder;
        const resource = await Model.findOne({
            _id: id,
            owner: req.user._id,
            isDeleted: false
        });

        if (!resource) {
            return res.status(404).json({
                success: false,
                message: `${type.charAt(0).toUpperCase() + type.slice(1)} not found`
            });
        }

        const expiresAt = expiry ? new Date(expiry) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        if (isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
            return res.status(400).json({
                success: false,
                message: 'Invalid expiry date'
            });
        }

        const expiresInSeconds = Math.min(
            Math.max(1, Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
            604800
        );

        const token = generateToken();
        await ShareLink.create({
            resourceType: type,
            resourceId: resource._id,
            token,
            expiresAt,
            createdBy: req.user._id
        });

        if (type === 'file') {
            try {
                const headCommand = new HeadObjectCommand({
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Key: resource.s3Key
                });
                await s3.send(headCommand);
            } catch (headError) {
                console.error('Share file head object failed:', headError);
                return res.status(404).json({
                    success: false,
                    message: 'Shared file does not exist in S3'
                });
            }

            const downloadUrl = await generateDownloadUrl(resource.s3Key, expiresInSeconds);
            return res.status(201).json({
                success: true,
                url: downloadUrl,
                expiresAt: expiresAt.toISOString()
            });
        }

        const url = `${req.protocol}://${req.get('host')}/api/files/share/${token}`;
        return res.status(201).json({
            success: true,
            url,
            expiresAt: expiresAt.toISOString()
        });
    } catch (err) {
        console.error('Error : ', err);
        res.status(500).json({
            success: false,
            message: 'Error occured while generating share link'
        });
    }
}

/**
 * Resolve a share token and return the shared resource.
 * @param req - Express request object containing the share token in params.
 * @param res - Express response object returning the shared file or folder listing.
 * @returns HTTP 200 with shared data or HTTP 404/500 on failure.
 */
export const getSharedResource = async (req, res) => {
    try {
        const { token } = req.params;
        const shareLink = await ShareLink.findOne({
            token,
            expiresAt: { $gt: new Date() }
        });

        if (!shareLink) {
            return res.status(404).json({
                success: false,
                message: 'Share link is invalid or expired'
            });
        }

        if (shareLink.resourceType === 'file') {
            const file = await File.findOne({
                _id: shareLink.resourceId,
                isDeleted: false
            });

            if (!file) {
                return res.status(404).json({
                    success: false,
                    message: 'Shared file not found'
                });
            }

            try {
                const headCommand = new HeadObjectCommand({
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Key: file.s3Key
                });
                await s3.send(headCommand);
            } catch (headError) {
                console.error('Shared file head check failed:', headError);
                return res.status(404).json({
                    success: false,
                    message: 'Shared file does not exist in S3'
                });
            }

            const downloadUrl = await generateDownloadUrl(file.s3Key, 300);
            return res.redirect(downloadUrl);
        }

        const folder = await Folder.findOne({
            _id: shareLink.resourceId,
            isDeleted: false
        });

        if (!folder) {
            return res.status(404).json({
                success: false,
                message: 'Shared folder not found'
            });
        }

        const files = await File.find({
            folder: folder._id,
            isDeleted: false
        });

        const sharedFiles = await Promise.all(
            files.map(async (file) => ({
                id: file._id,
                name: file.name,
                type: file.type,
                size: file.size,
                downloadUrl: await generateDownloadUrl(file.s3Key, 300)
            }))
        );

        return res.status(200).json({
            success: true,
            type: 'folder',
            folder: { id: folder._id, name: folder.name },
            files: sharedFiles
        });
    } catch (err) {
        console.error('Error : ', err);
        res.status(500).json({
            success: false,
            message: 'Error occured while resolving share link'
        });
    }
}