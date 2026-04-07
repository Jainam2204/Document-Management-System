import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'fileIcon',
  pure: true
})
export class FileIconPipe implements PipeTransform {
  transform(fileName: string, isFolder: boolean = false): string {
    if (isFolder) {
      return '/icons/folder.svg';
    }

    const extension = this.getFileExtension(fileName).toLowerCase();

    const iconPath = `/icons/${extension}.png`;
    return iconPath;
  }

  private getFileExtension(fileName: string): string {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }
}