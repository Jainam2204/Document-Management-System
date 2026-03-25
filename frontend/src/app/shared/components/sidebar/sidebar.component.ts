import { Component, HostListener, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  @Input() collapsed = false;

  activeItem = 'files';
  storageUsed = 75;
  isMobile = false;

  constructor() {
    this.checkMobile();
  }

  setActive(item: string): void {
    this.activeItem = item;
  }

  onLogout(): void {
    // Placeholder – wire to auth service later
    console.log('Logout clicked');
  }

  onOverlayClick(): void {
    // On mobile, clicking overlay should close sidebar
    // Parent controls collapsed state, so we emit nothing here;
    // the overlay only shows when !collapsed && isMobile
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
