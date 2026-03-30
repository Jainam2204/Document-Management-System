import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { UserRoutingModule } from './user-routing.module';
import { HomeComponent } from './components/home/home.component';
import { TrashComponent } from './components/trash/trash.component';


@NgModule({
  declarations: [HomeComponent, TrashComponent],
  imports: [
    CommonModule,
    UserRoutingModule
  ]
})
export class UserModule { }
