export const FILE_UPLOAD = {
  MAX_SIZE: 1 * 1024 * 1024,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'] as const,
} as const;

export const MEDIA_ERRORS = {
  FILE_TOO_LARGE: 'File exceeds maximum allowed size',
  UNSUPPORTED_FILE_TYPE: 'Only JPEG, PNG, and WebP images are allowed',
  INVALID_IMAGE_ID: 'Invalid image id',
  IMAGE_NOT_FOUND: 'Image not found',
} as const;
