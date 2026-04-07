import { HttpClient } from '@angular/common/http';
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
    size?: number;
    isDeleted: boolean;
    deletedAt?: string;
    createdAt: string;
    updatedAt: string;
}

interface UploadFileResponse {
    success: boolean;
    message: string;
    file: FileRecord;
}

interface DownloadUrlResponse {
    success: boolean;
    downloadUrl: string;
    message?: string;
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

interface ShareWithUserResponse {
    success: boolean;
    message: string;
}

interface ShareWithUsersResponse {
    success: boolean;
    message: string;
    sharedCount: number; 
    failedEmails?: string[];
}

interface SharedItem {
    _id: string;
    name: string;
    resourceType: 'file' | 'folder';
    size?: number;
    type?: string;
    s3Key?: string;
    sharedByEmail: string;
    shareId: string;
    sharedAt: string;
    expiresAt: string | null;
}

interface SharedWithMeResponse {
    success: boolean;
    items: SharedItem[];
}

@Injectable({
    providedIn: 'root'
})
export class FileService {

    private url = environment.API_URL + '/files';

    fileUploaded$ = new Subject<void>();

    constructor(
        private http: HttpClient,
    ) { }


    uploadFile(file: File, folderId: string | null, relativePath?: string): Observable<UploadFileResponse> {
        const formData = new FormData();
        formData.append('file', file);
        if (folderId) {
            formData.append('folderId', folderId);
        }
        if (relativePath) {
            formData.append('relativePath', relativePath);
        }
        return this.http.post<UploadFileResponse>(this.url + '/upload', formData);
    }


    downloadFile(fileId: string): Observable<DownloadUrlResponse> {
        console.log('url: ', this.url + '/download/' + fileId);
        return this.http.get<DownloadUrlResponse>(this.url + '/download/' + fileId);
    }

    // getFileViewUrl(fileId: string): Observable<DownloadUrlResponse> {
    //     return this.http.get<DownloadUrlResponse>(this.url + '/view/' + fileId);
    // }

    createFolderTree(rootName: string, subPaths: string[], parentFolderId?: string | null): Observable<CreateFolderTreeResponse> {
        const body: any = { rootName, subPaths };
        if (parentFolderId) {
            body.parentFolderId = parentFolderId;
        }
        return this.http.post<CreateFolderTreeResponse>(
            this.url + '/create-folder-tree',
            body
        );
    }


    getUserFolders(parentFolder?: string): Observable<GetFoldersResponse> {
        const params: any = {};
        if (parentFolder) params.parentFolder = parentFolder;

        return this.http.get<GetFoldersResponse>(this.url + '/folders', {
            params,
        });
    }


    getUserFiles(folderId?: string): Observable<GetFilesResponse> {
        const params: any = {};
        if (folderId) params.folderId = folderId;

        return this.http.get<GetFilesResponse>(this.url, {
            params,
        });
    }


    getFolderContents(folderId: string): Observable<GetFolderContentsResponse> {
        return this.http.get<GetFolderContentsResponse>(this.url + '/folders/' + folderId);
    }


    renameFile(fileId: string, newName: string): Observable<GenericResponse> {
        return this.http.post<GenericResponse>(this.url + '/rename/' + fileId, { newName });
    }


    renameFolder(folderId: string, newName: string): Observable<GenericResponse> {
        return this.http.post<GenericResponse>(this.url + '/folders/rename/' + folderId, { newName });
    }


    deleteFile(fileId: string): Observable<GenericResponse> {
        return this.http.post<GenericResponse>(this.url + '/delete/' + fileId, {});
    }

    deleteFolder(folderId: string): Observable<GenericResponse> {
        return this.http.post<GenericResponse>(this.url + '/folders/delete/' + folderId, {});
    }


    getTrashItems(): Observable<TrashResponse> {
        return this.http.get<TrashResponse>(this.url + '/trash');
    }


    restoreFile(fileId: string): Observable<GenericResponse> {
        return this.http.post<GenericResponse>(this.url + '/restore/file/' + fileId, {});
    }


    restoreFolder(folderId: string): Observable<GenericResponse> {
        return this.http.post<GenericResponse>(this.url + '/restore/folder/' + folderId, {});
    }


    permanentlyDeleteFile(fileId: string): Observable<GenericResponse> {
        return this.http.post<GenericResponse>(this.url + '/permanent/file/' + fileId, {});
    }

    permanentlyDeleteFolder(folderId: string): Observable<GenericResponse> {
        return this.http.post<GenericResponse>(this.url + '/permanent/folder/' + folderId, {});
    }

    createShareLink(resourceType: 'file' | 'folder', resourceId: string, expiry?: string): Observable<ShareLinkResponse> {
        return this.http.post<ShareLinkResponse>(this.url + `/share/${resourceType}/${resourceId}`, {
            expiry: expiry || null,
        });
    }

    createFolder(name: string, parentId?: string | null): Observable<CreateFolderResponse> {
        return this.http.post<CreateFolderResponse>(this.url + '/folders', {
            name,
            parentId: parentId || null,
        });
    }

    shareWithUser(type: 'file' | 'folder', resourceId: string, email: string, expiry?: string): Observable<ShareWithUserResponse> {
        return this.http.post<ShareWithUserResponse>(this.url + `/share-with-user/${type}/${resourceId}`, {
            email,
            expiry: expiry || null,
        });
    }

    shareWithUsers(type: 'file' | 'folder', resourceId: string, emails: string[], expiry?: string, shareWithEveryone?: boolean): Observable<ShareWithUsersResponse> {
        return this.http.post<ShareWithUsersResponse>(this.url + `/share-with-users/${type}/${resourceId}`, {
            emails,
            expiry: expiry || null,
            shareWithEveryone: !!shareWithEveryone,
        });
    }

    getSharedWithMe(): Observable<SharedWithMeResponse> {
        return this.http.get<SharedWithMeResponse>(this.url + '/shared-with-me');
    }

    getSharedFolderContents(folderId: string): Observable<GetFolderContentsResponse> {
        return this.http.get<GetFolderContentsResponse>(this.url + `/shared-with-me/${folderId}`);
    }
}
