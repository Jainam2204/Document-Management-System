import { Component, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar.component';
import { ActivityLogWidgetComponent } from '../../../../shared/components/activity-log-widget/activity-log-widget.component';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, HeaderComponent, SidebarComponent, ActivityLogWidgetComponent, CommonModule],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.css']
})
export class MainLayoutComponent implements OnInit {

  sidebarCollapsed = false;

  ngOnInit() {
   
  }
}
