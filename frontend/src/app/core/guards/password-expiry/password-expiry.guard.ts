import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../../../services/auth/auth.service';
import { ToastService } from '../../../services/toast/toast.service';
import { catchError, map, of, switchMap, take } from 'rxjs';


export const passwordExpiryGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  const redirectToLogin = (): boolean => {
    router.navigate(['/auth/login']);
    return false;
  };

  const redirectToReset = (): boolean => {
    toast.error('Your password has expired. Please reset it to continue.');
    router.navigate(['/auth/reset-password']);
    return false;
  };

  return authService.passwordExpiry$.pipe(
    take(1),
    switchMap((status) => status ? of(status) : authService.getPasswordStatus()),
    map((status) => {
      if (!status) {
        return redirectToLogin();
      }

      if (status.isPasswordExpired) {
        return redirectToReset();
      }

      return true;
    }),
    catchError(() => of(redirectToLogin()))
  );
};
