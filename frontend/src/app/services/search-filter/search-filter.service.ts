import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

export interface SearchFilterCriteria {
  searchTerm: string;
  type: string;
  dateFrom: string;
  dateTo: string;
  size: 'all' | 'small' | 'medium' | 'large';
}

const DEFAULT_CRITERIA: SearchFilterCriteria = {
  searchTerm: '',
  type: '',
  dateFrom: '',
  dateTo: '',
  size: 'all',
};

/**
 * Manage global search and filter state for the application.
 * This service exposes criteria as an observable and debounced search inputs.
 */
@Injectable({
  providedIn: 'root',
})
export class SearchFilterService {
  // Current filter state for the app.
  private readonly criteriaSubject = new BehaviorSubject<SearchFilterCriteria>({ ...DEFAULT_CRITERIA });
  readonly criteria$ = this.criteriaSubject.asObservable();

  // Search input changes are debounced so we do not filter too often.
  private readonly searchTermSubject = new Subject<string>();
  readonly searchTermChanges$ = this.searchTermSubject.pipe(
    debounceTime(350),
    distinctUntilChanged()
  );

  // Expose the current criteria values for simple access.
  /**
   * Current filter criteria snapshot.
   */
  get currentCriteria(): SearchFilterCriteria {
    return this.criteriaSubject.value;
  }

  /**
   * Update the current search term and emit a debounced value.
   * @param searchTerm - New search query from the user.
   */
  setSearchTerm(searchTerm: string): void {
    const value = searchTerm.trim();
    this.criteriaSubject.next({ ...this.criteriaSubject.value, searchTerm: value });
    this.searchTermSubject.next(value);
  }

  /**
   * Update the selected file type filter.
   * @param type - File type filter value.
   */
  setType(type: string): void {
    this.criteriaSubject.next({ ...this.criteriaSubject.value, type: type.trim() });
  }

  /**
   * Set the start date for the current filter range.
   * @param dateFrom - Start date as a string.
   */
  setDateFrom(dateFrom: string): void {
    this.criteriaSubject.next({ ...this.criteriaSubject.value, dateFrom });
  }

  /**
   * Set the end date for the current filter range.
   * @param dateTo - End date as a string.
   */
  setDateTo(dateTo: string): void {
    this.criteriaSubject.next({ ...this.criteriaSubject.value, dateTo });
  }

  /**
   * Update the file size filter option.
   * @param size - Size category to apply.
   */
  setSize(size: 'all' | 'small' | 'medium' | 'large'): void {
    this.criteriaSubject.next({ ...this.criteriaSubject.value, size });
  }

  /**
   * Reset all search and filter criteria to default values.
   */
  resetFilters(): void {
    this.criteriaSubject.next({ ...DEFAULT_CRITERIA });
  }
}
