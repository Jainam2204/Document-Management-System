import { Component } from '@angular/core';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-home',
  imports: [HeaderComponent, SidebarComponent, CommonModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  folders: any[] = [
    { name: 'Classroom' },
    { name: 'Colab Notebooks' },
    { name: 'DBMS_DA' },
    { name: 'IT-644' }
  ];

  files: any[] = [
    { name: 'Assignment 1' },
    { name: 'Lab 1' }
  ];

  showDialog = false;
  newFolderName = '';

  openDialog() {
    this.showDialog = true;
  }

  closeDialog() {
    this.showDialog = false;
    this.newFolderName = '';
  }

  createFolder() {
    if (!this.newFolderName.trim()) return;

    this.folders.unshift({
      name: this.newFolderName
    });

    this.closeDialog();
  }
}
