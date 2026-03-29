import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class RouteHelperService {

  constructor(private router: Router) {}

  getParentFolderIdFromUrl(): string | null {
    const url = this.router.url;
    const match = url.match(/\/home\/([^\/]+)/);
    return match ? match[1] : null;
  }
}