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

@Injectable({
  providedIn: 'root',
})
export class SearchFilterService {
  private readonly criteriaSubject = new BehaviorSubject<SearchFilterCriteria>({ ...DEFAULT_CRITERIA });
  readonly criteria$ = this.criteriaSubject.asObservable();

  private readonly searchTermSubject = new Subject<string>();
  readonly searchTermChanges$ = this.searchTermSubject.pipe(
    debounceTime(350),
    distinctUntilChanged()
  );


  get currentCriteria(): SearchFilterCriteria {
    return this.criteriaSubject.value;
  }


  setSearchTerm(searchTerm: string): void {
    const value = searchTerm.trim();
    this.criteriaSubject.next({ ...this.criteriaSubject.value, searchTerm: value });
    this.searchTermSubject.next(value);
  }

  
  setType(type: string): void {
    this.criteriaSubject.next({ ...this.criteriaSubject.value, type: type.trim() });
  }

  setDateFrom(dateFrom: string): void {
    this.criteriaSubject.next({ ...this.criteriaSubject.value, dateFrom });
  }


  setDateTo(dateTo: string): void {
    this.criteriaSubject.next({ ...this.criteriaSubject.value, dateTo });
  }

  setSize(size: 'all' | 'small' | 'medium' | 'large'): void {
    this.criteriaSubject.next({ ...this.criteriaSubject.value, size });
  }

  resetFilters(): void {
    this.criteriaSubject.next({ ...DEFAULT_CRITERIA });
  }
}
