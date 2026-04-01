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


   
    private handleLoginResponse(res: LoginResponse): void {
       
        if (res.success && res.passwordLastUpdatedAt && res.expiryDays) {
            this.authService.saveExpiryInfo(res.passwordLastUpdatedAt, res.expiryDays);
        }

        this.authService.saveAdminStatus(res.success ? (res.isAdmin ?? false) : false);

        if (this.authService.isPasswordExpired()) {
            this.router.navigate(['/auth/reset-password']);
            return;
        }

        if (this.authService.isAdmin()) {
            this.router.navigate(['/admin']);
            return;
        }

        this.router.navigate(['/home']);
    }
}
