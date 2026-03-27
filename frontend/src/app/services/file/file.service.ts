import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { GetCookieService } from '../cookie/get-cookie.service';

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

@Injectable({
  providedIn: 'root'
})
export class FileService {

  private url = environment.API_URL + '/files';

  fileUploaded$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private cookieService: GetCookieService
  ) {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.cookieService.getCookie('accessToken') || '';
    return new HttpHeaders({ 'x-access-token': token });
  }


  getUploadUrl(fileName: string, fileType: string, fileSize: number): Observable<UploadUrlResponse> {
    return this.http.post<UploadUrlResponse>(
      this.url + '/upload-url',
      { fileName, fileType, fileSize },
      { headers: this.getAuthHeaders() }
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
      { name, s3Key, size, type, folderId: folderId },
      { headers: this.getAuthHeaders() }
    );
  }


  createFolderTree(rootName: string, subPaths: string[]): Observable<CreateFolderTreeResponse> {
    return this.http.post<CreateFolderTreeResponse>(
      this.url + '/create-folder-tree',
      { rootName, subPaths },
      { headers: this.getAuthHeaders() }
    );
  }

  getUserFolders(parentFolder?: string): Observable<GetFoldersResponse> {
    const params: any = {};
    if (parentFolder) params.parentFolder = parentFolder;

    return this.http.get<GetFoldersResponse>(this.url + '/folders', {
      headers: this.getAuthHeaders(),
      params,
    });
  }


  getUserFiles(folderId?: string): Observable<GetFilesResponse> {
    const params: any = {};
    if (folderId) params.folderId = folderId;

    return this.http.get<GetFilesResponse>(this.url, {
      headers: this.getAuthHeaders(),
      params,
    });
  }

  getFolderContents(folderId: string): Observable<GetFolderContentsResponse> {
    return this.http.get<GetFolderContentsResponse>(this.url + '/folders/' + folderId, {
      headers: this.getAuthHeaders(),
    });
  }

  createFolder(name: string, parentId?: string): Observable<CreateFolderResponse> {
    return this.http.post<CreateFolderResponse>(this.url + '/folders', {
      name,
      parentId: parentId || null,
    }, {
      headers: this.getAuthHeaders(),
    });
  }
}
