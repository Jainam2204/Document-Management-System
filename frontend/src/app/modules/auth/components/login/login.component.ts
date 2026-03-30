import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { LoginDetails } from '../../models/LoginDetails';
import { LoginResponse } from '../../models/LoginResponse';
import { AuthService } from '../../../../services/auth/auth.service';
import { ToastService } from '../../../../services/toast/toast.service';

/**
 * User login component.
 * Handles credential submission, authentication response processing, and password expiry redirection.
 */
@Component({
  selector: 'app-login',
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
errorMsg: string = '';
    constructor(
        private router: Router, 
        private authService: AuthService,
        private toast: ToastService
    ) { }

    /**
     * Submit login credentials and handle authentication feedback.
     * @param loginDetails - User credentials from the login form.
     */
    login(loginDetails: LoginDetails) {
        this.authService.login(loginDetails).subscribe({
            next: (res: LoginResponse) => {
                this.toast.success(res.message);

                // Redirect immediately if the password is already expired.
                if ('passwordExpiry' in res && res.passwordExpiry?.isPasswordExpired) {
                    this.router.navigate(['/auth/reset-password']);
                    return;
                }

                if ('passwordExpiry' in res && res.passwordExpiry?.isPasswordNearExpiry) {
                    this.toast.warning(`Your password will expire in ${res.passwordExpiry.daysToExpire} day${res.passwordExpiry.daysToExpire === 1 ? '' : 's'}.`);
                }

                this.router.navigate(['/home']);
            },

            error: (err: HttpErrorResponse) => {
                console.error('Error : ', err);
                this.errorMsg = err?.error?.message;
            }
        });
    }
}


