import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar.component';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../services/auth/auth.service';
import { ToastService } from '../../../../services/toast/toast.service';
import { Subscription } from 'rxjs';

/**
 * Main layout wrapper component for authenticated user pages.
 * It renders the header, sidebar, and monitors password expiry warnings.
 */
@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, HeaderComponent, SidebarComponent, CommonModule],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.css']
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  sidebarCollapsed = false;
  private expirySubscription?: Subscription;
  private hasShownExpiryWarning = false;

  constructor(
    private authService: AuthService,
    private toast: ToastService
  ) {}

  /**
   * Subscribe to password expiry updates and display warnings as needed.
   */
  ngOnInit(): void {
    this.expirySubscription = this.authService.passwordExpiry$.subscribe((status) => {
      if (status?.isPasswordNearExpiry && !status.isPasswordExpired && !this.hasShownExpiryWarning) {
        this.hasShownExpiryWarning = true;
        this.toast.warning(`Your password will expire in ${status.daysToExpire} day${status.daysToExpire === 1 ? '' : 's'}.`);
      }
    });
  }

  /**
   * Clean up active subscriptions when the layout is destroyed.
   */
  ngOnDestroy(): void {
    this.expirySubscription?.unsubscribe();
  }
}


