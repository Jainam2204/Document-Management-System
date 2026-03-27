import { Routes } from '@angular/router';
import { MainLayoutComponent } from './modules/user/components/main-layout/main-layout.component';
import { unauthGuard } from './core/guards/unauth/unauth.guard';
import { authGuard } from './core/guards/auth/auth.guard';

export const routes: Routes = [
    {
        path: 'auth',
        canActivate: [unauthGuard],
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
        children: [
            {
                path: '',
                loadChildren: () => import('./modules/user/user-routing.module').then(m => m.UserRoutingModule)
            },
        ]
    },
];
