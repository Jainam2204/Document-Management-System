import { Component, EventEmitter, HostListener, Output, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth/auth.service';
import { ToastService } from '../../../services/toast/toast.service';
import { SearchFilterService } from '../../../services/search-filter/search-filter.service';


@Component({
  selector: 'app-header',
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements AfterViewInit, OnDestroy {
  @Output() toggleSidebar = new EventEmitter<void>();
  @ViewChild('headerSearchInput') headerSearchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('profileMenu') profileMenu?: ElementRef<HTMLDivElement>;

  searchOpen = false;
  profileMenuOpen = false;
  private searchSubscription?: Subscription;

  constructor(
    private searchFilterService: SearchFilterService,
    private authService: AuthService,
    private toast: ToastService,
    private router: Router
  ) {}

  ngAfterViewInit() {
    this.searchSubscription = this.searchFilterService.criteria$.subscribe((criteria) => {
      const inputElement = this.headerSearchInput?.nativeElement;
      if (inputElement && inputElement.value !== criteria.searchTerm) {
        inputElement.value = criteria.searchTerm;
      }
    });
  }

  ngOnDestroy() {
    this.searchSubscription?.unsubscribe();
  }

  @HostListener('document:click', ['$event.target'])
  onDocumentClick(target: HTMLElement): void {
    if (!this.profileMenu?.nativeElement.contains(target)) {
      this.profileMenuOpen = false;
    }
  }

  toggleProfileMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.profileMenuOpen = !this.profileMenuOpen;
  }

  updateProfile(): void {
    this.profileMenuOpen = false;
    this.router.navigate(['/auth/reset-password']);
  }

  logout(): void {
    this.profileMenuOpen = false;
    this.authService.logout().subscribe({
      next: () => {
        this.toast.success('Logged out successfully');
        this.router.navigate(['/auth/login']);
      },
      error: (err: any) => {
        this.toast.error(err?.error?.message || 'Logout failed');
      }
    });
  }

 
  onToggleSidebar() {
    this.toggleSidebar.emit();
  }


  onSearchInput(value: string) {
    this.searchFilterService.setSearchTerm(value);
  }
}


