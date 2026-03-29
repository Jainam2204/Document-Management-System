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

interface ShareLinkResponse {
    success: boolean;
    url: string;
    expiresAt: string;
    message?: string;
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

    getUploadUrl(fileName: string, fileType: string, fileSize: number): Observable<UploadUrlResponse> {
        return this.http.post<UploadUrlResponse>(
            this.url + '/upload-url',
            { fileName, fileType, fileSize }
        );
    }

    uploadToS3(uploadUrl: string, file: File): Observable<any> {
        return this.http.put(uploadUrl, file, {
            headers: new HttpHeaders({ 'Content-Type': file.type }),
            reportProgress: true,
            observe: 'events',
        });
    }

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
}
