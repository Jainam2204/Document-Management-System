import { Component, EventEmitter, Output, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { SearchFilterService } from '../../../services/search-filter/search-filter.service';

/**
 * Application header component.
 * Syncs search input state and emits sidebar toggle events.
 */
@Component({
  selector: 'app-header',
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements AfterViewInit, OnDestroy {
  @Output() toggleSidebar = new EventEmitter<void>();
  @ViewChild('headerSearchInput') headerSearchInput?: ElementRef<HTMLInputElement>;

  searchOpen = false;
  private searchSubscription?: Subscription;

  constructor(private searchFilterService: SearchFilterService) {}

  /**
   * Synchronize the header search input with shared filter state.
   */
  ngAfterViewInit() {
    this.searchSubscription = this.searchFilterService.criteria$.subscribe((criteria) => {
      const inputElement = this.headerSearchInput?.nativeElement;
      if (inputElement && inputElement.value !== criteria.searchTerm) {
        inputElement.value = criteria.searchTerm;
      }
    });
  }

  /**
   * Clean up the search subscription when the component is destroyed.
   */
  ngOnDestroy() {
    this.searchSubscription?.unsubscribe();
  }

  /**
   * Emit an event to toggle the main sidebar visibility.
   */
  onToggleSidebar() {
    this.toggleSidebar.emit();
  }

  /**
   * Forward user search input into the shared filter service.
   * @param value - Current search input value.
   */
  onSearchInput(value: string) {
    this.searchFilterService.setSearchTerm(value);
  }
}


