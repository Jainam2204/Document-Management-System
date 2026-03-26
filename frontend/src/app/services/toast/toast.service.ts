import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type ToastType = 'success' | 'warning' | 'error';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toasts$ = new Subject<Toast>();
  private _dismiss$ = new Subject<number>();
  private _counter = 0;

  toasts$ = this._toasts$.asObservable();
  dismiss$ = this._dismiss$.asObservable();

  success(message: string, duration = 4000): void {
    this.show(message, 'success', duration);
  }

  warning(message: string, duration = 5000): void {
    this.show(message, 'warning', duration);
  }

  error(message: string, duration = 6000): void {
    this.show(message, 'error', duration);
  }

  dismiss(id: number): void {
    this._dismiss$.next(id);
  }

  private show(message: string, type: ToastType, duration: number): void {
    this._toasts$.next({ id: ++this._counter, message, type, duration });
  }
}
