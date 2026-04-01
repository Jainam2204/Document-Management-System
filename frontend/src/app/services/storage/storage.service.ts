import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { UserService } from '../user/user.service';

export interface StorageInfo {
    storageUsed: number;
    storageLimit: number;
}

@Injectable({
    providedIn: 'root'
})
export class StorageService {

    private storageSubject = new BehaviorSubject<StorageInfo>({
        storageUsed: 0,
        storageLimit: 0
    });

    storage$: Observable<StorageInfo> = this.storageSubject.asObservable();

    private isLoading = false;

    constructor(private userService: UserService) { }

    getStorageValue(): StorageInfo {
        return this.storageSubject.value;
    }

    setStorage(value: StorageInfo): void {
        this.storageSubject.next(value);
    }

    refreshStorage() {
        if (this.isLoading) return;

        this.isLoading = true;

        this.userService.getStorageInfo().subscribe({
            next: (res: any) => {
                if (res?.success && res?.storageUsed !== undefined && res?.storageLimit !== undefined) {
                    this.storageSubject.next({
                        storageUsed: res.storageUsed,
                        storageLimit: res.storageLimit
                    });
                } else {
                    console.warn('Invalid storage response:', res);
                }

                this.isLoading = false;
            },
            error: (error) => {
                console.error('Unable to refresh storage info:', error);
                this.isLoading = false;
            }
        });
    }
}
