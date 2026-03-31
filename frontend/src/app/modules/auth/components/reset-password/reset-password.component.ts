import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../services/auth/auth.service';
import { ToastService } from '../../../../services/toast/toast.service';

@Component({
  selector: 'app-reset-password',
  imports: [CommonModule, FormsModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent {
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  errorMessage = '';
  loading = false;

  constructor(
    private authService: AuthService,
    private toast: ToastService,
    private router: Router
  ) {}

  submit() {
    this.errorMessage = '';

    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.errorMessage = 'All fields are required.';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'New password and confirmation must match.';
      return;
    }

    if (this.newPassword === this.currentPassword) {
      this.errorMessage = 'New password must be different from the current password.';
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(this.newPassword)) {
      this.errorMessage = 'New password must be at least 8 characters and include uppercase, lowercase, and a number.';
      return;
    }

    this.loading = true;

    this.authService.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: (response) => {
        this.loading = false;
        if (response && 'success' in response && response.success) {
          this.toast.success(response.message);
          this.router.navigate(['/home']);
        } else {
          this.errorMessage = response?.message || 'Unable to change password.';
        }
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error?.error?.message || 'Unable to change password.';
      }
    });
  }
}
