import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileService, FileRecord, FolderRecord } from '../../../../services/file/file.service';
import { ToastService } from '../../../../services/toast/toast.service';

/**
 * Trash management component for restoring or permanently deleting items.
 */
@Component({
  selector: 'app-trash',
  imports: [CommonModule],
  templateUrl: './trash.component.html',
  styleUrls: ['./trash.component.css']
})
export class TrashComponent implements OnInit {
  folders: FolderRecord[] = [];
  files: FileRecord[] = [];
  loading = false;

  actionDialogMode: 'permanent' | null = null;
  actionDialogRecord: FolderRecord | FileRecord | null = null;
  actionDialogLoading = false;
  actionDialogError = '';

  constructor(
    private fileService: FileService,
    private toast: ToastService
  ) {}

  /**
   * Load trashed files and folders when the component is initialized.
   */
  ngOnInit(): void {
    this.loadTrashItems();
  }

  /**
   * Fetch the trash listing from the backend and update component state.
   */
  loadTrashItems(): void {
    this.loading = true;
    this.fileService.getTrashItems().subscribe({
      next: (res) => {
        if (res.success) {
          this.folders = res.folders;
          this.files = res.files;
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching trash items:', err);
        this.toast.error('Failed to load trash items');
        this.loading = false;
      }
    });
  }

  isFileRecord(record: FolderRecord | FileRecord): record is FileRecord {
    return 's3Key' in record;
  }

  openPermanentDeleteDialog(record: FolderRecord | FileRecord): void {
    this.actionDialogMode = 'permanent';
    this.actionDialogRecord = record;
    this.actionDialogLoading = false;
    this.actionDialogError = '';
  }

  closeActionDialog(): void {
    this.actionDialogMode = null;
    this.actionDialogRecord = null;
    this.actionDialogError = '';
    this.actionDialogLoading = false;
  }

  /**
   * Restore a trashed file or folder back to active storage.
   * @param record - Trash item to restore.
   */
  restoreItem(record: FolderRecord | FileRecord): void {
    const request$ = this.isFileRecord(record)
      ? this.fileService.restoreFile(record._id)
      : this.fileService.restoreFolder(record._id);

    request$.subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success(`${this.isFileRecord(record) ? 'File' : 'Folder'} restored successfully.`);
          this.removeItemFromTrash(record);
        } else {
          this.toast.error(res.message || 'Restore failed.');
        }
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Restore failed.');
      }
    });
  }

  /**
   * Permanently remove a selected trash item after confirmation.
   */
  confirmPermanentDelete(): void {
    const record = this.actionDialogRecord;
    if (!record) {
      return;
    }

    this.actionDialogLoading = true;
    const request$ = this.isFileRecord(record)
      ? this.fileService.permanentlyDeleteFile(record._id)
      : this.fileService.permanentlyDeleteFolder(record._id);

    request$.subscribe({
      next: (res) => {
        this.actionDialogLoading = false;
        if (res.success) {
          this.toast.success(`${this.isFileRecord(record) ? 'File' : 'Folder'} permanently deleted.`);
          this.removeItemFromTrash(record);
          this.closeActionDialog();
        } else {
          this.actionDialogError = res.message || 'Permanent delete failed.';
        }
      },
      error: (err) => {
        this.actionDialogLoading = false;
        this.actionDialogError = err?.error?.message || 'Permanent delete failed.';
      }
    });
  }

  removeItemFromTrash(record: FolderRecord | FileRecord): void {
    if (this.isFileRecord(record)) {
      this.files = this.files.filter((item) => item._id !== record._id);
    } else {
      this.folders = this.folders.filter((item) => item._id !== record._id);
    }
  }

  formatDate(value?: string): string {
    if (!value) return '-';
    const date = new Date(value);
    return date.toLocaleString();
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
}
