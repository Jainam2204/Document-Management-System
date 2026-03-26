import { Component, ElementRef, HostListener, Input, ViewChild, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

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

  constructor() {
    this.checkMobile();
  }

  toggleNewMenu(): void {
    this.showNewMenu = !this.showNewMenu;
  }

  createFolder(): void {
    this.showNewMenu = false;

    const folderName = prompt('Enter folder name');
    if (!folderName) return;

    console.log('Create folder:', folderName);
  }

  triggerFileUpload(): void {
    this.showNewMenu = false;
    this.fileInput.nativeElement.click();
  }

  triggerFolderUpload(): void {
    this.showNewMenu = false;
    this.folderInput.nativeElement.click();
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    console.log('File selected:', file);
  }

  onFolderSelected(event: any): void {
    const files = event.target.files;

    console.log('Folder selected files:', files);

    for (let file of files) {
      console.log(file.webkitRelativePath);
    }
  }


  setActive(item: string): void {
    this.activeItem = item;
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
