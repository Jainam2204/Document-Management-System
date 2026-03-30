import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment.development';

export interface FileRecord {
    _id: string;
    id: number;
    name: string;
    s3Key: string;
    size: number;
    type: string;
    folder: string | null;
    owner: string;
    isDeleted: boolean;
    deletedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface FolderRecord {
    _id: string;
    id: number;
    name: string;
    parentFolder: string | null;
    owner: string;
    isDeleted: boolean;
    deletedAt?: string;
    createdAt: string;
    updatedAt: string;
}

interface UploadUrlResponse {
    success: boolean;
    uploadUrl: string;
    s3Key: string;
    message?: string;
}

interface SaveFileResponse {
    success: boolean;
    message: string;
    file: FileRecord;
}

interface GetFilesResponse {
    success: boolean;
    files: FileRecord[];
}

interface GetFoldersResponse {
    success: boolean;
    folders: FolderRecord[];
}

interface CreateFolderTreeResponse {
    success: boolean;
    message: string;
    pathToIdMap: { [path: string]: string };
}

interface GetFolderContentsResponse {
    success: boolean;
    folder: FolderRecord;
    files: FileRecord[];
    subfolders: FolderRecord[];
}

interface CreateFolderResponse {
    success: boolean;
    message: string;
    folder: FolderRecord;
}

interface GenericResponse {
    success: boolean;
    message: string;
}

interface TrashResponse {
    success: boolean;
    files: FileRecord[];
    folders: FolderRecord[];
}

interface ShareLinkResponse {
    success: boolean;
    url: string;
    expiresAt: string;
    message?: string;
}

/**
 * Service responsible for file and folder operations against the backend API.
 */
@Injectable({
    providedIn: 'root'
})
export class FileService {

    private url = environment.API_URL + '/files';

    fileUploaded$ = new Subject<void>();

    constructor(
        private http: HttpClient,
    ) { }

    /**
     * Request a signed upload URL from the backend.
     * @param fileName - Original file name.
     * @param fileType - MIME type of the file.
     * @param fileSize - Size of the file in bytes.
     * @returns Observable emitting upload URL payload.
     */
    getUploadUrl(fileName: string, fileType: string, fileSize: number): Observable<UploadUrlResponse> {
        return this.http.post<UploadUrlResponse>(
            this.url + '/upload-url',
            { fileName, fileType, fileSize }
        );
    }

    /**
     * Upload a file directly to S3 using the provided signed URL.
     * @param uploadUrl - Signed S3 upload URL.
     * @param file - File object to upload.
     * @returns Observable emitting HTTP upload progress events.
     */
    uploadToS3(uploadUrl: string, file: File): Observable<any> {
        return this.http.put(uploadUrl, file, {
            headers: new HttpHeaders({ 'Content-Type': file.type }),
            reportProgress: true,
            observe: 'events',
        });
    }

    /**
     * Save metadata for an uploaded file after S3 upload succeeds.
     * @param name - File name to store.
     * @param s3Key - S3 key returned by the backend.
     * @param size - File size in bytes.
     * @param type - MIME type of the file.
     * @param folderId - Parent folder id or null for root.
     * @returns Observable emitting the saved file metadata.
     */
    saveFileMetadata(name: string, s3Key: string, size: number, type: string, folderId: string | null): Observable<SaveFileResponse> {
        return this.http.post<SaveFileResponse>(
            this.url + '/save',
            { name, s3Key, size, type, folderId: folderId }
        );
    }


    createFolderTree(rootName: string, subPaths: string[]): Observable<CreateFolderTreeResponse> {
        return this.http.post<CreateFolderTreeResponse>(
            this.url + '/create-folder-tree',
            { rootName, subPaths }
        );
    }

    /**
     * Retrieve folders for the current user and optional parent.
     * @param parentFolder - Optional parent folder id.
     * @returns Observable emitting folder collection.
     */
    getUserFolders(parentFolder?: string): Observable<GetFoldersResponse> {
        const params: any = {};
        if (parentFolder) params.parentFolder = parentFolder;

        return this.http.get<GetFoldersResponse>(this.url + '/folders', {
            params,
        });
    }


