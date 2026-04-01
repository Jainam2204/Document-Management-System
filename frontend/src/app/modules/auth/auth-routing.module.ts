import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { VerifyComponent } from './components/verify/verify.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { unauthGuard } from '../../core/guards/unauth/unauth.guard';
import { authGuard } from '../../core/guards/auth/auth.guard';

const routes: Routes = [
    {
        path: 'login',
        component: LoginComponent,
        canActivate: [unauthGuard]
    },
    {
        path: 'register',
        component: RegisterComponent,
        canActivate: [unauthGuard]
    },
    {
        path: 'verify',
        component: VerifyComponent,
        canActivate: [unauthGuard]
    },
    {
        path: 'reset-password',
        component: ResetPasswordComponent,
        canActivate: [authGuard]
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class AuthRoutingModule { }
