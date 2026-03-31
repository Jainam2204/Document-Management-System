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

  /**
   * Initialize ResetPasswordComponent with required services.
   */
  constructor(
    private authService: AuthService,
    private toast: ToastService,
    private router: Router
  ) {}

  /**
   * Submit password reset request after validating the form.
   */
  submit() {
    this.resetError();

    if (!this.isFormComplete()) {
      this.errorMessage = 'All fields are required.';
      return;
    }

    if (!this.isNewPasswordDifferent()) {
      this.errorMessage = 'New password must be different from the current password.';
      return;
    }

    if (!this.doPasswordsMatch()) {
      this.errorMessage = 'New password and confirmation must match.';
      return;
    }

    if (!this.isPasswordMatchPttern(this.newPassword)) {
      this.errorMessage = 'Password must contain one uppercase letter, one lowercase letter, one digit, one special character and be 6-14 characters long.';
      return;
    }

    this.loading = true;
    this.authService.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.toast.success(response.message);
          this.router.navigate(['/home']);
        } else {
          this.errorMessage = response.message || 'Unable to change password.';
        }
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error?.error?.message || 'Unable to change password.';
      }
    });
  }

  /**
   * Check whether all required form fields are filled.
   */
  private isFormComplete(): boolean {
    return !!this.currentPassword && !!this.newPassword && !!this.confirmPassword;
  }

  /**
   * Check that the new password differs from the current password.
   */
  private isNewPasswordDifferent(): boolean {
    return this.newPassword !== this.currentPassword;
  }

  /**
   * Confirm new password and confirmation fields match.
   */
  private doPasswordsMatch(): boolean {
    return this.newPassword === this.confirmPassword;
  }

  /**
   * Enforce a simple password strength rule.
   */
  private isPasswordMatchPttern(password: string): boolean {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,14}$/;
    return passwordRegex.test(password);
  }

  /**
   * Clear any previous error message.
   */
  private resetError(): void {
    this.errorMessage = '';
  }
}
