import { Component, EventEmitter, HostListener, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  @Output() toggleSidebar = new EventEmitter<void>();

  searchOpen = false;
  profileDropdownOpen = false;

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const profileEl = document.getElementById('header-profile');
    if (profileEl && !profileEl.contains(target)) {
      this.profileDropdownOpen = false;
    }
  }
}
