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
        this.handleRename(event.data);
        break;
      case 'share':
        this.toast.warning('Sharing is not available yet.');
        break;
      case 'delete':
        this.handleDelete(event.data);
        break;
    }
  }

  private handleRename(record: FolderRecord | FileRecord): void {
    const name = prompt('New name', record.name);
    if (!name?.trim() || name.trim() === record.name) {
      return;
    }
    this.toast.warning('Rename is not available yet — no API wired for this action.');
  }

  private handleDelete(record: FolderRecord | FileRecord): void {
    if (!confirm(`Delete "${record.name}"? This cannot be undone.`)) {
      return;
    }
    this.toast.warning('Delete is not available yet — no API wired for this action.');
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
