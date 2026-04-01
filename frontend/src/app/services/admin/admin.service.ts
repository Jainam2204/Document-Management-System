import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { User } from '../../modules/admin/models/User';


interface GetAllUsersResponse {
    success: boolean;
    users: User[];
}

interface UpdateRoleResponse {
    success: boolean;
    message: string;
}


@Injectable({
    providedIn: 'root'
})
export class AdminService {

    url = environment.API_URL + '/users';

    constructor(private http: HttpClient) { }


    getAllUsers(): Observable<GetAllUsersResponse> {
        return this.http.get<GetAllUsersResponse>(this.url + '/all');
    }

    updateUserRole(userId: number, isAdmin: boolean): Observable<UpdateRoleResponse> {
        return this.http.put<UpdateRoleResponse>(
            `${this.url}/role/${userId}`,
            { isAdmin: isAdmin }
        );
    }
}
