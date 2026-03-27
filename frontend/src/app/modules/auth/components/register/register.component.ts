import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RegisterDetails } from '../../models/RegisterDetails';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../services/auth/auth.service';
import { BackendResponse } from '../../../../shared/models/BackendResponse';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastService } from '../../../../services/toast/toast.service';

@Component({
    selector: 'app-register',
    imports: [FormsModule, CommonModule, RouterModule],
    templateUrl: './register.component.html',
    styleUrl: './register.component.css'
})
export class RegisterComponent {

    constructor(
        private router: Router,
        private authService: AuthService,
        private toast: ToastService
    ) { }


    register(userDetails: RegisterDetails) {
        this.authService.register(userDetails).subscribe({
            next: (res: BackendResponse) => {
                this.toast.success(res.message);
                this.router.navigate(['/auth/login']);
            },

            error: (err: HttpErrorResponse) => {
                console.error('Error : ', err);
                this.toast.error(err?.error?.message);
            }
        });
    }
}
