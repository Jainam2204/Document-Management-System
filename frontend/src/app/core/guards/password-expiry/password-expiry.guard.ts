import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../../../services/auth/auth.service';
import { ToastService } from '../../../services/toast/toast.service';
import { catchError, map, of, switchMap, take } from 'rxjs';

/**
 * Guard that blocks navigation when the user's password has expired.
 * It also checks password expiry status and redirects unauthenticated users.
 */
export const passwordExpiryGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  return authService.passwordExpiry$.pipe(
    take(1),
    switchMap((status) => {
      if (status) {
        return of(status);
      }
      return authService.getPasswordStatus();
    }),
    map((status) => {
      if (!status) {
        router.navigate(['/auth/login']);
        return false;
      }

      if (status.isPasswordExpired) {
        toast.error('Your password has expired. Please reset it to continue.');
        router.navigate(['/auth/reset-password']);
        return false;
      }
      return true;
    }),
    catchError(() => {
      router.navigate(['/auth/login']);
      return of(false);
    })
  );
};
