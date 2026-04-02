import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { LoginDetails } from '../../models/LoginDetails';
import { AuthService } from '../../../../services/auth/auth.service';
import { ToastService } from '../../../../services/toast/toast.service';
import { BackendResponse } from '../../../../shared/models/BackendResponse';


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
        if (!loginDetails?.email) {
            this.toast.error("Email is required");
            return;
        }
        loginDetails.email = loginDetails.email.trim();
        
        this.authService.login(loginDetails).subscribe({
            next: (res: BackendResponse) => {
                if (res.success) {
                    this.toast.success(res.message);
                    localStorage.removeItem('email');
                    localStorage.setItem('email', loginDetails.email);
                    this.router.navigate(['/auth/verify'], {
                        state: { email: loginDetails.email }
                    });
                }
            },
            error: (err: HttpErrorResponse) => {
                console.error('Error : ', err);
                this.errorMsg = err?.error?.message;
            }
        });
    }
}