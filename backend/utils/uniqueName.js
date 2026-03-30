import File from '../models/File.js';
import Folder from '../models/Folder.js';

export const getUniqueFileName = async (ownerId, folderId, fileName, excludeId = null) => {

    const existingFile = await File.findOne({
        owner: ownerId,
        folder: folderId || null,
        name: fileName,
        isDeleted: false,
        ...(excludeId && { _id: { $ne: excludeId } })
    });

    if (!existingFile) return fileName;

    const dotIndex = fileName.lastIndexOf('.');
    const baseName = dotIndex >= 0 ? fileName.slice(0, dotIndex) : fileName;
    const extension = dotIndex >= 0 ? fileName.slice(dotIndex) : '';

    let counter = 1;
    let newFileName;

    while (true) {
        newFileName = `${baseName}(${counter})${extension}`;

        const fileExists = await File.findOne({
            owner: ownerId,
            folder: folderId || null,
            name: newFileName,
            isDeleted: false,
            ...(excludeId && { _id: { $ne: excludeId } })
        });

        if (!fileExists) break;

        counter++;
    }

    return newFileName;
};


export const folderNameExists = async (ownerId, parentFolderId, folderName, excludeId = null) => {

    const existingFolder = await Folder.findOne({
        owner: ownerId,
        parentFolder: parentFolderId || null,
        name: folderName,
        isDeleted: false,
        ...(excludeId && { _id: { $ne: excludeId } })
    });

    return !!existingFolder;
};


export const findExistingFolder = async (ownerId, parentFolderId, folderName) => {

    return await Folder.findOne({
        owner: ownerId,
        parentFolder: parentFolderId || null,
        name: folderName,
        isDeleted: false
    });
};