import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { GetCookieService } from '../../../services/cookie/get-cookie.service';
import { ToastService } from '../../../services/toast/toast.service';
// import { LoginResponse } from '../../../modules/auth/models/LoginResponse';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const http = inject(HttpClient);
    const router = inject(Router);
    const cookieService = inject(GetCookieService);
    const toast = inject(ToastService);

    const isApiRequest = req.url.startsWith(environment.API_URL);
    const token = cookieService.getCookie('accessToken');

    let authReq = req;

    if (isApiRequest) {
        authReq = req.clone({
            withCredentials: true,
            setHeaders: token ? { 'x-access-token': token } : {}
        });
    }

    return next(authReq).pipe(
        catchError((error: HttpErrorResponse) => {
            if (
                error.status === 401 &&
                isApiRequest &&
                !req.url.includes('/auth/generate-access-token')
            ) {
                return http.post<any>(
                    environment.API_URL + '/auth/generate-access-token',
                    null,
                    { withCredentials: true }
                ).pipe(
                    switchMap((res: any) => {

                        let newToken: string | null = '';

                        if(res.success){
                            newToken = res.accessToken || cookieService.getCookie('accessToken');
                        }

                        if (!newToken) {
                            return throwError(() => new Error('Token not found'));
                        }

                        const retryReq = req.clone({
                            withCredentials: true,
                            setHeaders: {
                                'x-access-token': newToken
                            }
                        });                 

                        return next(retryReq);
                    }),
                    catchError((err: HttpErrorResponse) => {
                        if (err.status === 401) {
                            toast.error('Please login again.....');
                            router.navigate(['/auth/login']);
                        }
                        return throwError(() => err);
                    })
                );
            }

            return throwError(() => error);
        })
    );
};
