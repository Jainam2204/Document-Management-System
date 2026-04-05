import { Component, HostListener, Input, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { FileService } from '../../../services/file/file.service';
import { ToastService } from '../../../services/toast/toast.service';
import { AuthService } from '../../../services/auth/auth.service';
import { RouteHelperService } from '../../../services/route-helper/route-helper.service';
import { FileActionDropdownComponent } from '../../../modules/user/components/file-action-dropdown/file-action-dropdown.component';
import { UploadHelperComponent } from '../upload-helper/upload-helper.component';
import { BackendResponse } from '../../models/BackendResponse';
import { Subscription, concatMap, from, tap, catchError, EMPTY, finalize, takeWhile } from 'rxjs';
import { SizePipe } from '../../pipes/size/size.pipe';
import { UserService } from '../../../services/user/user.service';
import { StorageService } from '../../../services/storage/storage.service';

@Component({
    selector: 'app-sidebar',
    imports: [CommonModule, FileActionDropdownComponent, SizePipe, UploadHelperComponent],
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnDestroy {
    @Input() collapsed = false;

    activeItem = 'files';
    storageUsed = 0;
    storageLimit = 0;
    private storageSubscription?: Subscription;
    isMobile = false;
    showNewMenu = false;
    parentFolderId: string | null = '';

    @ViewChild('uploadHelper') uploadHelper!: UploadHelperComponent;

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
                    this.fileService.fileUploaded$.next();
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

    /*
    Select folder → validate files → extract root folder name → build subfolder paths →
    create folder structure in backend → map folder paths to IDs → loop through files sequentially
    → determine each file’s parent folder → request S3 upload URL → upload file to S3 → save file metadata in database → track upload progress → handle errors if any → on completion show success and refresh UI
    */


    setActive(item: string) {
        this.activeItem = item;
        if (item === 'files') {
            this.router.navigate(['/home']);
        }
        if (item === 'trash') {
            this.router.navigate(['/trash']);
        }
        if (item === 'shared') {
            this.router.navigate(['/shared-with-me']);
        }
    }

    dragActive = false;
    dragCounter = 0;

    onAction(event: { type: string, data?: any }) {
        const parentId = this.routeHelper.getParentFolderIdFromUrl();
        switch (event.type) {
            case 'createFolder':
                this.createFolderFromAction(event.data.name, parentId);
                break;
            case 'uploadFile':
                this.uploadHelper.uploadFile(event.data, parentId);
                break;
            case 'uploadFolder':
                this.uploadHelper.uploadFolder(event.data, parentId);
                break;
        }
    }

    onDragEnter(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.dragCounter += 1;
        this.dragActive = true;
    }

    onDragOver(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
    }

    onDragLeave(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.dragCounter -= 1;
        if (this.dragCounter <= 0) {
            this.dragCounter = 0;
            this.dragActive = false;
        }
    }

    onDrop(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.dragCounter = 0;
        this.dragActive = false;
        const parentId = this.routeHelper.getParentFolderIdFromUrl();
        if (event.dataTransfer) {
            this.uploadHelper.uploadDataTransferItems(event.dataTransfer, parentId);
        }
    }

    private createFolderFromAction(name: string, parentId: string | null) {
        this.fileService.createFolder(name, parentId || undefined).subscribe({
            next: (res) => {
                if (res?.success) {
                    this.toast.success('Folder created successfully');
                    this.storageService.refreshStorage();
                    this.fileService.fileUploaded$.next();
                } else {
                    this.toast.error(res?.message || 'Failed to create folder');
                }
            },
            error: (err) => {
                this.toast.error(err?.error?.message || 'Failed to create folder');
            }
        });
    }

    onUploadSuccess(response: any) {
        this.storageService.refreshStorage();
    }

    onFolderUploadCompleted(result: { successCount: number; failureCount: number }) {
        this.storageService.refreshStorage();
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


