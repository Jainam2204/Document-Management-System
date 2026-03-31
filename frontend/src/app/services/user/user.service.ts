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

@Injectable({
    providedIn: 'root'
})
export class UserService {

    url = environment.API_URL;
    // Store the current storage state in a BehaviorSubject so the sidebar
    // and other components can subscribe and receive immediate updates.
    private readonly storageSubject = new BehaviorSubject<StorageState>({ storageUsed: 0, storageLimit: 0 });
    readonly storage$ = this.storageSubject.asObservable();

    constructor(private http: HttpClient, private fileService: FileService) {
        // When any upload/delete action emits the fileUploaded$ event, refresh
        // storage data from the API and emit the new state.
        this.fileService.fileUploaded$.subscribe(() => {
            this.refreshStorageInfo();
        });
    }

    /**
     * HTTP request to retrieve storage usage from the backend.
     */
    getStorageInfo(): Observable<UserStorageResponse | GenericResponse> {
        return this.http.get<UserStorageResponse | GenericResponse>(this.url + '/users/used-storage');
    }

    /**
     * Refresh publicly shared storage state and emit updates to subscribers.
     * Calls the backend storage API and updates the BehaviorSubject on success.
     */
    refreshStorageInfo(): void {
        this.getStorageInfo().subscribe((res) => {
            if ('success' in res && res.success && 'storageUsed' in res && 'storageLimit' in res) {
                this.storageSubject.next({
                    storageUsed: res.storageUsed,
                    storageLimit: res.storageLimit,
                });
            }
        }, (error) => {
            console.error('Unable to refresh storage info:', error);
        });
    }
}
