import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FileService } from '../../../../services/file/file.service';
import { ToastService } from '../../../../services/toast/toast.service';
import { SizePipe } from '../../../../shared/pipes/size/size.pipe';
import { FileIconPipe } from '../../../../shared/pipes/file-icon/file-icon.pipe';

@Component({
    selector: 'app-shared-with-me',
    imports: [CommonModule, SizePipe, FileIconPipe],
    templateUrl: './shared-with-me.component.html',
    styleUrls: ['./shared-with-me.component.css']
})
export class SharedWithMeComponent implements OnInit {
    items: any[] = [];
    folders: any[] = [];
    files: any[] = [];
    loading = false;
    currentFolderId: string | null = null;
    currentFolder: any = null;
    isFolderView = false;

    constructor(
        private fileService: FileService,
        private toast: ToastService,
        private route: ActivatedRoute,
        private router: Router
    ) { }

    ngOnInit() {
        this.route.params.subscribe((params) => {
            this.currentFolderId = params['id'] || null;
            this.isFolderView = !!this.currentFolderId;
            this.loadData();
        });
    }

    loadData() {
        this.loading = true;
        if (this.isFolderView) {
            this.loadSharedFolderContents();
        } else {
            this.loadSharedItems();
        }
    }

    loadSharedItems() {
        this.fileService.getSharedWithMe().subscribe({
            next: (res) => {
                if (res.success) {
                    this.items = res.items;
                }
                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading shared items:', err);
                this.toast.error('Failed to load shared items');
                this.loading = false;
            }
        });
    }

    loadSharedFolderContents() {
        if (!this.currentFolderId) return;

        this.fileService.getSharedFolderContents(this.currentFolderId).subscribe({
            next: (res) => {
                if (res.success) {
                    this.currentFolder = res.folder;
                    this.folders = res.subfolders;
                    this.files = res.files;
                }
                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading shared folder contents:', err);
                this.toast.error('Failed to load shared folder contents');
                this.loading = false;
            }
        });
    }

    isFile(item: any): boolean {
        return item.resourceType === 'file';
    }

    onFolderClick(folder: any) {
        this.router.navigate(['/shared-with-me', folder._id]);
    }

    goBack() {
        this.router.navigate(['/shared-with-me']);
    }

    downloadFile(item: any) {
        this.fileService.downloadFile(item._id).subscribe({
            
            next: (res) => {
                if (!res?.success || !res.downloadUrl) {
                    this.toast.error('Unable to download file.');
                    return;
                }

                const link = document.createElement('a');
                link.href = res.downloadUrl;
                link.download = item.name;
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
}