    /**
     * Retrieve files for the current user and optional folder.
     * @param folderId - Optional parent folder id.
     * @returns Observable emitting files collection.
     */
    getUserFiles(folderId?: string): Observable<GetFilesResponse> {
        const params: any = {};
        if (folderId) params.folderId = folderId;

        return this.http.get<GetFilesResponse>(this.url, {
            params,
        });
    }

    /**
     * Retrieve contents of a single folder, including files and subfolders.
     * @param folderId - Folder id to retrieve contents for.
     * @returns Observable emitting folder contents.
     */
    getFolderContents(folderId: string): Observable<GetFolderContentsResponse> {
        return this.http.get<GetFolderContentsResponse>(this.url + '/folders/' + folderId);
    }

    /**
     * Rename a file by id.
     * @param fileId - File id to rename.
     * @param newName - New name to apply.
     * @returns Observable emitting rename result.
     */
    renameFile(fileId: string, newName: string): Observable<GenericResponse> {
        return this.http.post<GenericResponse>(this.url + '/rename/' + fileId, { newName });
    }

    /**
     * Rename a folder by id.
     * @param folderId - Folder id to rename.
     * @param newName - New name to apply.
     * @returns Observable emitting rename result.
     */
    renameFolder(folderId: string, newName: string): Observable<GenericResponse> {
        return this.http.post<GenericResponse>(this.url + '/folders/rename/' + folderId, { newName });
    }

    /**
     * Soft delete a file by id.
     * @param fileId - File id to move to trash.
     * @returns Observable emitting delete result.
     */
    deleteFile(fileId: string): Observable<GenericResponse> {
        return this.http.post<GenericResponse>(this.url + '/delete/' + fileId, {});
    }

    /**
     * Soft delete a folder by id.
     * @param folderId - Folder id to move to trash.
     * @returns Observable emitting delete result.
     */
    deleteFolder(folderId: string): Observable<GenericResponse> {
        return this.http.post<GenericResponse>(this.url + '/folders/delete/' + folderId, {});
    }

    /**
     * Retrieve trashed files and folders for the signed-in user.
     * @returns Observable emitting trash contents.
     */
    getTrashItems(): Observable<TrashResponse> {
        return this.http.get<TrashResponse>(this.url + '/trash');
    }

    /**
     * Restore a trashed file by id.
     * @param fileId - File id to restore.
     * @returns Observable emitting restore result.
     */
    restoreFile(fileId: string): Observable<GenericResponse> {
        return this.http.post<GenericResponse>(this.url + '/restore/file/' + fileId, {});
    }

    /**
     * Restore a trashed folder by id.
     * @param folderId - Folder id to restore.
     * @returns Observable emitting restore result.
     */
    restoreFolder(folderId: string): Observable<GenericResponse> {
        return this.http.post<GenericResponse>(this.url + '/restore/folder/' + folderId, {});
    }

    /**
     * Permanently delete a trashed file by id.
     * @param fileId - File id to permanently remove.
     * @returns Observable emitting deletion result.
     */
    permanentlyDeleteFile(fileId: string): Observable<GenericResponse> {
        return this.http.post<GenericResponse>(this.url + '/permanent/file/' + fileId, {});
    }

    /**
     * Permanently delete a trashed folder by id.
     * @param folderId - Folder id to permanently remove.
     * @returns Observable emitting deletion result.
     */
    permanentlyDeleteFolder(folderId: string): Observable<GenericResponse> {
        return this.http.post<GenericResponse>(this.url + '/permanent/folder/' + folderId, {});
    }

    /**
     * Create a share link for a file or folder.
     * @param resourceType - Resource type to share ('file' or 'folder').
     * @param resourceId - Resource id to share.
     * @param expiry - Optional expiry date/time string for the share link.
     * @returns Observable emitting share link details.
     */
    createShareLink(resourceType: 'file' | 'folder', resourceId: string, expiry?: string): Observable<ShareLinkResponse> {
        return this.http.post<ShareLinkResponse>(this.url + `/share/${resourceType}/${resourceId}`, {
            expiry: expiry || null,
        });
    }

    /**
     * Create a new folder in the current user context.
     * @param name - Folder name to create.
     * @param parentId - Optional parent folder id.
     * @returns Observable emitting the created folder.
     */
    createFolder(name: string, parentId?: string | null): Observable<CreateFolderResponse> {
        return this.http.post<CreateFolderResponse>(this.url + '/folders', {
            name,
            parentId: parentId || null,
        });
    }
}
