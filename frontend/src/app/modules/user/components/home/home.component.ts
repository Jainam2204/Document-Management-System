import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
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

  showDialog = false;
  newFolderName = '';

  private uploadSub!: Subscription;

  constructor(
    private fileService: FileService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.uploadSub = this.fileService.fileUploaded$.subscribe(() => {
      this.loadData();
    });
  }

  ngOnDestroy(): void {
    this.uploadSub?.unsubscribe();
  }

  loadData(): void {
    this.loading = true;
    this.loadFolders();
    this.loadFiles();
  }

  loadFolders(): void {
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

  loadFiles(): void {
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

  openDialog(): void {
    this.showDialog = true;
  }

  closeDialog(): void {
    this.showDialog = false;
    this.newFolderName = '';
  }

  createFolder(): void {
    if (!this.newFolderName.trim()) return;
    this.folders.unshift({ name: this.newFolderName } as FolderRecord);
    this.closeDialog();
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }
}
