import { Routes } from '@angular/router';
import { MainLayoutComponent } from './modules/user/components/main-layout/main-layout.component';
import { unauthGuard } from './core/guards/unauth/unauth.guard';
import { authGuard } from './core/guards/auth/auth.guard';
import { passwordExpiryGuard } from './core/guards/password-expiry/password-expiry.guard';

export const routes: Routes = [
    {
        path: 'auth',
        children: [
            {
                path: '',
                loadChildren: () => import('./modules/auth/auth-routing.module').then(m => m.AuthRoutingModule)
            },
        ]
    },
    {
        path: '',
        component: MainLayoutComponent,
        canActivate: [authGuard],
        canActivateChild: [passwordExpiryGuard],
        children: [
            {
                path: '',
                loadChildren: () => import('./modules/user/user-routing.module').then(m => m.UserRoutingModule)
            },
        ]
    },
];
