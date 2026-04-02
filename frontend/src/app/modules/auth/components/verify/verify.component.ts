import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../services/auth/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { BackendResponse } from '../../../../shared/models/BackendResponse';
import { Router } from '@angular/router';
import { Verify } from '../../models/Verify';
import { ToastService } from '../../../../services/toast/toast.service';
import { VerifyResponse } from '../../models/VerifyResponse';

@Component({
    selector: 'app-verify',
    imports: [FormsModule, CommonModule],
    templateUrl: './verify.component.html',
    styleUrls: ['./verify.component.css']
})
export class VerifyComponent {

    email: string = '';

    constructor(
        private router: Router,
        private authService: AuthService,
        private toast: ToastService
    ) {}

    ngOnInit() {
        const navigation = this.router.getCurrentNavigation();

        this.email =
            navigation?.extras?.state?.['email'] ||
            history.state?.email ||
            localStorage.getItem('email') ||
            '';

        console.log('Email:', this.email);
        this.email = history.state.email;
        console.log(this.email);
    }

    verify(verificationDetails: Verify) {
        this.authService.verify(verificationDetails).subscribe({
            next: (res: BackendResponse) => {
                if (res.success) {
                    this.toast.success(res.message);
                    this.handleVerifyResponse(res);
                }
            },

            error: (err: HttpErrorResponse) => {
                console.error('Error : ', err);
                this.toast.error(err?.error?.message);
            }
        });
    }


    private handleVerifyResponse(res: VerifyResponse) {

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


