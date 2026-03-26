import { Component, ElementRef, HostListener, Input, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpEventType } from '@angular/common/http';
import { Router } from '@angular/router';
import { FileService } from '../../../services/file/file.service';
import { ToastService } from '../../../services/toast/toast.service';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  @Input() collapsed = false;

  @ViewChild('fileInput') fileInput!: ElementRef;
  @ViewChild('folderInput') folderInput!: ElementRef;

  activeItem = 'files';
  storageUsed = 75;
  isMobile = false;
  showNewMenu = false;
  uploading = false;

  constructor(
    private fileService: FileService,
    private toast: ToastService,
    private router: Router
  ) {
    this.checkMobile();
  }

  ngAfterViewInit() {
    this.folderInput.nativeElement.setAttribute('webkitdirectory', '');
  }

  toggleNewMenu() {
    this.showNewMenu = !this.showNewMenu;
  }

  createFolder() {
    this.showNewMenu = false;
    const folderName = prompt('Enter folder name');
    if (!folderName || !folderName.trim()) return;
    this.fileService.createFolder(folderName.trim()).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Folder created successfully');
          this.fileService.fileUploaded$.next(); // Trigger reload
        } else {
          this.toast.error(res.message || 'Failed to create folder');
        }
      },
      error: (err) => {
        console.error('Error creating folder:', err);
        this.toast.error('Failed to create folder');
      }
    });
  }

  triggerFileUpload() {
    this.showNewMenu = false;
    this.fileInput.nativeElement.click();
  }

  triggerFolderUpload() {
    this.showNewMenu = false;
    this.folderInput.nativeElement.click();
  }

  async onFileSelected(event: any): Promise<void> {
    const file: File = event.target.files[0];
    if (!file) return;

    event.target.value = '';

    this.uploading = true;
    this.toast.warning('Uploading ' + file.name + '...');

    try {
      const urlRes = await this.fileService
        .getUploadUrl(file.name, file.type, file.size)
        .toPromise();

      if (!urlRes || !urlRes.success) {
        this.toast.error(urlRes?.message || 'Failed to get upload URL');
        this.uploading = false;
        return;
      }

      await new Promise<void>((resolve, reject) => {
        this.fileService.uploadToS3(urlRes.uploadUrl, file).subscribe({
          next: (event) => {
            if (event.type === HttpEventType.Response) {
              resolve();
            }
          },
          error: (err) => reject(err),
        });
      });

      const saveRes = await this.fileService
        .saveFileMetadata(file.name, urlRes.s3Key, file.size, file.type)
        .toPromise();

      if (!saveRes || !saveRes.success) {
        this.toast.error(saveRes?.message || 'Failed to save file');
        this.uploading = false;
        return;
      }

      this.toast.success(file.name + ' uploaded successfully!');
      this.fileService.fileUploaded$.next();
    } catch (err: any) {
      console.error('Upload error:', err);
      this.toast.error('Upload failed: ' + (err.message || 'Unknown error'));
    } finally {
      this.uploading = false;
    }
  }

  // async onFolderSelected(event: any): Promise<void> {
  //   const fileList: FileList = event.target.files;
  //   if (!fileList || fileList.length === 0) return;

  //   event.target.value = '';

  //   const files: File[] = Array.from(fileList);
  //   const total = files.length;

  //   // Step 1: Extract folder structure from webkitRelativePath
  //   // Paths look like: "RootFolder/sub/nested/file.txt"

  //   const firstFile = files[0];

  //   console.log(event.target.files);
  //   console.log((files[0] as any).webkitRelativePath);

  //   if (!firstFile || !(firstFile as any).webkitRelativePath) {
  //     this.toast.error("Folder upload not supported or invalid selection");
  //     return;
  //   }
  //   const firstPath = (files[0] as any).webkitRelativePath as string;
  //   const rootName = firstPath.split('/')[0];

  //   const folderPaths = new Set<string>();
  //   for (const file of files) {
  //     const relativePath = (file as any).webkitRelativePath;

  //     if (!relativePath) {
  //       console.warn("Skipping file without relative path:", file.name);
  //       continue;
  //     }
  //     const parts = relativePath.split('/');
  //     // Skip first part (rootName) and last part (fileName)
  //     // Build sub-paths relative to root
  //     for (let i = 2; i < parts.length; i++) {
  //       const subPath = parts.slice(1, i).join('/');
  //       folderPaths.add(subPath);
  //     }
  //   }

  //   this.uploading = true;
  //   this.toast.warning(`Preparing folder "${rootName}" (${total} files)...`);

  //   try {
  //     // Step 2: Create folder tree in backend
  //     const treeRes = await this.fileService
  //       .createFolderTree(rootName, Array.from(folderPaths))
  //       .toPromise();

  //     if (!treeRes || !treeRes.success) {
  //       this.toast.error(treeRes?.message || 'Failed to create folder structure');
  //       this.uploading = false;
  //       return;
  //     }

  //     const pathToIdMap = treeRes.pathToIdMap;

  //     // Step 3: Upload each file with correct folderId
  //     let uploaded = 0;
  //     let failed = 0;

  //     for (const file of files) {
  //       const relativePath = (file as any).webkitRelativePath as string;
  //       const parts = relativePath.split('/');
  //       // Sub-path of the parent folder (relative to root), empty string if file is directly in root
  //       const parentSubPath = parts.slice(1, -1).join('/');
  //       const folderId = parentSubPath === ''
  //         ? pathToIdMap['']    // root folder
  //         : pathToIdMap[parentSubPath];

  //       try {
  //         // 3a: Get pre-signed URL
  //         const urlRes = await this.fileService
  //           .getUploadUrl(file.name, file.type || 'application/octet-stream', file.size)
  //           .toPromise();

  //         if (!urlRes || !urlRes.success) {
  //           failed++;
  //           continue;
  //         }

  //         // 3b: Upload to S3
  //         await new Promise<void>((resolve, reject) => {
  //           this.fileService.uploadToS3(urlRes.uploadUrl, file).subscribe({
  //             next: (ev: any) => {
  //               if (ev.type === 4) resolve(); // HttpEventType.Response = 4
  //             },
  //             error: (err: any) => reject(err),
  //           });
  //         });

  //         // 3c: Save metadata
  //         await this.fileService
  //           .saveFileMetadata(file.name, urlRes.s3Key, file.size, file.type || 'application/octet-stream', folderId)
  //           .toPromise();

  //         uploaded++;
  //         this.toast.success(`Uploaded ${uploaded}/${total}: ${file.name}`);
  //       } catch (err) {
  //         console.error(`Failed to upload ${file.name}:`, err);
  //         failed++;
  //       }
  //     }

  //     if (failed > 0) {
  //       this.toast.error(`Folder upload complete: ${uploaded} succeeded, ${failed} failed`);
  //     } else {
  //       this.toast.success(`Folder "${rootName}" uploaded successfully! (${uploaded} files)`);
  //     }

  //     this.fileService.fileUploaded$.next();
  //   } catch (err: any) {
  //     console.error('Folder upload error:', err);
  //     this.toast.error('Folder upload failed: ' + (err.message || 'Unknown error'));
  //   } finally {
  //     this.uploading = false;
  //   }
  // }

  async onFolderSelected(event: any): Promise<void> {
  const fileList: FileList = event.target.files;

  console.log("Files:", fileList);

  if (!fileList || fileList.length === 0) {
    this.toast.error("No folder selected or browser not supported");
    return;
  }

  const files: File[] = Array.from(fileList);

  event.target.value = '';

  const firstFile = files[0];
  const firstPath = (firstFile as any)?.webkitRelativePath;

  if (!firstPath) {
    this.toast.error("Folder upload not supported in this browser");
    return;
  }

  const rootName = firstPath.split('/')[0];

  console.log("Root folder:", rootName);

  const folderPaths = new Set<string>();

  for (const file of files) {
    const relativePath = (file as any)?.webkitRelativePath;

    if (!relativePath) continue;

    const parts = relativePath.split('/');

    for (let i = 2; i < parts.length; i++) {
      const subPath = parts.slice(1, i).join('/');
      folderPaths.add(subPath);
    }
  }

  this.uploading = true;
  this.toast.warning(`Uploading folder "${rootName}" (${files.length} files)...`);

  try {
    const treeRes = await this.fileService
      .createFolderTree(rootName, Array.from(folderPaths))
      .toPromise();

    if (!treeRes?.success) {
      this.toast.error("Failed to create folder structure");
      return;
    }

    const pathToIdMap = treeRes.pathToIdMap;

    let uploaded = 0;

    for (const file of files) {
      const relativePath = (file as any).webkitRelativePath;
      const parts = relativePath.split('/');
      const parentSubPath = parts.slice(1, -1).join('/');

      const folderId = parentSubPath === ''
        ? pathToIdMap['']
        : pathToIdMap[parentSubPath];

      const urlRes = await this.fileService
        .getUploadUrl(file.name, file.type || 'application/octet-stream', file.size)
        .toPromise();

      if (!urlRes?.success) continue;

      await new Promise<void>((resolve, reject) => {
        this.fileService.uploadToS3(urlRes.uploadUrl, file).subscribe({
          next: (ev: any) => {
            if (ev.type === 4) resolve();
          },
          error: reject
        });
      });

      await this.fileService
        .saveFileMetadata(file.name, urlRes.s3Key, file.size, file.type, folderId)
        .toPromise();

      uploaded++;
      this.toast.success(`Uploaded ${uploaded}/${files.length}`);
    }

    this.toast.success(`Folder uploaded successfully!`);
    this.fileService.fileUploaded$.next();

  } catch (err: any) {
    console.error(err);
    this.toast.error("Folder upload failed");
  } finally {
    this.uploading = false;
  }
}

  setActive(item: string): void {
    this.activeItem = item;
    if (item === 'files') {
      this.router.navigate(['/home']);
    }
  }

  onLogout(): void {
    console.log('Logout clicked');
  }

  onOverlayClick(): void {
    this.collapsed = true;
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkMobile();
  }

  private checkMobile(): void {
    this.isMobile = window.innerWidth <= 768;
  }
}
