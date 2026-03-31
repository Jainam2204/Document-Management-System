import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FileActionDropdownComponent } from './file-action-dropdown.component';

describe('FileActionDropdownComponent', () => {
  let component: FileActionDropdownComponent;
  let fixture: ComponentFixture<FileActionDropdownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FileActionDropdownComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FileActionDropdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
