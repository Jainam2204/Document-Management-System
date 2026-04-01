import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar.component';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../services/auth/auth.service';
import { ToastService } from '../../../../services/toast/toast.service';
import { Subscription } from 'rxjs';


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
    private toast: ToastService,
    private router: Router
  ) {}


  ngOnInit() {

    this.router.navigate(['/home']);
    this.expirySubscription = this.authService.passwordExpiry$.subscribe((status) => {
      if (status?.isPasswordNearExpiry && !status.isPasswordExpired && !this.hasShownExpiryWarning) {
        this.hasShownExpiryWarning = true;
        this.toast.warning(`Your password will expire in ${status.daysToExpire} day${status.daysToExpire === 1 ? '' : 's'}.`);
      }
    });

    console.log('hello');
  }

  ngOnDestroy(): void {
    this.expirySubscription?.unsubscribe();
  }
}


