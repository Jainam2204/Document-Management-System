import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { FileService, FileRecord, FolderRecord } from '../../../../services/file/file.service';
import { ToastService } from '../../../../services/toast/toast.service';

@Component({
  selector: 'app-home',
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {
  folders: FolderRecord[] = [];
  files: FileRecord[] = [];
  loading = false;
  currentFolderId: string | null = null;
  currentFolder: FolderRecord | null = null;

  showDialog = false;
  newFolderName = '';

  private uploadSub!: Subscription;
  private routeSub!: Subscription;

  constructor(
    private fileService: FileService,
    private toast: ToastService,
    private route: ActivatedRoute,
    private router: Router
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

  openDialog() {
    this.showDialog = true;
  }

  closeDialog() {
    this.showDialog = false;
    this.newFolderName = '';
  }

  createFolder() {
    if (!this.newFolderName.trim()) return;
    this.fileService.createFolder(this.newFolderName.trim(), this.currentFolderId!).subscribe({
      next: (res) => {
        if (res.success) {
          this.folders.unshift(res.folder);
          this.toast.success('Folder created successfully');
          this.closeDialog();
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

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }
}
