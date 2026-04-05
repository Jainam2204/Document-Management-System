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

    // Try to load extension-specific PNG, fallback to default
    const iconPath = `/icons/${extension}.png`;

    // For now, we'll return the path - in a real implementation,
    // you might want to check if the file exists or use a default mapping
    return iconPath;
  }

  private getFileExtension(fileName: string): string {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }
}