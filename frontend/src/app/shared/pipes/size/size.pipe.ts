import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'size'
})
export class SizePipe implements PipeTransform {

    transform(bytes: number = 0): string {
        if (!bytes) return '0 B';

        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';

        return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    }

}
