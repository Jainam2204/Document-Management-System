import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AuthRoutingModule } from './auth-routing.module';
import { FormsModule } from '@angular/forms';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { VerifyComponent } from './components/verify/verify.component';
import { RouterModule } from '@angular/router';


@NgModule({
  declarations: [FormsModule, LoginComponent, RegisterComponent, VerifyComponent, RouterModule],
  imports: [
    CommonModule,
    AuthRoutingModule
  ]
})
export class AuthModule { }
