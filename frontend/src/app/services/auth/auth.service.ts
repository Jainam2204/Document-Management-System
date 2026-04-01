import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { LoginDetails } from '../../modules/auth/models/LoginDetails';
import { LoginResponse } from '../../modules/auth/models/LoginResponse';
import { PasswordExpiryInfo } from '../../modules/auth/models/PasswordExpiryInfo';
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
    private readonly expiryStorageKey = 'passwordExpiryInfo';
    private readonly passwordExpirySubject = new BehaviorSubject<PasswordExpiryInfo | null>(null);
    passwordExpiry$ = this.passwordExpirySubject.asObservable();

    constructor(private http: HttpClient) {
        this.loadPasswordExpiryFromStorage();
    }

    get currentPasswordExpiry(): PasswordExpiryInfo | null {
        return this.passwordExpirySubject.value;
    }

 
    login(loginDetails: LoginDetails): Observable<LoginResponse> {
        return this.http.post<LoginResponse>(this.url + '/login', loginDetails, {
            withCredentials: true
        }).pipe(
            tap((response) => this.handlePasswordExpiry(response))
        );
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
        this.clearPasswordExpiryInfo();
        return this.http.get<BackendResponse>(this.url + '/logout', {
            withCredentials: true
        });
    }

    getPasswordStatus(): Observable<PasswordExpiryInfo | null> {
        return this.http.get<{ success: boolean; passwordExpiry: PasswordExpiryInfo }>(this.url + '/status', {
            withCredentials: true
        }).pipe(
            tap((response) => {
                if (response.success) {
                    this.handlePasswordExpiry(response);
                }
            }),
            map((response) => response.passwordExpiry),
            catchError(() => of(this.passwordExpirySubject.value))
        );
    }

   
    changePassword(currentPassword: string, newPassword: string): Observable<ChangePasswordResponse> {
        return this.http.post<ChangePasswordResponse>(this.url + '/change-password', {
            currentPassword,
            newPassword
        }, {
            withCredentials: true
        }).pipe(
            tap((response) => this.handlePasswordExpiry(response))
        );
    }

  
    setPasswordExpiryInfo(info: PasswordExpiryInfo | null): void {
        if (info) {
            this.passwordExpirySubject.next(info);
            localStorage.setItem(this.expiryStorageKey, JSON.stringify(info));
        } else {
            this.clearPasswordExpiryInfo();
        }
    }

  
    private handlePasswordExpiry(response: any): void {
        const expiryInfo = this.parsePasswordExpiry(response);
        this.setPasswordExpiryInfo(expiryInfo);
    }

  
    private parsePasswordExpiry(response: any): PasswordExpiryInfo | null {
        return response?.passwordExpiry ?? null;
    }

   
    clearPasswordExpiryInfo(): void {
        this.passwordExpirySubject.next(null);
        localStorage.removeItem(this.expiryStorageKey);
    }

    private loadPasswordExpiryFromStorage(): void {
        try {
            const stored = localStorage.getItem(this.expiryStorageKey);
            if (stored) {
                const parsed: PasswordExpiryInfo = JSON.parse(stored);
                this.passwordExpirySubject.next(parsed);
            }
        } catch {
            this.passwordExpirySubject.next(null);
        }
    }
}
