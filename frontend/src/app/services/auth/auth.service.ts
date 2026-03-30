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

/**
 * Authentication service responsible for login, registration, token management, and password expiry state.
 */
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

    /**
     * Authenticate a user with email and password.
     * @param loginDetails - Credentials used for login.
     * @returns Observable that emits the login response.
     */
    login(loginDetails: LoginDetails): Observable<LoginResponse> {
        return this.http.post<LoginResponse>(this.url + '/login', loginDetails, {
            withCredentials: true
        }).pipe(
            tap((response) => this.updatePasswordExpiryFromResponse(response))
        );
    }

    /**
     * Register a new user account.
     * @param userDetails - User registration payload.
     * @returns Observable that emits the registration response.
     */
    register(userDetails: RegisterDetails): Observable<BackendResponse> {
        return this.http.post<BackendResponse>(this.url + '/register', userDetails, {
            withCredentials: true
        });
    }

    /**
     * Verify a user's account using a code from email.
     * @param verificationDetails - Verification payload containing code and email.
     * @returns Observable emitting the verification response.
     */
    verify(verificationDetails: Verify) {
        return this.http.post<BackendResponse>(this.url + '/verify', verificationDetails, {
            withCredentials: true
        });
    }

    /**
     * Clear local expiry state and end the current session.
     * @returns Observable emitting logout response.
     */
    logout() {
        this.clearPasswordExpiryInfo();
        return this.http.get<BackendResponse>(this.url + '/logout', {
            withCredentials: true
        });
    }

    /**
     * Fetch the current password expiry status from the backend.
     * @returns Observable emitting password expiry metadata or null.
     */
    getPasswordStatus(): Observable<PasswordExpiryInfo | null> {
        return this.http.get<{ success: boolean; passwordExpiry: PasswordExpiryInfo }>(this.url + '/status', {
            withCredentials: true
        }).pipe(
            tap((response) => {
                if (response.success) {
                    this.updatePasswordExpiryFromResponse(response);
                }
            }),
            map((response) => response.passwordExpiry),
            catchError(() => of(this.passwordExpirySubject.value))
        );
    }

    /**
     * Change the authenticated user's password.
     * @param currentPassword - Current password for validation.
     * @param newPassword - New password to set.
     * @returns Observable emitting the change password response.
     */
    changePassword(currentPassword: string, newPassword: string): Observable<ChangePasswordResponse> {
        return this.http.post<ChangePasswordResponse>(this.url + '/change-password', {
            currentPassword,
            newPassword
        }, {
            withCredentials: true
        }).pipe(
            tap((response) => this.updatePasswordExpiryFromResponse(response))
        );
    }

    /**
     * Update local password expiry state and persist to storage.
     * @param info - Latest password expiry metadata or null to clear.
     */
    setPasswordExpiryInfo(info: PasswordExpiryInfo | null): void {
        if (info) {
            this.passwordExpirySubject.next(info);
            localStorage.setItem(this.expiryStorageKey, JSON.stringify(info));
        } else {
            this.clearPasswordExpiryInfo();
        }
    }

    /**
     * Extract password expiry information from a backend response.
     * @param response - Response object that may contain passwordExpiry data.
     */
    private updatePasswordExpiryFromResponse(response: any): void {
        if (response && response.passwordExpiry) {
            this.setPasswordExpiryInfo(response.passwordExpiry);
        }
    }

    /**
     * Clear in-memory and persisted password expiry state.
     */
    clearPasswordExpiryInfo(): void {
        this.passwordExpirySubject.next(null);
        localStorage.removeItem(this.expiryStorageKey);
    }

    /**
     * Load password expiry state from local storage during service initialization.
     */
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
