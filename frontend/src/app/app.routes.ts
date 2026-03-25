import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: 'auth',
        // component: AuthLayoutComponent,
        // canActivate: [unauthGuard],
        children: [
            {
                path: '',
                loadChildren: () => import ('./modules/auth/auth-routing.module').then(m => m.AuthRoutingModule)
            },
        ]
    },
    {
        path: '',
        // component: AuthLayoutComponent,
        // canActivate: [unauthGuard],
        children: [
            {
                path: '',
                loadChildren: () => import ('./modules/user/user-routing.module').then(m => m.UserRoutingModule)
            },
        ]
    },
];
