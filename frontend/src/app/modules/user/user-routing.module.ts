import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { TrashComponent } from './components/trash/trash.component';
import { SharedWithMeComponent } from './components/shared-with-me/shared-with-me.component';

const routes: Routes = [
  {
    path: 'home/:id',
    component: HomeComponent
  },
  {
    path: 'home',
    component: HomeComponent
  },
  {
    path: 'trash',
    component: TrashComponent
  },
  {
    path: 'shared-with-me',
    component: SharedWithMeComponent
  },
  {
    path: 'shared-with-me/:id',
    component: SharedWithMeComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UserRoutingModule { }
