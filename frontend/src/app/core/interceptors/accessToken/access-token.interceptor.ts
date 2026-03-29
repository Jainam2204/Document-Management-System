import { HttpInterceptorFn } from '@angular/common/http';
import { GetCookieService } from '../../../services/cookie/get-cookie.service';
import { inject } from '@angular/core';
import { environment } from '../../../../environments/environment.development';

export const accessTokenInterceptor: HttpInterceptorFn = (req, next) => {
    const cookieService = inject(GetCookieService);
    const token = cookieService.getCookie('accessToken');
    const isApiRequest = req.url.startsWith(environment.API_URL);

    if (!isApiRequest) {
        return next(req);
    }

    let newRequest = req.clone({ withCredentials: true });

    if (token) {
        newRequest = newRequest.clone({
            setHeaders: {
                'x-access-token': token,
            }
        });
    }

    return next(newRequest);
};
