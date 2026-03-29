import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpEventType } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { FileService, FileRecord, FolderRecord } from '../../../../services/file/file.service';
import { ToastService } from '../../../../services/toast/toast.service';
import { RouteHelperService } from '../../../../services/route-helper/route-helper.service';
import { FileActionDropdownComponent } from '../file-action-dropdown/file-action-dropdown.component';

@Component({
  selector: 'app-home',
  imports: [CommonModule, FormsModule, FileActionDropdownComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {
  folders: FolderRecord[] = [];
  files: FileRecord[] = [];
  loading = false;
  currentFolderId: string | null = null;
  currentFolder: FolderRecord | null = null;
  openItemMenuKey: string | null = null;

  actionDialogMode: 'rename' | 'delete' | 'share' | null = null;
  actionDialogRecord: FolderRecord | FileRecord | null = null;
  actionDialogInput = '';
  actionDialogError = '';
  actionDialogLoading = false;
  shareExpiryDate = '';
  shareExpiryTime = '';
  shareUrl = '';

  private uploadSub!: Subscription;
  private routeSub!: Subscription;

  constructor(
    private fileService: FileService,
    private toast: ToastService,
    private route: ActivatedRoute,
    private router: Router,
    private routeHelper: RouteHelperService
  ) {}

  ngOnInit() {
    this.routeSub = this.route.params.subscribe(params => {
      this.currentFolderId = params['id'] || null;
      this.loadData();
    });
    this.uploadSub = this.fileService.fileUploaded$.subscribe(() => {
      this.loadData();
    });
  }

  ngOnDestroy() {
    this.uploadSub?.unsubscribe();
    this.routeSub?.unsubscribe();
  }

  loadData() {
    this.loading = true;
    if (this.currentFolderId) {
      this.loadFolderContents();
    } else {
      this.loadRootContents();
    }
  }

  loadRootContents() {
    this.currentFolder = null;
    this.loadFolders();
    this.loadFiles();
  }

  loadFolderContents() {
    if (!this.currentFolderId) return;
    this.fileService.getFolderContents(this.currentFolderId).subscribe({
      next: (res) => {
        if (res.success) {
          this.currentFolder = res.folder;
          this.files = res.files;
          this.folders = res.subfolders;
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading folder contents:', err);
        this.toast.error('Failed to load folder contents');
        this.loading = false;
      }
    });
  }

  loadFolders() {
    this.fileService.getUserFolders().subscribe({
      next: (res) => {
        if (res.success) {
          this.folders = res.folders;
        }
      },
      error: (err) => {
        console.error('Error loading folders:', err);
      }
    });
  }

  loadFiles() {
    this.fileService.getUserFiles().subscribe({
      next: (res) => {
        if (res.success) {
          this.files = res.files;
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading files:', err);
        this.toast.error('Failed to load files');
        this.loading = false;
      }
    });
  }

  onFolderClick(folder: FolderRecord) {
    this.router.navigate(['/home', folder._id]);
  }

  goBack() {
    if (this.currentFolder?.parentFolder) {
      this.router.navigate(['/home', this.currentFolder.parentFolder]);
    } else {
      this.router.navigate(['/home']);
    }
  }
  onItemMenuKeyChange(key: string | null): void {
    this.openItemMenuKey = key;
  }

  onAction(event: { type: string; data?: any }): void {
    const parentId = this.routeHelper.getParentFolderIdFromUrl();
    switch (event.type) {
      case 'createFolder':
        this.createFolder(event.data.name, parentId);
        break;
      case 'uploadFile':
        this.uploadFile(event.data, parentId);
        break;
      case 'uploadFolder':
        this.uploadFolder(event.data, parentId);
        break;
      case 'rename':
        this.openActionDialog('rename', event.data);
        break;
      case 'share':
        this.openActionDialog('share', event.data);
        break;
      case 'delete':
        this.openActionDialog('delete', event.data);
        break;
    }
  }

  openActionDialog(mode: 'rename' | 'delete' | 'share', record: FolderRecord | FileRecord): void {
    this.actionDialogMode = mode;
    this.actionDialogRecord = record;
    this.actionDialogError = '';
    this.actionDialogLoading = false;
    this.shareUrl = '';
    this.shareExpiryDate = '';
    this.shareExpiryTime = '';
    this.actionDialogInput = mode === 'rename' ? record.name : '';
  }

  closeActionDialog(): void {
    this.actionDialogMode = null;
    this.actionDialogRecord = null;
    this.actionDialogInput = '';
    this.actionDialogError = '';
    this.actionDialogLoading = false;
    this.shareUrl = '';
  }

  submitRename(): void {
    if (!this.actionDialogRecord) {
      return;
    }

    const newName = this.actionDialogInput.trim();
    if (!newName) {
      this.actionDialogError = 'Name cannot be empty.';
      return;
    }
    if (newName.length > 100) {
      this.actionDialogError = 'Name must be 100 characters or less.';
      return;
    }

    this.actionDialogLoading = true;
    const isFile = this.isFileRecord(this.actionDialogRecord);
    const request$ = isFile
      ? this.fileService.renameFile(this.actionDialogRecord._id, newName)
      : this.fileService.renameFolder(this.actionDialogRecord._id, newName);

    request$.subscribe({
      next: (res) => {
        this.actionDialogLoading = false;
        if (res.success) {
          this.toast.success(`${isFile ? 'File' : 'Folder'} renamed successfully.`);
          this.updateRenamedRecord(this.actionDialogRecord!, newName);
          this.closeActionDialog();
        } else {
          this.actionDialogError = res.message || 'Rename failed.';
        }
      },
      error: (err) => {
        this.actionDialogLoading = false;
        this.actionDialogError = err?.error?.message || 'Rename failed.';
      }
    });
  }

  submitDelete(): void {
    if (!this.actionDialogRecord) {
      return;
    }

    this.actionDialogLoading = true;
    const isFile = this.isFileRecord(this.actionDialogRecord);
    const request$ = isFile
      ? this.fileService.deleteFile(this.actionDialogRecord._id)
      : this.fileService.deleteFolder(this.actionDialogRecord._id);

    request$.subscribe({
      next: (res) => {
        this.actionDialogLoading = false;
        if (res.success) {
          this.toast.success(`${isFile ? 'File' : 'Folder'} deleted successfully.`);
          this.removeDeletedRecord(this.actionDialogRecord!);
          this.closeActionDialog();
        } else {
          this.actionDialogError = res.message || 'Delete failed.';
        }
      },
      error: (err) => {
        this.actionDialogLoading = false;
        this.actionDialogError = err?.error?.message || 'Delete failed.';
      }
    });
  }

  submitShare(): void {
    if (!this.actionDialogRecord) {
      return;
    }

    this.actionDialogLoading = true;
    const resourceType = this.isFileRecord(this.actionDialogRecord) ? 'file' : 'folder';
    const expiry = this.shareExpiryDate && this.shareExpiryTime
      ? `${this.shareExpiryDate}T${this.shareExpiryTime}:00`
      : undefined;

    this.fileService.createShareLink(resourceType, this.actionDialogRecord._id, expiry).subscribe({
      next: (res) => {
        this.actionDialogLoading = false;
        if (res.success) {
          this.shareUrl = res.url;
          this.toast.success('Share link created.');
        } else {
          this.actionDialogError = res.message || 'Unable to create share link.';
        }
      },
      error: (err) => {
        this.actionDialogLoading = false;
        this.actionDialogError = err?.error?.message || 'Unable to create share link.';
      }
    });
  }

  copyShareUrl(): void {
    if (!this.shareUrl) {
      return;
    }
    navigator.clipboard?.writeText(this.shareUrl).then(() => {
      this.toast.success('Share link copied to clipboard.');
    }).catch(() => {
      this.toast.error('Could not copy share link.');
    });
  }

  private updateRenamedRecord(record: FolderRecord | FileRecord, newName: string): void {
    if (this.isFileRecord(record)) {
      this.files = this.files.map((file) => file._id === record._id ? { ...file, name: newName } : file);
    } else {
      this.folders = this.folders.map((folder) => folder._id === record._id ? { ...folder, name: newName } : folder);
      if (this.currentFolder && this.currentFolder._id === record._id) {
        this.currentFolder = { ...this.currentFolder, name: newName };
      }
    }
  }

  private removeDeletedRecord(record: FolderRecord | FileRecord): void {
    if (this.isFileRecord(record)) {
      this.files = this.files.filter((file) => file._id !== record._id);
    } else {
      this.folders = this.folders.filter((folder) => folder._id !== record._id);
      if (this.currentFolder && this.currentFolder._id === record._id) {
        this.router.navigate(['/home']);
      }
    }
  }

  isFileRecord(record: FolderRecord | FileRecord): record is FileRecord {
    return 's3Key' in record;
  }

  private createFolder(name: string, parentId: string | null): void {
    this.fileService.createFolder(name, parentId || undefined).subscribe({
      next: (res) => {
        if (res?.success) {
          this.toast.success('Folder created successfully');
          this.loadData();
        } else {
          this.toast.error(res?.message || 'Failed to create folder');
        }
      },
      error: (err) => {
        this.toast.error('Failed to create folder');
      }
    });
  }

  private uploadFile(file: File, parentId: string | null): void {
    this.toast.warning('Uploading ' + file.name + '...');
    this.fileService.getUploadUrl(file.name, file.type, file.size).subscribe({
      next: (urlRes) => {
        if (!urlRes?.success) {
          this.toast.error(urlRes?.message || 'Failed to get upload URL');
          return;
        }
        this.fileService.uploadToS3(urlRes.uploadUrl, file).subscribe({
          next: (event) => {
            if (event.type === HttpEventType.Response) {
              this.fileService.saveFileMetadata(file.name, urlRes.s3Key, file.size, file.type, parentId!).subscribe({
                next: (saveRes) => {
                  if (saveRes?.success) {
                    this.toast.success(file.name + ' uploaded successfully!');
                    this.loadData();
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
    for (const file of files) {
      this.uploadFile(file, parentId);
    }
  }
  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }
}
