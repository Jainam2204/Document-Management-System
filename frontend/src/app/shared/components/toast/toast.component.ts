import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { Toast, ToastService } from '../../../services/toast/toast.service';

@Component({
  selector: 'app-toast',
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css'
})
export class ToastComponent implements OnInit, OnDestroy {
  toasts: Toast[] = [];
  private subs = new Subscription();
  private timers = new Map<number, ReturnType<typeof setTimeout>>();

  constructor(private toastService: ToastService) {}

  ngOnInit() {
    this.subs.add(
      this.toastService.toasts$.subscribe((toast: Toast) => {
        this.toasts.push(toast);
        const timer = setTimeout(() => this.remove(toast.id), toast.duration);
        this.timers.set(toast.id, timer);
      })
    );
    this.subs.add(
      this.toastService.dismiss$.subscribe((id: number) => this.remove(id))
    );
  }

  remove(id: number) {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.toasts = this.toasts.filter(t => t.id !== id);
  }

  getIcon(type: string): string {
    switch (type) {
      case 'success': return '✓';
      case 'warning': return '⚠';
      case 'error':   return '✕';
      default:        return 'ℹ';
    }
  }

  trackById(_index: number, toast: Toast): number {
    return toast.id;
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
    this.timers.forEach(t => clearTimeout(t));
  }
}
