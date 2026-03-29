import 'dotenv/config';
import { PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
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

export const saveFileMetadata = async (req, res) => {
    try {
        const { name, s3Key, size, type, folderId } = req.body;

        if (!name || !s3Key || !size) {
            return res.status(400).json({
                success: false,
                message: 'name, s3Key, and size are required',
            });
        }

        const counter = await Counter.findOneAndUpdate(
            { collectionName: 'files' },
            { $inc: { count: 1 } },
            { new: true, upsert: true }
        );

        const file = await File.create({
            id: counter.count,
            name,
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

        const rootCounter = await Counter.findOneAndUpdate(
            { collectionName: 'folders' },
            { $inc: { count: 1 } },
            { new: true, upsert: true }
        );

        const rootFolder = await Folder.create({
            id: rootCounter.count,
            name: rootName,
            parentFolder: null,
            owner: userId,
        });

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

        const existingFolder = await Folder.findOne({
            name: name.trim(),
            parentFolder: parentId || null,
            owner: userId,
            isDeleted: false,
        });

        if (existingFolder) {
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
            name: name.trim(),
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
        file.deletedAt = Date.now();

        await file.save();

        await User.findOneAndUpdate(req.user._id, {
            $inc: { storageUsed: -file.size }
        });

        return res.status(200).json({
            success: true,
            message: 'File deleted successfully'
        });
    } catch (err) {
        console.error('Error : ', err);
        res.status(400).json({
            success: false,
            message: 'Error occured while deleting file'
        });
    }
}

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

        folder.isDeleted = true;
        folder.deletedAt = Date.now();

        await folder.save();

        return res.status(200).json({
            success: true,
            message: 'Folder deleted successfully'
        });
    } catch (err) {
        console.error('Error : ', err);
        res.status(400).json({
            success: false,
            message: 'Error occured while deleting folder'
        });
    }
}

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
        const duplicateName = await File.findOne({
            owner: req.user._id,
            folder: folderId,
            name: trimmedName,
            isDeleted: false,
            _id: { $ne: fileId }
        });

        if (!duplicateName) {
            file.name = trimmedName;
        } else {
            const extensionIndex = trimmedName.lastIndexOf('.');
            const baseName = extensionIndex >= 0 ? trimmedName.slice(0, extensionIndex) : trimmedName;
            const extension = extensionIndex >= 0 ? trimmedName.slice(extensionIndex) : '';
            let counter = 1;
            let candidate = `${baseName}(${counter})${extension}`;

            while (await File.findOne({
                owner: req.user._id,
                folder: folderId,
                name: candidate,
                isDeleted: false
            })) {
                counter += 1;
                candidate = `${baseName}(${counter})${extension}`;
            }

            file.name = candidate;
        }

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
        const existingFolder = await Folder.findOne({
            owner: req.user._id,
            parentFolder: folder.parentFolder || null,
            name: trimmedName,
            isDeleted: false,
            _id: { $ne: folderId }
        });

        if (existingFolder) {
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