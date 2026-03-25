import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { LoginDetails } from '../../modules/auth/models/LoginDetails';
import { Observable } from 'rxjs';
import { LoginResponse } from '../../modules/auth/models/LoginResponse';
import { environment } from '../../../environments/environment.development';
import { RegisterDetails } from '../../modules/auth/models/RegisterDetails';
import { BackendResponse } from '../../shared/models/BackendResponse';
import { Verify } from '../../modules/auth/models/Verify';

@Injectable({
    providedIn: 'root'
})
export class AuthService {

    url: string = environment.API_URL + '/auth'
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
}

/*

user = new User({ name, email, password: hashedPassword, verificationCode, skillsHave, skillsWant });
  await user.save();

  await sendEmail(email, "Verify Your Email", `Your verification code is: ${verificationCode}`);

  return user;

*/
