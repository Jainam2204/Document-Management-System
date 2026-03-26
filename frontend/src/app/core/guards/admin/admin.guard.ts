import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { GetCookieService } from '../../../services/cookie/get-cookie.service';

export const adminGuard: CanActivateFn = (route, state) => {
    return true;
};
