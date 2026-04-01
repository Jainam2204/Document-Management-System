import { Component, ElementRef, HostListener, Input, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse, HttpEventType } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { FileService } from '../../../services/file/file.service';
import { ToastService } from '../../../services/toast/toast.service';
import { AuthService } from '../../../services/auth/auth.service';
import { RouteHelperService } from '../../../services/route-helper/route-helper.service';
import { FileActionDropdownComponent } from '../../../modules/user/components/file-action-dropdown/file-action-dropdown.component';
import { BackendResponse } from '../../models/BackendResponse';
import { Subscription, concatMap, from, map, tap, catchError, EMPTY, switchMap, filter, finalize } from 'rxjs';
import { SizePipe } from '../../pipes/size/size.pipe';
import { UserService } from '../../../services/user/user.service';
import { StorageService } from '../../../services/storage/storage.service';

@Component({
    selector: 'app-sidebar',
    imports: [CommonModule, FileActionDropdownComponent, SizePipe],
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnDestroy {
    @Input() collapsed = false;

    @ViewChild('fileInput') fileInput!: ElementRef;
    @ViewChild('folderInput') folderInput!: ElementRef;

    activeItem = 'files';
    storageUsed = 0;
    storageLimit = 0;
    private storageSubscription?: Subscription;
    isMobile = false;
    showNewMenu = false;
    uploading = false;
    parentFolderId: string | null = ''

    constructor(
        private fileService: FileService,
        private storageService: StorageService,
        private toast: ToastService,
        private router: Router,
        private authService: AuthService,
        private routeHelper: RouteHelperService
    ) {
        this.checkMobile();
    }

    ngOnInit() {
        this.storageService.storage$.subscribe(data => {
            this.storageUsed = data.storageUsed;
            this.storageLimit = data.storageLimit;
        });

        this.storageService.refreshStorage();
    }
    ngAfterViewInit() {
        this.folderInput.nativeElement.setAttribute('webkitdirectory', '');
    }

    toggleNewMenu() {
        this.showNewMenu = !this.showNewMenu;
    }

    getFolderId() {
        return this.routeHelper.getParentFolderIdFromUrl();
    }

    createFolder() {
        this.showNewMenu = false;
        const folderName = prompt('Enter folder name');
        if (!folderName || !folderName.trim()) return;

        const folderId = this.getFolderId();

        this.fileService.createFolder(folderName.trim(), folderId!).subscribe({
            next: (res) => {
                if (res.success) {
                    this.toast.success('Folder created successfully');
                    this.storageService.refreshStorage();
                } else {
                    this.toast.error(res.message);
                }
            },
            error: (err) => {
                console.error('Error creating folder:', err);
                this.toast.error(err?.error?.message);
            }
        });
    }

    triggerFileUpload() {
        this.showNewMenu = false;
        this.fileInput.nativeElement.click();
    }

    triggerFolderUpload() {
        this.showNewMenu = false;
        this.folderInput.nativeElement.click();
    }

    /* 
    Select folder → validate files → extract root folder name → build subfolder paths → 
    create folder structure in backend → map folder paths to IDs → loop through files sequentially
    → determine each file’s parent folder → request S3 upload URL → upload file to S3 → save file metadata in database → track upload progress → handle errors if any → on completion show success and refresh UI

    */

    onFileSelected(event: any) {
        const file: File = event.target.files[0];
        if (!file) return;

        const folderId = this.getFolderId();

        console.log('folderId : ', folderId);

        event.target.value = '';

        this.uploading = true;
        this.toast.warning('Uploading ' + file.name + '...');

        this.fileService.getUploadUrl(file.name, file.type, file.size).pipe(

            switchMap((urlRes: any) => {
                if (!urlRes || !urlRes.success) {
                    throw new Error(urlRes?.message || 'Failed to get upload URL');
                }

                return this.fileService.uploadToS3(urlRes.uploadUrl, file).pipe(
                    filter(event => event.type === HttpEventType.Response),
                    map(() => urlRes)
                );
            }),

            switchMap((urlRes: any) => {

                return this.fileService.saveFileMetadata(
                    file.name,
                    urlRes.s3Key,
                    file.size,
                    file.type,
                    folderId
                );
            }),

            tap((saveRes: any) => {
                if (!saveRes || !saveRes.success) {
                    throw new Error(saveRes?.message || 'Failed to save file');
                }

                this.toast.success(file.name + ' uploaded successfully!');
                this.storageService.refreshStorage();
            }),

            catchError((err) => {
                console.error('Upload error:', err);
                this.toast.error('Upload failed: ' + (err.message || 'Unknown error'));
                return EMPTY;
            }),

            finalize(() => {
                this.uploading = false;
            })

        ).subscribe();
    }

    onFolderSelected(event: any): void {
        const fileList: FileList = event.target.files;

        if (!fileList || fileList.length === 0) {
            this.toast.error("No folder selected or browser not supported");
            return;
        }

        const files: File[] = Array.from(fileList);

        event.target.value = '';

        const firstFile = files[0];
        const firstPath = (firstFile as any)?.webkitRelativePath;

        if (!firstPath) {
            this.toast.error("Folder upload not supported in this browser");
            return;
        }

        const rootName = firstPath.split('/')[0];

        console.log("Root folder:", rootName);

        const folderPaths = new Set<string>();

        for (const file of files) {
            const relativePath = (file as any)?.webkitRelativePath;

            if (!relativePath) continue;

            const parts = relativePath.split('/');

            for (let i = 2; i < parts.length; i++) {
                const subPath = parts.slice(1, i).join('/');
                folderPaths.add(subPath);
            }
        }

        this.uploading = true;
        this.toast.warning(`Uploading folder "${rootName}" (${files.length} files)...`);

        this.fileService.createFolderTree(rootName, Array.from(folderPaths)).pipe(
            tap(treeRes => {
                if (!treeRes?.success) {
                    throw new Error("Failed to create folder structure");
                }
            }),
            concatMap(treeRes => {
                const pathToIdMap = treeRes.pathToIdMap;
                let uploaded = 0;

                return from(files).pipe(
                    concatMap(file => {
                        const relativePath = (file as any).webkitRelativePath;
                        const parts = relativePath.split('/');
                        const parentSubPath = parts.slice(1, -1).join('/');

                        const folderId = parentSubPath === ''
                            ? pathToIdMap['']
                            : pathToIdMap[parentSubPath];

                        return this.fileService.getUploadUrl(file.name, file.type || 'application/octet-stream', file.size).pipe(
                            concatMap(urlRes => {
                                if (!urlRes?.success) {
                                    return EMPTY;
                                }

                                return this.fileService.uploadToS3(urlRes.uploadUrl, file).pipe(
                                    filter(event => event.type === HttpEventType.Response),
                                    concatMap(() => this.fileService.saveFileMetadata(file.name, urlRes.s3Key, file.size, file.type, folderId)),
                                    tap(() => {
                                        uploaded++;
                                        this.toast.success(`Uploaded ${uploaded}/${files.length}`);
                                    })
                                );
                            })
                        );
                    })
                );
            }),
            catchError(err => {
                console.error(err);
                this.toast.error("Folder upload failed");
                return EMPTY;
            })
        ).subscribe({
            complete: () => {
                this.toast.success(`Folder uploaded successfully!`);
                this.storageService.refreshStorage();
                this.uploading = false;
            },
            error: () => {
                this.uploading = false;
            }
        });
    }

    setActive(item: string) {
        this.activeItem = item;
        if (item === 'files') {
            this.router.navigate(['/home']);
        }
        if (item === 'trash') {
            this.router.navigate(['/trash']);
        }
    }

    onAction(event: { type: string, data?: any }) {
        const parentId = this.routeHelper.getParentFolderIdFromUrl();
        switch (event.type) {
            case 'createFolder':
                this.createFolderFromAction(event.data.name, parentId);
                break;
            case 'uploadFile':
                this.uploadFile(event.data, parentId);
                break;
            case 'uploadFolder':
                this.uploadFolder(event.data, parentId);
                break;
        }
    }

    private createFolderFromAction(name: string, parentId: string | null) {
        this.fileService.createFolder(name, parentId || undefined).subscribe({
            next: (res) => {
                if (res?.success) {
                    this.toast.success('Folder created successfully');
                    this.storageService.refreshStorage();
                } else {
                    this.toast.error(res?.message || 'Failed to create folder');
                }
            },
            error: (err) => {
                this.toast.error(err?.error?.message || 'Failed to create folder');
            }
        });
    }

    private uploadFile(file: File, parentId: string | null) {
        this.toast.warning('Uploading ' + file.name + '...');
        this.fileService.getUploadUrl(file.name, file.type, file.size).subscribe({
            next: (res) => {
                if (!res?.success) {
                    this.toast.error(res?.message || 'Failed to get upload URL');
                    return;
                }
                this.fileService.uploadToS3(res.uploadUrl, file).subscribe({
                    next: (event) => {
                        if (event.type === HttpEventType.Response) {
                            this.fileService.saveFileMetadata(file.name, res.s3Key, file.size, file.type, parentId!).subscribe({
                                next: (saveRes) => {
                                    if (saveRes?.success) {
                                        this.toast.success(file.name + ' uploaded successfully!');
                                        this.storageService.refreshStorage();
                                    } else {
                                        this.toast.error(saveRes?.message || 'Failed to save file');
                                    }
                                },
                                error: (err) => {
                                    this.toast.error('Failed to save file');
                                }
                            });
                        }
                    },
                    error: (err) => {
                        this.toast.error('Failed to upload file to S3');
                    }
                });
            },
            error: (err) => {
                this.toast.error('Failed to get upload URL');
            }
        });
    }

    private uploadFolder(files: File[], parentId: string | null): void {
        if (!files || files.length === 0) {
            this.toast.error('No folder selected.');
            return;
        }

        const parsed = this.parseFolderFiles(files);
        if (!parsed) {
            this.toast.error('Unable to read folder structure from selected files.');
            return;
        }

        this.uploading = true;
        this.toast.warning(`Uploading folder "${parsed.rootName}"...`);

        this.fileService.createFolderTree(parsed.rootName, parsed.subPaths, parentId).subscribe({
            next: (res) => {
                if (!res?.success) {
                    this.toast.error(res?.message || 'Failed to create folder tree.');
                    this.uploading = false;
                    return;
                }

                this.uploadFilesSequentially(parsed.fileItems, res.pathToIdMap);
            },
            error: (err) => {
                this.toast.error(err?.error?.message || 'Folder upload failed.');
                this.uploading = false;
            }
        });
    }

    private parseFolderFiles(files: File[]): {
        rootName: string;
        fileItems: Array<{ file: File; folderPath: string; relativePath: string }>;
        subPaths: string[];
    } | null {
        const fileItems: Array<{ file: File; folderPath: string; relativePath: string }> = [];
        const folderSet = new Set<string>();

        const firstPath = (files[0] as any).webkitRelativePath || '';
        const rootName = firstPath.replace(/\\/g, '/').split('/')[0];
        if (!rootName) {
            return null;
        }

        for (const file of files) {
            const relativePath = ((file as any).webkitRelativePath || '').replace(/\\/g, '/');
            const parts = relativePath.split('/');
            if (parts.length < 2) {
                continue;
            }

            const folderPath = parts.length > 2 ? parts.slice(1, -1).join('/') : '';
            const relativeDirPath = parts.slice(0, -1).join('/');
            fileItems.push({ file, folderPath, relativePath: relativeDirPath });

            for (let i = 2; i < parts.length; i++) {
                const pathPart = parts.slice(1, i).join('/');
                if (pathPart) {
                    folderSet.add(pathPart);
                }
            }
        }

        return {
            rootName,
            fileItems,
            subPaths: Array.from(folderSet),
        };
    }

    private uploadFilesSequentially(
        fileItems: Array<{ file: File; folderPath: string; relativePath: string }>,
        pathToIdMap: { [path: string]: string }
    ): void {
        let index = 0;
        let successCount = 0;
        let failureCount = 0;

        const next = () => {
            if (index >= fileItems.length) {
                this.uploading = false;
                this.storageService.refreshStorage();
                if (failureCount === 0) {
                    this.toast.success(`Uploaded ${successCount} files successfully.`);
                } else {
                    this.toast.warning(`Uploaded ${successCount} files, ${failureCount} failed.`);
                }
                return;
            }

            const item = fileItems[index++];
            const folderId = pathToIdMap[item.folderPath] || pathToIdMap[''];
            if (!folderId) {
                failureCount += 1;
                next();
                return;
            }

            this.toast.warning(`Uploading ${item.file.name} (${index}/${fileItems.length})...`);
            this.uploadFileToFolder(item.file, folderId, item.relativePath, (ok) => {
                if (ok) {
                    successCount += 1;
                } else {
                    failureCount += 1;
                }
                next();
            });
        };

        next();
    }

    private uploadFileToFolder(
        file: File,
        folderId: string,
        relativePath: string,
        callback: (success: boolean) => void
    ): void {
        this.fileService.getUploadUrl(file.name, file.type, file.size, relativePath).subscribe({
            next: (urlRes) => {
                if (!urlRes?.success) {
                    callback(false);
                    return;
                }

                this.fileService.uploadToS3(urlRes.uploadUrl, file).subscribe({
                    next: (event) => {
                        if (event.type === HttpEventType.Response) {
                            this.fileService.saveFileMetadata(file.name, urlRes.s3Key, file.size, file.type, folderId).subscribe({
                                next: (saveRes) => {
                                    callback(saveRes?.success ?? false);
                                },
                                error: () => {
                                    callback(false);
                                }
                            });
                        }
                    },
                    error: () => {
                        callback(false);
                    }
                });
            },
            error: () => {
                callback(false);
            }
        });
    }

    ngOnDestroy() {
        this.storageSubscription?.unsubscribe();
    }

    onLogout() {
        this.authService.logout().subscribe({
            next: (res: BackendResponse) => {
                this.toast.success(res.message);;
                this.router.navigate(['/auth/login']);
            },

            error: (err: HttpErrorResponse) => {
                console.error('Error : ', err);
                this.toast.error(err?.error?.message);
            }
        });
    }

    onOverlayClick() {
        this.collapsed = true;
    }

    @HostListener('window:resize')
    onResize() {
        this.checkMobile();
    }

    private checkMobile() {
        this.isMobile = window.innerWidth <= 768;
    }
}


