import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { HttpClient } from '@angular/common/http';

interface UserStorageResponse {
    success: boolean,
    storageUsed: number,
    storageLimit: number,
}

interface GenericResponse {
    success: boolean;
    message: string;
}

@Injectable({
    providedIn: 'root'
})
export class UserService {

    url = environment.API_URL;

    constructor(private http: HttpClient) { }

    getStorageInfo(): Observable<UserStorageResponse | GenericResponse> {
        return this.http.get<UserStorageResponse | GenericResponse>(this.url + '/users/used-storage');
    }
}
