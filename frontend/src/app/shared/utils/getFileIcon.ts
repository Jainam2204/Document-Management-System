export const getFileIcon = (fileName: string, isFolder: boolean = false): string => {
  if (isFolder) {
    return '/icons/folder.svg';
  }

  const extension = getFileExtension(fileName).toLowerCase();

  // Return extension-specific PNG icon, fallback to default file icon
  return `/icons/${extension}.png`;
}

export const isImageFile = (fileName: string): boolean => {
  const extension = getFileExtension(fileName).toLowerCase();
  const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'ico'];
  return imageExtensions.includes(extension);
}

export const getFilePreview = (file: any): { type: 'image' | 'icon'; src: string; alt: string } => {
  if (isImageFile(file.name)) {
    // For now, return icon - will be enhanced to get actual image URL
    return {
      type: 'icon',
      src: getFileIcon(file.name),
      alt: `${getFileExtension(file.name).toUpperCase()} file`
    };
  }

  return {
    type: 'icon',
    src: getFileIcon(file.name),
    alt: `${getFileExtension(file.name).toUpperCase()} file`
  };
}

const getFileExtension = (fileName: string): string => {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}
