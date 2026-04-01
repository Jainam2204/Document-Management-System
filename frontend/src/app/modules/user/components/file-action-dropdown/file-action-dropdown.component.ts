import {
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FileRecord, FolderRecord } from '../../../../services/file/file.service';

export type FileActionDropdownVariant = 'sidebar' | 'headerDropdown' | 'itemDropdown';

export type FileActionEvent =
  | { type: 'createFolder'; data: { name: string } }
  | { type: 'uploadFile'; data: File }
  | { type: 'uploadFolder'; data: File[] }
  | { type: 'rename'; data: FolderRecord | FileRecord }
  | { type: 'share'; data: FolderRecord | FileRecord }
  | { type: 'download'; data: FileRecord }
  | { type: 'delete'; data: FolderRecord | FileRecord };

@Component({
  selector: 'app-file-action-dropdown',
  imports: [CommonModule, FormsModule],
  templateUrl: './file-action-dropdown.component.html',
  styleUrls: ['./file-action-dropdown.component.css'],
  host: { class: 'file-action-host' },
})
export class FileActionDropdownComponent implements OnChanges {
  private readonly host = inject(ElementRef<HTMLElement>);

  @HostBinding('class.file-action-host--sidebar')
  get hostSidebar(): boolean {
    return this.variant === 'sidebar';
  }

  @HostBinding('class.file-action-host--header')
  get hostHeader(): boolean {
    return this.variant === 'headerDropdown';
  }

  @HostBinding('class.file-action-host--item')
  get hostItem(): boolean {
    return this.variant === 'itemDropdown';
  }

  @HostBinding('class.file-action-host--open')
  get hostOpen(): boolean {
    return this.showDropdown;
  }

  @Input() variant: FileActionDropdownVariant = 'sidebar';
  @Input() item: FolderRecord | FileRecord | null = null;
  @Input() headerContext: FolderRecord | null = null;
  @Input() activeItemMenuKey: string | null = null;

  @Output() action = new EventEmitter<FileActionEvent>();
  @Output() itemMenuOpenChange = new EventEmitter<string | null>();

  showDropdown = false;
  showNewFolderDialog = false;
  newFolderName = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['activeItemMenuKey'] && this.variant === 'itemDropdown') {
      if (this.showDropdown && this.activeItemMenuKey !== this.itemMenuKey) {
        this.showDropdown = false;
      }
    }
  }

  get itemMenuKey(): string | null {
    if (this.variant !== 'itemDropdown' || !this.item) return null;
    const prefix = this.isFileRecord(this.item) ? 'file' : 'folder';
    return `${prefix}-${this.item._id}`;
  }

  isFileRecord(record: FolderRecord | FileRecord): record is FileRecord {
    return 's3Key' in record;
  }

  toggleDropdown(ev?: MouseEvent): void {
    ev?.stopPropagation();
    ev?.preventDefault();
    const next = !this.showDropdown;
    if (this.variant === 'itemDropdown') {
      if (next) {
        this.itemMenuOpenChange.emit(this.itemMenuKey);
      } else {
        this.itemMenuOpenChange.emit(null);
      }
    }
    this.showDropdown = next;
  }

  closeDropdown(): void {
    if (!this.showDropdown) return;
    this.showDropdown = false;
    if (this.variant === 'itemDropdown') {
      this.itemMenuOpenChange.emit(null);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node;
    if (this.host.nativeElement.contains(target)) {
      return;
    }
    this.closeDropdown();
  }

  onMenuNewFolder(ev: MouseEvent): void {
    ev.stopPropagation();
    this.onNewFolder();
  }

  onMenuUploadFile(ev: MouseEvent): void {
    ev.stopPropagation();
    this.onUploadFile();
  }

  onMenuUploadFolder(ev: MouseEvent): void {
    ev.stopPropagation();
    this.onUploadFolder();
  }

  onNewFolder(): void {
    this.closeDropdown();
    this.showNewFolderDialog = true;
    this.newFolderName = '';
  }

  onUploadFile(): void {
    this.closeDropdown();
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = (evt: Event) => {
      const file = (evt.target as HTMLInputElement).files?.[0];
      if (file) {
        this.action.emit({ type: 'uploadFile', data: file });
      }
    };
    input.click();
  }

  onUploadFolder(): void {
    this.closeDropdown();
    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    input.multiple = true;
    input.onchange = (evt: Event) => {
      const list = (evt.target as HTMLInputElement).files;
      const files = list ? Array.from(list) : [];
      if (files.length > 0) {
        this.action.emit({ type: 'uploadFolder', data: files });
      }
    };
    input.click();
  }

  emitRename(ev: MouseEvent): void {
    ev.stopPropagation();
    this.closeDropdown();
    const data = this.targetRecordForItemActions();
    if (data) {
      this.action.emit({ type: 'rename', data });
    }
  }

  emitShare(ev: MouseEvent): void {
    ev.stopPropagation();
    this.closeDropdown();
    const data = this.targetRecordForItemActions();
    if (data) {
      this.action.emit({ type: 'share', data });
    }
  }

  emitDownload(ev: MouseEvent): void {
    ev.stopPropagation();
    this.closeDropdown();
    const data = this.targetRecordForItemActions();
    if (data && this.isFileRecord(data)) {
      this.action.emit({ type: 'download', data });
    }
  }

  emitDelete(ev: MouseEvent): void {
    ev.stopPropagation();
    this.closeDropdown();
    const data = this.targetRecordForItemActions();
    if (data) {
      this.action.emit({ type: 'delete', data });
    }
  }

  private targetRecordForItemActions(): FolderRecord | FileRecord | null {
    if (this.variant === 'headerDropdown') {
      return this.headerContext;
    }
    if (this.variant === 'itemDropdown') {
      return this.item;
    }
    return null;
  }

  createFolder(): void {
    if (this.newFolderName.trim()) {
      this.action.emit({ type: 'createFolder', data: { name: this.newFolderName.trim() } });
      this.closeDialog();
    }
  }

  closeDialog(): void {
    this.showNewFolderDialog = false;
    this.newFolderName = '';
  }
}


