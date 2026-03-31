import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../services/auth/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { BackendResponse } from '../../../../shared/models/BackendResponse';
import { Router } from '@angular/router';
import { Verify } from '../../models/Verify';
import { ToastService } from '../../../../services/toast/toast.service';

@Component({
    selector: 'app-verify',
    imports: [FormsModule, CommonModule],
    templateUrl: './verify.component.html',
    styleUrls: ['./verify.component.css']
})
export class VerifyComponent {

    email:string =''

    constructor(
        private router: Router,
        private authService: AuthService,
        private toast: ToastService
    ) { }

    ngOnInit() {
        this.email = history.state.email;
        console.log(this.email);
    }

    verify(verificationDetails: Verify) {
        this.authService.verify(verificationDetails).subscribe({
            next: (res: BackendResponse) => {
                this.toast.success(res.message);
                this.router.navigate(['/home']);
            },

            error: (err: HttpErrorResponse) => {
                console.error('Error : ', err);
                this.toast.error(err?.error?.message);
            }
        });
    }
}


