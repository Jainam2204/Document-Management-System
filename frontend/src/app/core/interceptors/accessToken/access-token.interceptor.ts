import { HttpInterceptorFn } from '@angular/common/http';
import { GetCookieService } from '../../../services/cookie/get-cookie.service';
import { inject } from '@angular/core';

export const accessTokenInterceptor: HttpInterceptorFn = (req, next) => {
    const cookieService = inject(GetCookieService);
    const token = cookieService.getCookie('accessToken');

    if (token) {
        const newRequest = req.clone({
            setHeaders: {
                'x-access-token': token
            }
        });
        return next(newRequest);
    }

    return next(req);
};
