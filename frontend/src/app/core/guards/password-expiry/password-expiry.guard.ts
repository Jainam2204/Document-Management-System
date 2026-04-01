import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../../../services/auth/auth.service';
import { ToastService } from '../../../services/toast/toast.service';

export const passwordExpiryGuard: CanActivateFn = (route, state) => {

    const authService = inject(AuthService);
    const router = inject(Router);
    const toast = inject(ToastService);

    if (authService.isPasswordExpired()) {
        toast.error('Your password has expired. Please reset it to continue.');
        router.navigate(['/auth/reset-password']);
        return false;
    }

    return true;
};
