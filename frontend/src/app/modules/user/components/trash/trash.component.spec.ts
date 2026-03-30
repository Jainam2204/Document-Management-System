import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { of } from 'rxjs';

import { TrashComponent } from './trash.component';
import { FileService } from '../../../../services/file/file.service';
import { ToastService } from '../../../../services/toast/toast.service';

describe('TrashComponent', () => {
  let component: TrashComponent;
  let fixture: ComponentFixture<TrashComponent>;

  const mockFileService = {
    getTrashItems: jasmine.createSpy('getTrashItems').and.returnValue(of({ success: true, files: [], folders: [] })),
    restoreFile: jasmine.createSpy('restoreFile').and.returnValue(of({ success: true, message: 'Restored' })),
    restoreFolder: jasmine.createSpy('restoreFolder').and.returnValue(of({ success: true, message: 'Restored' })),
    permanentlyDeleteFile: jasmine.createSpy('permanentlyDeleteFile').and.returnValue(of({ success: true, message: 'Deleted' })),
    permanentlyDeleteFolder: jasmine.createSpy('permanentlyDeleteFolder').and.returnValue(of({ success: true, message: 'Deleted' })),
  };

  const mockToastService = {
    success: jasmine.createSpy('success'),
    error: jasmine.createSpy('error'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule],
      declarations: [TrashComponent],
      providers: [
        { provide: FileService, useValue: mockFileService },
        { provide: ToastService, useValue: mockToastService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TrashComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
