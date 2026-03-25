import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { LoginDetails } from '../../models/LoginDetails';
import { LoginResponse } from '../../models/LoginResponse';
import { AuthService } from '../../../../services/auth/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
errorMsg: string = '';
    constructor(private router: Router, private authService: AuthService) { }

    login(loginDetails: LoginDetails) {
        this.authService.login(loginDetails).subscribe({
            next: (res: LoginResponse) => {
                alert(res.message);
				this.router.navigate(['/home']);
				// this.router.navigate(['/auth/verify'], { state: { email: loginDetails.email } });
            },

            error: (err: HttpErrorResponse) => {
                console.error('Error : ', err);
                this.errorMsg = err?.error?.message;
            }
        });
    }
}
