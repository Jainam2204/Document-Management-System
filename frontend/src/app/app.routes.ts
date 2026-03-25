import { Routes } from '@angular/router';
import { MainLayoutComponent } from './modules/user/main-layout.component';

export const routes: Routes = [
    {
        path: 'auth',
        // No layout wrapper — auth pages render without header/sidebar
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
        children: [
            {
                path: '',
                loadChildren: () => import('./modules/user/user-routing.module').then(m => m.UserRoutingModule)
            },
        ]
    },
];
