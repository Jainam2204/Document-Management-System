import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RegisterDetails } from '../../models/RegisterDetails';
import { Router } from '@angular/router';
import { AuthService } from '../../../../services/auth/auth.service';
import { BackendResponse } from '../../../../shared/models/BackendResponse';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
    selector: 'app-register',
    imports: [FormsModule, CommonModule],
    templateUrl: './register.component.html',
    styleUrl: './register.component.css'
})
export class RegisterComponent {

    constructor(private router: Router, private authService: AuthService) { }


    register(userDetails: RegisterDetails) {
        this.authService.register(userDetails).subscribe({
            next: (res: BackendResponse) => {
                alert(res.message);
                this.router.navigate(['/auth/login']);
            },

            error: (err: HttpErrorResponse) => {
                console.error('Error : ', err);
                alert(err?.error?.message);
            }
        });
    }
}
