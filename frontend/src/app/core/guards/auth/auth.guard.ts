import { CanActivateFn, Router } from '@angular/router';
import { GetCookieService } from '../../../services/cookie/get-cookie.service';
import { inject } from '@angular/core';
import { ToastService } from '../../../services/toast/toast.service';

export const authGuard: CanActivateFn = (route, state) => {
	const cookieService = inject(GetCookieService);
	const router = inject(Router);
	const toast = inject(ToastService);

	const refreshToken = cookieService.getCookie('refreshToken');

	if (!refreshToken) {
		toast.error('Please Login');
		router.navigate(['/auth/login']);
		return false;
	}

	return true;
};
