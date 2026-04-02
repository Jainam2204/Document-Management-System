import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { LoginDetails } from '../../modules/auth/models/LoginDetails';
import { LoginResponse } from '../../modules/auth/models/LoginResponse';
import { ChangePasswordResponse } from '../../modules/auth/models/ChangePasswordResponse';
import { environment } from '../../../environments/environment.development';
import { RegisterDetails } from '../../modules/auth/models/RegisterDetails';
import { BackendResponse } from '../../shared/models/BackendResponse';
import { Verify } from '../../modules/auth/models/Verify';


@Injectable({
    providedIn: 'root'
})
export class AuthService {

    url: string = environment.API_URL + '/auth';

    private readonly KEY_LAST_UPDATED = 'passwordLastUpdatedAt';
    private readonly KEY_EXPIRY_DAYS = 'expiryDays';
    private readonly KEY_IS_ADMIN = 'isAdmin';

    constructor(private http: HttpClient) { }


    login(loginDetails: LoginDetails): Observable<LoginResponse> {
        return this.http.post<LoginResponse>(this.url + '/login', loginDetails, {
            withCredentials: true
        });
    }

    register(userDetails: RegisterDetails): Observable<BackendResponse> {
        return this.http.post<BackendResponse>(this.url + '/register', userDetails, {
            withCredentials: true
        });
    }

    verify(verificationDetails: Verify) {
        return this.http.post<BackendResponse>(this.url + '/verify', verificationDetails, {
            withCredentials: true
        });
    }


    logout() {
        this.clearExpiryInfo();

        return this.http.get<BackendResponse>(this.url + '/logout', {
            withCredentials: true
        });
    }


    changePassword(currentPassword: string, newPassword: string): Observable<ChangePasswordResponse> {
        return this.http.post<ChangePasswordResponse>(this.url + '/change-password', {
            currentPassword,
            newPassword
        }, {
            withCredentials: true
        });
    }


    saveExpiryInfo(passwordLastUpdatedAt: string, expiryDays: number)  {
        localStorage.setItem(this.KEY_LAST_UPDATED, passwordLastUpdatedAt);
        localStorage.setItem(this.KEY_EXPIRY_DAYS, String(expiryDays));
    }


    saveAdminStatus(isAdminValue: boolean)  {
        localStorage.setItem(this.KEY_IS_ADMIN, String(isAdminValue));
    }


    isAdmin(): boolean {
        const value = localStorage.getItem(this.KEY_IS_ADMIN);
        return value === 'true';
    }

    isPasswordExpired(): boolean {
        const lastUpdatedStr = localStorage.getItem(this.KEY_LAST_UPDATED);
        const expiryDaysStr = localStorage.getItem(this.KEY_EXPIRY_DAYS);

        if (!lastUpdatedStr || !expiryDaysStr) {
            return false;
        }

        const lastUpdatedDate = new Date(lastUpdatedStr);

        const expiryDays = Number(expiryDaysStr);

        const today = new Date();

        const MS_PER_DAY = 1000 * 60 * 60 * 24;
        const daysPassed = (today.getTime() - lastUpdatedDate.getTime()) / MS_PER_DAY;

        return daysPassed > expiryDays;
    }


    clearExpiryInfo()  {
        localStorage.removeItem(this.KEY_LAST_UPDATED);
        localStorage.removeItem(this.KEY_EXPIRY_DAYS);
        localStorage.removeItem(this.KEY_IS_ADMIN); 
    }
}
