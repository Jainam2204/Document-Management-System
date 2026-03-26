import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { LoginResponse } from '../../../modules/auth/models/LoginResponse';
import { environment } from '../../../../environments/environment.development';
import { GetCookieService } from '../../../services/cookie/get-cookie.service';

export const generateTokenInterceptor: HttpInterceptorFn = (req, next) => {
    const http = inject(HttpClient);
    const router = inject(Router);
    const cookieService = inject(GetCookieService);

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {

            if (error.status === 401 && !req.url.includes('/auth/generate-token')) {
                return http.post<LoginResponse>(environment.API_URL + '/auth/generate-access-token', null, { withCredentials: true }).pipe(
                    switchMap((res: LoginResponse) => {
                        let newToken: string | null = '';
                        if (res.success) {
                            newToken = cookieService.getCookie('accessToken');
                        }
                        const newReq = req.clone({
                            setHeaders: {
                                'x-access-token': newToken!
                            }
                        });

                        return next(newReq);
                    }),
                    catchError((error: HttpErrorResponse) => {
                        if (error.status === 401) {
                            alert('Please login again');
                            router.navigate(['auth/login']);
                        }
                        return throwError(() => error)
                    })
                );
            }

            return throwError(() => error)
        })
    );
};
