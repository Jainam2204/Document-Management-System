import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, take, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';
import { FileService, FileRecord, FolderRecord } from '../../../../services/file/file.service';
import { SearchFilterService } from '../../../../services/search-filter/search-filter.service';
import { ToastService } from '../../../../services/toast/toast.service';
import { UserService } from '../../../../services/user/user.service';
import { RouteHelperService } from '../../../../services/route-helper/route-helper.service';
import { FileActionDropdownComponent } from '../file-action-dropdown/file-action-dropdown.component';
import { UploadHelperComponent } from '../../../../shared/components/upload-helper/upload-helper.component';
import { SizePipe } from '../../../../shared/pipes/size/size.pipe';
import { FileIconPipe } from '../../../../shared/pipes/file-icon/file-icon.pipe';
import { StorageService } from '../../../../services/storage/storage.service';
import { getFileIcon, getFilePreview } from '../../../../shared/utils/getFileIcon';


@Component({
    selector: 'app-home',
    imports: [CommonModule, FormsModule, FileActionDropdownComponent, SizePipe, UploadHelperComponent, FileIconPipe],
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
    shareEmails: string[] = [];
    shareEmailInput = '';
    shareWithEveryone = false;
    shareSuccessMessage = '';
    dragActive = false;
    dragCounter = 0;
    minDate: string = '';

    emailSuggestions: Array<{ name: string; email: string }> = [];
    filteredSuggestions: Array<{ name: string; email: string }> = [];
    showSuggestions = false;
    private emailSearchSubject = new Subject<string>();

    publicShareUrl = '';

    @ViewChild('uploadHelper') uploadHelper!: UploadHelperComponent;

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
    private emailSearchSub?: Subscription;

    constructor(
        private fileService: FileService,
        private searchFilterService: SearchFilterService,
        private storageService: StorageService,
        private toast: ToastService,
        private userService: UserService,
        private route: ActivatedRoute,
        private router: Router,
        private routeHelper: RouteHelperService
    ) { }


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

        const today = new Date();
        this.minDate = today.toISOString().split('T')[0];

        this.emailSearchSub = this.emailSearchSubject.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            switchMap((query) => {
                if (!query || query.length < 2) {
                    return [];
                }
                return this.userService.searchUsers(query);
            })
        ).subscribe({
            next: (res: any) => {
                if (res?.success && res?.users) {
                    this.filteredSuggestions = res.users.filter(
                        (u: any) => !this.shareEmails.includes(u.email.toLowerCase())
                    );
                    this.showSuggestions = this.filteredSuggestions.length > 0;
                } else {
                    this.filteredSuggestions = [];
                    this.showSuggestions = false;
                }
            },
            error: () => {
                this.filteredSuggestions = [];
                this.showSuggestions = false;
            }
        });
    }

    ngOnDestroy() {
        this.uploadSub?.unsubscribe();
        this.routeSub?.unsubscribe();
        this.searchSubscription?.unsubscribe();
        this.emailSearchSub?.unsubscribe();
    }


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


    onFolderClick(folder: FolderRecord) {
        this.router.navigate(['/home', folder._id]);
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
        console.log("FILES:", event.dataTransfer?.files);
        console.log("ITEMS:", event.dataTransfer?.items);
        event.preventDefault();
        event.stopPropagation();
        this.dragCounter = 0;
        this.dragActive = false;
        if (event.dataTransfer) {
            this.uploadHelper.uploadDataTransferItems(event.dataTransfer, this.currentFolderId);
        }
    }

    goBack() {
        if (this.currentFolder?.parentFolder) {
            this.router.navigate(['/home', this.currentFolder.parentFolder]);
            return;
        }
        this.router.navigate(['/home']);
    }

    onFilterChange() {
        this.applyFilters();
    }

    clearFilters() {
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


    private applyFilters() {
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

    private folderMatchesSearch(folder: FolderRecord, searchTerm: string, dateRange: { from: Date | null; to: Date | null }): boolean {
        const hasSearchMatch = !searchTerm || folder.name.toLowerCase().includes(searchTerm);
        const hasDateMatch = this.itemMatchesDate(folder.createdAt, dateRange);
        return hasSearchMatch && hasDateMatch;
    }


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

    onItemMenuKeyChange(key: string | null) {
        this.openItemMenuKey = key;
    }

    onAction(event: { type: string; data?: any }) {
        const parentId = this.routeHelper.getParentFolderIdFromUrl();
        switch (event.type) {
            case 'createFolder':
                this.createFolder(event.data.name, parentId);
                break;
            case 'uploadFile':
                this.uploadHelper.uploadFile(event.data, parentId);
                break;
            case 'uploadFolder':
                this.uploadHelper.uploadFolder(event.data, parentId);
                break;
            case 'download':
                if (this.isFileRecord(event.data)) {
                    this.downloadFile(event.data);
                }
                break;
            case 'rename':
                if (event.data) {
                    this.openActionDialog('rename', event.data);
                }
                break;
            case 'share':
                if (event.data) {
                    this.openActionDialog('share', event.data);
                }
                break;
            case 'delete':
                if (event.data) {
                    this.openActionDialog('delete', event.data);
                }
                break;
            default:
                break;
        }
    }

    openActionDialog(mode: 'rename' | 'delete' | 'share', record: FolderRecord | FileRecord) {
        this.actionDialogMode = mode;
        this.actionDialogRecord = record;
        this.actionDialogError = '';
        this.actionDialogLoading = false;
        this.shareUrl = '';
        this.shareExpiryDate = '';
        this.shareExpiryTime = '';
        this.shareWithEveryone = false;
        this.publicShareUrl = '';
        this.shareSuccessMessage = '';
        this.shareEmails = [];
        this.shareEmailInput = '';
        this.filteredSuggestions = [];
        this.showSuggestions = false;
        this.actionDialogInput = mode === 'rename' ? record.name : '';

        if (mode === 'share' && !this.isFileRecord(record)) {
            this.shareWithEveryone = false;
        }
    }

    closeActionDialog() {
        this.actionDialogMode = null;
        this.actionDialogRecord = null;
        this.actionDialogInput = '';
        this.actionDialogError = '';
        this.actionDialogLoading = false;
        this.shareUrl = '';
        this.shareEmails = [];
        this.shareEmailInput = '';
        this.shareWithEveryone = false;
        this.shareSuccessMessage = '';
        this.publicShareUrl = '';
        this.filteredSuggestions = [];
        this.showSuggestions = false;
    }

    /** Whether the current share target is a file (vs folder) */
    get isShareTargetFile(): boolean {
        return !!this.actionDialogRecord && this.isFileRecord(this.actionDialogRecord);
    }

    submitRename() {
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

    submitDelete() {
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

    submitShare() {
        if (!this.actionDialogRecord || (!this.shareWithEveryone && this.shareEmails.length === 0)) {
            return;
        }

        if (this.shareWithEveryone && this.isShareTargetFile) {
            this.submitPublicShare();
            return;
        }

        this.actionDialogLoading = true;
        this.actionDialogError = '';
        this.shareSuccessMessage = '';

        const resourceType = this.isFileRecord(this.actionDialogRecord) ? 'file' : 'folder';

        let expiry: string | undefined;
        if (this.shareExpiryDate) {
            const d = new Date(this.shareExpiryDate);
            d.setHours(23, 59, 59, 999);
            expiry = d.toISOString();
        }

        this.fileService.shareWithUsers(resourceType, this.actionDialogRecord._id, this.shareEmails, expiry, false).subscribe({
            next: (res) => {
                this.actionDialogLoading = false;
                if (res.success) {
                    const sharedCount = res.sharedCount || this.shareEmails.length;
                    this.toast.success(`Shared with ${sharedCount} user(s)`);

                    if (res?.failedEmails && res.failedEmails.length > 0) {
                        const failedMessages = res?.failedEmails
                            .map((f: any) => `${f.email}: ${f.reason}`)
                            .join('\n');
                        this.toast.warning(`Some shares failed:\n${failedMessages}`);
                        this.actionDialogError = failedMessages;
                    } else {
                        this.closeActionDialog();
                    }
                } else {
                    this.actionDialogError = res.message || 'Failed to share.';
                }
            },
            error: (err) => {
                this.actionDialogLoading = false;
                if (err?.error?.failedEmails) {
                    const failedMessages = err.error.failedEmails
                        .map((f: any) => `${f.email}: ${f.reason}`)
                        .join('\n');
                    this.toast.warning(`Some shares failed:\n${failedMessages}`);
                    this.actionDialogError = failedMessages;
                } else {
                    this.actionDialogError = err?.error?.message || 'Failed to share.';
                }
            }
        });
    }

    submitPublicShare() {
        if (!this.actionDialogRecord || !this.isFileRecord(this.actionDialogRecord)) {
            return;
        }

        this.actionDialogLoading = true;
        this.actionDialogError = '';
        this.publicShareUrl = '';

        let expiry: string | undefined;
        if (this.shareExpiryDate) {
            const d = new Date(this.shareExpiryDate);
            d.setHours(23, 59, 59, 999);
            expiry = d.toISOString();
        }

        this.fileService.generatePublicShareLink(this.actionDialogRecord._id, expiry).subscribe({
            next: (res) => {
                this.actionDialogLoading = false;
                if (res.success && res.url) {
                    this.publicShareUrl = res.url;
                    this.shareSuccessMessage = 'Public download link generated!';
                    this.toast.success('Public share link generated');
                } else {
                    this.actionDialogError = res.message || 'Failed to generate link.';
                }
            },
            error: (err) => {
                this.actionDialogLoading = false;
                this.actionDialogError = err?.error?.message || 'Failed to generate share link.';
            }
        });
    }

    onEmailInputChange(value: string) {
        this.shareEmailInput = value;
        this.emailSearchSubject.next(value);
    }

    selectSuggestion(suggestion: { name: string; email: string }) {
        const email = suggestion.email.toLowerCase();
        if (!this.shareEmails.includes(email)) {
            this.shareEmails.push(email);
        }
        this.shareEmailInput = '';
        this.showSuggestions = false;
        this.filteredSuggestions = [];
        this.actionDialogError = '';
    }

    hideSuggestions() {
        setTimeout(() => {
            this.showSuggestions = false;
        }, 200);
    }

    addEmail(event?: Event) {
        if (event) {
            event.preventDefault();
        }

        const email = this.shareEmailInput.trim();
        if (!email) {
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.actionDialogError = 'Please enter a valid email address.';
            return;
        }

        if (this.shareEmails.includes(email.toLowerCase())) {
            this.actionDialogError = 'This email is already added.';
            return;
        }

        this.shareEmails.push(email.toLowerCase());
        this.shareEmailInput = '';
        this.actionDialogError = '';
        this.showSuggestions = false;
    }

    removeEmail(index: number) {
        this.shareEmails.splice(index, 1);
        this.actionDialogError = '';
    }

    copyPublicShareUrl() {
        if (!this.publicShareUrl) {
            return;
        }
        navigator.clipboard?.writeText(this.publicShareUrl).then(() => {
            this.toast.success('Download link copied to clipboard!');
        }).catch(() => {
            this.toast.error('Could not copy link.');
        });
    }

    copyShareUrl() {
        if (!this.shareUrl) {
            return;
        }
        navigator.clipboard?.writeText(this.shareUrl).then(() => {
            this.toast.success('Share link copied to clipboard.');
        }).catch(() => {
            this.toast.error('Could not copy share link.');
        });
    }

    private updateRenamedRecord(record: FolderRecord | FileRecord, newName: string) {
        if (this.isFileRecord(record)) {
            this.files = this.files.map((file) => file._id === record._id ? { ...file, name: newName } : file);
        } else {
            this.folders = this.folders.map((folder) => folder._id === record._id ? { ...folder, name: newName } : folder);
            if (this.currentFolder && this.currentFolder._id === record._id) {
                this.currentFolder = { ...this.currentFolder, name: newName };
            }
        }
    }

    private removeDeletedRecord(record: FolderRecord | FileRecord) {
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

    getItemIcon(item: FolderRecord | FileRecord): string {
        const isFolder = !this.isFileRecord(item);
        return getFileIcon(item.name, isFolder);
    }

    getFilePreview(file: FileRecord) {
        return getFilePreview(file);
    }

    private createFolder(name: string, parentId: string | null) {
        this.fileService.createFolder(name, parentId || undefined).subscribe({
            next: (res) => {
                if (res?.success && res?.folder) {

                    this.allFolders.push(res.folder);
                    this.applyFilters();

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

    onFileUploadSuccess(response: any) {
        this.storageService.refreshStorage();
        this.loadData();
    }

    private downloadFile(file: FileRecord) {
        this.fileService.downloadFile(file._id).subscribe({
            next: (res) => {
                if (!res?.success || !res.downloadUrl) {
                    this.toast.error(res?.message || 'Unable to download file.');
                    return;
                }

                const link = document.createElement('a');
                link.href = res.downloadUrl;
                link.download = file.name;
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            },
            error: (err) => {
                console.error('Download error:', err);
                this.toast.error(err?.error?.message || 'Unable to download file.');
            }
        });
    }

    onFolderUploadCompleted(result: { successCount: number; failureCount: number }) {
        this.storageService.refreshStorage();
        this.loadData();
    }
}
