import { CanActivateFn, Router } from '@angular/router';
import { GetCookieService } from '../../../services/cookie/get-cookie.service';
import { inject } from '@angular/core';

export const unauthGuard: CanActivateFn = (route, state) => {
    const cookieService = inject(GetCookieService);
    const router = inject(Router);

    const refreshToken = cookieService.getCookie('refreshToken');

    if (refreshToken) {
        router.navigate(['/home']);
        return false;
    }

    return true;
};
