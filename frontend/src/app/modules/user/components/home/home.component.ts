import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpEventType } from '@angular/common/http';
import { Subscription, take } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { FileService, FileRecord, FolderRecord } from '../../../../services/file/file.service';
import { SearchFilterService } from '../../../../services/search-filter/search-filter.service';
import { ToastService } from '../../../../services/toast/toast.service';
import { RouteHelperService } from '../../../../services/route-helper/route-helper.service';
import { FileActionDropdownComponent } from '../file-action-dropdown/file-action-dropdown.component';

/**
 * Home view component for managing user files and folders.
 * Handles navigation, filtering, uploads, and action dialogs.
 */
@Component({
  selector: 'app-home',
  imports: [CommonModule, FormsModule, FileActionDropdownComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
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

  allFolders: FolderRecord[] = [];
  allFiles: FileRecord[] = [];
  searchTerm = '';
  filterType = '';
  filterDateFrom = '';
  filterDateTo = '';
  sizeFilter: 'all' | 'small' | 'medium' | 'large' = 'all';

  private searchSubscription?: Subscription;
  private uploadSub!: Subscription;
  private routeSub!: Subscription;

  constructor(
    private fileService: FileService,
    private searchFilterService: SearchFilterService,
    private toast: ToastService,
    private route: ActivatedRoute,
    private router: Router,
    private routeHelper: RouteHelperService
  ) {}

  /**
   * Initialize component state and subscribe to route and search changes.
   */
  ngOnInit() {
    this.routeSub = this.route.params.subscribe((params) => {
      this.currentFolderId = params['id'] || null;
      this.loadData();
    });

    this.uploadSub = this.fileService.fileUploaded$.subscribe(() => {
      this.loadData();
    });

    this.searchTerm = this.searchFilterService.currentCriteria.searchTerm;
    this.applyFilters();

    this.searchSubscription = this.searchFilterService.searchTermChanges$.subscribe((searchTerm) => {
      this.searchTerm = searchTerm;
      this.applyFilters();
    });
  }

  /**
   * Tear down active subscriptions when the component is destroyed.
   */
  ngOnDestroy() {
    this.uploadSub?.unsubscribe();
    this.routeSub?.unsubscribe();
    this.searchSubscription?.unsubscribe();
  }

  /**
   * Load the appropriate file and folder data for the current route.
   */
  loadData() {
    this.loading = true;
    if (this.currentFolderId) {
      this.loadFolderContents();
      return;
    }

    this.loadRootContents();
  }

  loadRootContents() {
    this.currentFolder = null;
    this.loadFolders();
    this.loadFiles();
  }

  /**
   * Load the currently selected folder's files and subfolders.
   */
  loadFolderContents() {
    if (!this.currentFolderId) {
      return;
    }

    this.fileService.getFolderContents(this.currentFolderId).subscribe({
      next: (res) => {
        if (!res.success) {
          this.loading = false;
          return;
        }

        this.currentFolder = res.folder;
        this.allFolders = res.subfolders;
        this.allFiles = res.files;
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading folder contents:', err);
        this.toast.error('Failed to load folder contents');
        this.loading = false;
      }
    });
  }

  /**
   * Load root-level folders for the current user.
   */
  loadFolders() {
    this.fileService.getUserFolders().subscribe({
      next: (res) => {
        if (!res.success) {
          return;
        }
        this.allFolders = res.folders;
        this.applyFilters();
      },
      error: (err) => {
        console.error('Error loading folders:', err);
      }
    });
  }

  /**
   * Load root-level files for the current user.
   */
  loadFiles() {
    this.fileService.getUserFiles().subscribe({
      next: (res) => {
        if (!res.success) {
          this.loading = false;
          return;
        }
        this.allFiles = res.files;
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading files:', err);
        this.toast.error('Failed to load files');
        this.loading = false;
      }
    });
  }

  /**
   * Navigate into a selected folder.
   * @param folder - Folder selected by the user.
   */
  onFolderClick(folder: FolderRecord): void {
    this.router.navigate(['/home', folder._id]);
  }

  /**
   * Navigate up one level in the folder hierarchy.
   */
  goBack(): void {
    if (this.currentFolder?.parentFolder) {
      this.router.navigate(['/home', this.currentFolder.parentFolder]);
      return;
    }
    this.router.navigate(['/home']);
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterType = '';
    this.filterDateFrom = '';
    this.filterDateTo = '';
    this.sizeFilter = 'all';
    this.searchFilterService.resetFilters();
    this.applyFilters();
  }

  hasFilters(): boolean {
    return (
      !!this.searchTerm ||
      !!this.filterType ||
      !!this.filterDateFrom ||
      !!this.filterDateTo ||
      this.sizeFilter !== 'all'
    );
  }

  /**
   * Apply the current search and filter criteria to loaded items.
   */
  private applyFilters(): void {
    const searchTerm = this.searchTerm.trim().toLowerCase();
    const typeTerm = this.filterType.trim().toLowerCase();
    const dateRange = this.createDateRange(this.filterDateFrom, this.filterDateTo);

    this.folders = this.allFolders.filter((folder) => {
      return this.folderMatchesSearch(folder, searchTerm, dateRange);
    });

    this.files = this.allFiles.filter((file) => {
      return this.fileMatchesSearch(file, searchTerm, typeTerm, dateRange, this.sizeFilter);
    });
  }

  /**
   * Convert date filter strings into a comparable date range.
   * @param from - Start date string.
   * @param to - End date string.
   * @returns Object with parsed from/to dates or null values.
   */
  private createDateRange(from: string, to: string): { from: Date | null; to: Date | null } {
    const range = { from: null as Date | null, to: null as Date | null };

    if (from) {
      range.from = new Date(from);
    }

    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      range.to = toDate;
    }

    return range;
  }

  /**
   * Determine whether a folder matches the current search criteria.
   * @param folder - Folder to evaluate.
   * @param searchTerm - Search term to match against folder name.
   * @param dateRange - Optional date range for folder creation.
   */
  private folderMatchesSearch(folder: FolderRecord, searchTerm: string, dateRange: { from: Date | null; to: Date | null }): boolean {
    const hasSearchMatch = !searchTerm || folder.name.toLowerCase().includes(searchTerm);
    const hasDateMatch = this.itemMatchesDate(folder.createdAt, dateRange);
    return hasSearchMatch && hasDateMatch;
  }

  /**
   * Determine whether a file matches search, type, date, and size filters.
   * @param file - File item to evaluate.
   * @param searchTerm - Search term used for name/type matching.
   * @param typeTerm - File type filter string.
   * @param dateRange - Date range used for creation filtering.
   * @param sizeFilter - Size category filter.
   */
  private fileMatchesSearch(file: FileRecord, searchTerm: string, typeTerm: string, dateRange: { from: Date | null; to: Date | null }, sizeFilter: 'all' | 'small' | 'medium' | 'large'): boolean {
    const extension = this.getFileExtension(file.name);
    const nameMatches = !searchTerm || file.name.toLowerCase().includes(searchTerm);
    const typeMatches = !searchTerm || file.type.toLowerCase().includes(searchTerm) || extension.includes(searchTerm);
    const searchMatches = nameMatches || typeMatches;

    const typeFilterMatches = !typeTerm || file.type.toLowerCase().includes(typeTerm) || extension.includes(typeTerm);
    const dateMatches = this.itemMatchesDate(file.createdAt, dateRange);
    const sizeMatches = this.itemMatchesSize(file.size, sizeFilter);

    return searchMatches && typeFilterMatches && dateMatches && sizeMatches;
  }

  /**
   * Check whether a date falls inside the current filter range.
   * @param itemDate - ISO date string of the item.
   * @param dateRange - Range to compare against.
   */
  private itemMatchesDate(itemDate: string, dateRange: { from: Date | null; to: Date | null }): boolean {
    const date = new Date(itemDate);
    if (dateRange.from && date < dateRange.from) {
      return false;
    }
    if (dateRange.to && date > dateRange.to) {
      return false;
    }
    return true;
  }

  /**
   * Check whether a file size passes the selected size filter.
   * @param size - File size in bytes.
   * @param filter - Selected size bucket.
   */
  private itemMatchesSize(size: number, filter: 'all' | 'small' | 'medium' | 'large'): boolean {
    if (filter === 'all') {
      return true;
    }
    if (filter === 'small') {
      return size < 1024 * 1024;
    }
    if (filter === 'medium') {
      return size >= 1024 * 1024 && size <= 10 * 1024 * 1024;
    }
    return size > 10 * 1024 * 1024;
  }

  private getFileExtension(name: string): string {
    const parts = name.toLowerCase().split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  hasAnyResults(): boolean {
    return this.folders.length > 0 || this.files.length > 0;
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


