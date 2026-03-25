import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../services/auth/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { BackendResponse } from '../../../../shared/models/BackendResponse';
import { Router } from '@angular/router';
import { Verify } from '../../models/Verify';

@Component({
    selector: 'app-verify',
    imports: [FormsModule, CommonModule],
    templateUrl: './verify.component.html',
    styleUrl: './verify.component.css'
})
export class VerifyComponent {

    email:string =''

    constructor(private router: Router, private authService: AuthService) { }

    ngOnInit() {
        this.email = history.state.email;
        console.log(this.email);
    }

    verify(verificationDetails: Verify) {
        this.authService.verify(verificationDetails).subscribe({
            next: (res: BackendResponse) => {
                alert(res.message);
                this.router.navigate(['/home']);
            },

            error: (err: HttpErrorResponse) => {
                console.error('Error : ', err);
                alert(err?.error?.message);
            }
        });
    }
}
