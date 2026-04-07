import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { FileService } from '../file/file.service';

interface UserStorageResponse {
    success: boolean,
    storageUsed: number,
    storageLimit: number,
}

interface GenericResponse {
    success: boolean;
    message: string;
}

interface StorageState {
    storageUsed: number;
    storageLimit: number;
}

interface SearchUsersResponse {
    success: boolean;
    users: Array<{ name: string; email: string }>;
}

interface ActivityLogItem {
    _id: string;
    action: string;
    label: string;
    resourceName: string | null;
    timestamp: string;
}

interface RecentLogsResponse {
    success: boolean;
    logs: ActivityLogItem[];
}

@Injectable({
    providedIn: 'root'
})
export class UserService {

    url = environment.API_URL;

    constructor(private http: HttpClient, private fileService: FileService) {}

    getStorageInfo(): Observable<UserStorageResponse | GenericResponse> {
        return this.http.get<UserStorageResponse | GenericResponse>(this.url + '/users/used-storage');
    }

    searchUsers(query: string): Observable<SearchUsersResponse> {
        return this.http.get<SearchUsersResponse>(this.url + '/users/search', {
            params: { q: query }
        });
    }

    getRecentLogs(): Observable<RecentLogsResponse> {
        return this.http.get<RecentLogsResponse>(this.url + '/users/recent-logs');
    }
}
