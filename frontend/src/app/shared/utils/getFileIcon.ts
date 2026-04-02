export const getFileIcon = (fileName: string, isFolder: boolean = false): string => {
  if (isFolder) {
    return '/icons/folder.svg';
  }

  const extension = getFileExtension(fileName).toLowerCase();

  const extensionMap: { [key: string]: string } = {
    'pdf': 'pdf',

    'doc': 'doc',
    'docx': 'doc',
    'dot': 'doc',
    'dotx': 'doc',

    'xls': 'xls',
    'xlsx': 'xls',
    'csv': 'xls',

    'ppt': 'ppt',
    'pptx': 'ppt',
    'odp': 'ppt',

    'jpg': 'image',
    'jpeg': 'image',
    'png': 'image',
    'gif': 'image',
    'bmp': 'image',
    'svg': 'image',
    'webp': 'image',
    'ico': 'image',

    'mp4': 'video',
    'avi': 'video',
    'mov': 'video',
    'mkv': 'video',
    'flv': 'video',
    'wmv': 'video',
    'webm': 'video',

    'mp3': 'audio',
    'wav': 'audio',
    'flac': 'audio',
    'aac': 'audio',
    'ogg': 'audio',
    'm4a': 'audio',

    'zip': 'zip',
    'rar': 'zip',
    '7z': 'zip',
    'tar': 'zip',
    'gz': 'zip',

    'txt': 'txt',
    'rtf': 'txt',
    'log': 'txt',
  };

  const iconName = extensionMap[extension] || 'default';

  return `/icons/${iconName}.svg`;
}

const getFileExtension = (fileName: string): string => {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}
