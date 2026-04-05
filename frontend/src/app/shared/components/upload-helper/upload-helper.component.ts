import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileService } from '../../../services/file/file.service';
import { ToastService } from '../../../services/toast/toast.service';

@Component({
    selector: 'app-upload-helper',
    standalone: true,
    imports: [CommonModule],
    template: '<ng-container></ng-container>',
    styles: [':host { display: none; }']
})
export class UploadHelperComponent {
    uploading = false;
    uploadCancelled = false;
    folderUploadLoading = false;
    folderUploadStatus = '';

    @Output() fileUploadSuccess = new EventEmitter<any>();
    @Output() folderUploadCompleted = new EventEmitter<{ successCount: number; failureCount: number }>();

    constructor(
        private fileService: FileService,
        private toast: ToastService
    ) {}

    uploadFile(file: File, parentId: string | null) {
        this.toast.warning('Uploading ' + file.name + '...');

        this.fileService.uploadFile(file, parentId).subscribe({
            next: (res: any) => {
                if (res?.success) {
                    this.toast.success(file.name + ' uploaded successfully!');
                    this.fileUploadSuccess.emit(res.file);
                } else {
                    this.toast.error(res?.message || 'Failed to upload file');
                }
            },
            error: (err) => {
                this.toast.error(err?.error?.message || 'Failed to upload file');
            }
        });
    }

    uploadFolder(files: File[], parentId: string | null) {
        if (!files || files.length === 0) {
            this.toast.error('No folder selected.');
            return;
        }

        const parsed = this.parseFolderFiles(files);
        if (!parsed) {
            this.toast.error('Unable to read folder structure from selected files.');
            return;
        }

        this.uploadCancelled = false;
        this.folderUploadLoading = true;
        this.uploading = true;
        this.folderUploadStatus = `Creating folder tree for ${parsed.rootName}...`;
        this.toast.warning(`Uploading folder "${parsed.rootName}"...`);

        this.fileService.createFolderTree(parsed.rootName, parsed.subPaths, parentId).subscribe({
            next: (res: any) => {
                if (!res?.success) {
                    this.toast.error(res?.message || 'Failed to create folder tree.');
                    this.finishFolderUpload();
                    return;
                }

                this.folderUploadStatus = 'Uploading files...';
                this.uploadFilesSequentially(parsed.fileItems, res.pathToIdMap);
            },
            error: (err) => {
                this.toast.error(err?.error?.message || 'Folder upload failed.');
                this.finishFolderUpload();
            }
        });
    }

    cancelFolderUpload() {
        this.uploadCancelled = true;
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
    ) {
        let index = 0;
        let successCount = 0;
        let failureCount = 0;

        const next = () => {
            if (this.uploadCancelled) {
                this.toast.warning(`Upload cancelled. ${successCount} files were saved.`);
                this.finishFolderUpload();
                this.folderUploadCompleted.emit({ successCount, failureCount });
                return;
            }

            if (index >= fileItems.length) {
                this.finishFolderUpload();
                if (failureCount === 0) {
                    this.toast.success(`Uploaded ${successCount} files successfully.`);
                } else {
                    this.toast.warning(`Uploaded ${successCount} files, ${failureCount} failed.`);
                }
                this.folderUploadCompleted.emit({ successCount, failureCount });
                return;
            }

            const item = fileItems[index++];
            const folderId = pathToIdMap[item.folderPath] || pathToIdMap[''];
            if (!folderId) {
                failureCount += 1;
                next();
                return;
            }

            this.folderUploadStatus = `Uploading ${item.file.name} (${index}/${fileItems.length})...`;
            this.uploadFileToFolder(item.file, folderId, item.relativePath, (success) => {
                if (success) {
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
    ) {
        this.fileService.uploadFile(file, folderId, relativePath).subscribe({
            next: (res: any) => {
                callback(res?.success ?? false);
            },
            error: () => {
                callback(false);
            }
        });
    }

    private finishFolderUpload() {
        this.folderUploadLoading = false;
        this.uploading = false;
        this.folderUploadStatus = '';
        this.uploadCancelled = false;
    }
}
