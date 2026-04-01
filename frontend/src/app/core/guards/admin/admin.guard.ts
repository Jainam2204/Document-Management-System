import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../../services/auth/auth.service';
import { ToastService } from '../../../services/toast/toast.service';


export const adminGuard: CanActivateFn = (route, state) => {

    const authService = inject(AuthService);
    const router = inject(Router);
    const toast = inject(ToastService);

    if (!authService.isAdmin()) {
        toast.error('Access denied. Admins only.');
        router.navigate(['/home']);
        return false;
    }

    return true;
};
