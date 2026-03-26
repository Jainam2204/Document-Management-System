import 'dotenv/config';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import s3 from '../config/s3.js';
import File from '../models/File.js';
import Folder from '../models/Folder.js';
import User from '../models/User.js';
import Counter from '../models/Counter.js';
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