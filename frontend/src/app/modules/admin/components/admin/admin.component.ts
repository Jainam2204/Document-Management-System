import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { User } from '../../models/User';
import { AdminService } from '../../../../services/admin/admin.service';
import { AuthService } from '../../../../services/auth/auth.service';
import { ToastService } from '../../../../services/toast/toast.service';
import { SizePipe } from '../../../../shared/pipes/size/size.pipe';
import { HttpErrorResponse } from '@angular/common/http';


@Component({
    selector: 'app-admin',
    imports: [CommonModule, SizePipe],
    templateUrl: './admin.component.html',
    styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {

    users: User[] = [];

    loading: boolean = false;

    errorMessage: string = '';

    constructor(
        private adminService: AdminService,
        private authService: AuthService,
        private toast: ToastService,
        private router: Router
    ) { }

    ngOnInit()  {
        this.loadUsers();
    }

    loadUsers()  {
        this.loading = true;
        this.errorMessage = '';

        this.adminService.getAllUsers().subscribe({
            next: (response) => {
                this.loading = false;

                if (response.success) {
                    this.users = response.users;
                } else {
                    this.errorMessage = 'Failed to load users.';
                }
            },
            error: (error) => {
                this.loading = false;
                this.errorMessage = error?.error?.message || 'Failed to load users.';
            }
        });
    }


    toggleAdmin(user: User, event: Event)  {
        const checkbox = event.target as HTMLInputElement;
        const newIsAdmin = checkbox.checked;

        this.adminService.updateUserRole(user.id, newIsAdmin).subscribe({
            next: (response) => {
                if (response.success) {
                    user.isAdmin = newIsAdmin;
                    this.toast.success(response.message);
                } else {
                    checkbox.checked = !newIsAdmin;
                    this.toast.error(response.message || 'Failed to update role.');
                }
            },
            error: (error) => {
                checkbox.checked = !newIsAdmin;
                this.toast.error(error?.error?.message || 'Failed to update role.');
            }
        });
    }


    logout()  {
        this.authService.logout().subscribe({
            next: (res) => {
                this.toast.success(res.message);
                this.router.navigate(['/auth/login']);
            },
            error: (err: HttpErrorResponse) => {
                this.toast.error(err?.error?.message);
                this.router.navigate(['/auth/login']);
            }
        });
    }
}
