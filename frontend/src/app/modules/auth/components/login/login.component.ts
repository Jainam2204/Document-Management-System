import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { LoginDetails } from '../../models/LoginDetails';
import { LoginResponse } from '../../models/LoginResponse';
import { AuthService } from '../../../../services/auth/auth.service';
import { ToastService } from '../../../../services/toast/toast.service';


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

    
    login(loginDetails: LoginDetails) {
        this.authService.login(loginDetails).subscribe({
            next: (res: LoginResponse) => {
                this.toast.success(res.message);
                this.handleLoginResponse(res);
            },
            error: (err: HttpErrorResponse) => {
                console.error('Error : ', err);
                this.errorMsg = err?.error?.message;
            }
        });
    }

    
    private handleLoginResponse(response: LoginResponse): void {
        if (this.isPasswordExpired(response)) {
            this.router.navigate(['/auth/reset-password']);
            return;
        }

        if (this.isPasswordNearExpiry(response)) {
            this.showExpiryWarning(this.daysToExpire(response));
        }

        this.router.navigate(['/home']);
    }

    
    private isPasswordExpired(response: LoginResponse): boolean {
        return response.success === true && !!response.passwordExpiry?.isPasswordExpired;
    }

    private isPasswordNearExpiry(response: LoginResponse): boolean {
        return response.success === true && !!response.passwordExpiry?.isPasswordNearExpiry;
    }

    private daysToExpire(response: LoginResponse): number {
        return response.success === true ? response.passwordExpiry?.daysToExpire ?? 0 : 0;
    }

    private showExpiryWarning(daysRemaining: number): void {
        const unit = daysRemaining === 1 ? '' : 's';
        this.toast.warning(`Your password will expire in ${daysRemaining} day${unit}.`);
    }
}


