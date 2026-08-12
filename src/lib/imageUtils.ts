import React from 'react';

// SVG data URL for clean default food fallback placeholder when an image fails to load
export const DEFAULT_FOOD_FALLBACK_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%23f59e0b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`;

/**
 * Client-side image compression helper optimized for Modern Android / iOS / WebViews.
 * Supports high-megapixel photos (50MP-108MP), HEIC/HEIF camera images, EXIF rotation,
 * and converts them instantly to a lightweight, web-compatible JPEG data URL.
 */
export async function compressImageFile(file: File, maxDim = 800, quality = 0.75): Promise<string> {
  if (!file) {
    return '';
  }

  // Method 1: Modern createImageBitmap API (Native decoding, EXIF rotation, zero RAM overhead)
  if (typeof createImageBitmap === 'function') {
    try {
      // Try with EXIF orientation correction
      let bitmap: ImageBitmap | null = null;
      try {
        bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as any);
      } catch {
        // Fallback for browsers that don't support the options object
        bitmap = await createImageBitmap(file);
      }

      if (bitmap && bitmap.width > 0 && bitmap.height > 0) {
        let width = bitmap.width;
        let height = bitmap.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(bitmap, 0, 0, width, height);

          // Close bitmap immediately to release GPU/RAM memory on Android
          bitmap.close();

          const compressed = canvas.toDataURL('image/jpeg', quality);
          if (compressed && compressed.startsWith('data:image/jpeg') && compressed.length > 100) {
            return compressed;
          }
        }
      }
    } catch (err) {
      console.warn('createImageBitmap failed, falling back to ObjectURL', err);
    }
  }

  // Method 2: URL.createObjectURL + HTMLImageElement
  const objectUrlResult = await new Promise<string>((resolve) => {
    try {
      const blobUrl = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        try {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (!width || !height) {
            URL.revokeObjectURL(blobUrl);
            resolve('');
            return;
          }

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            URL.revokeObjectURL(blobUrl);
            resolve('');
            return;
          }

          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          URL.revokeObjectURL(blobUrl);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          if (compressed && compressed.startsWith('data:image/jpeg') && compressed.length > 100) {
            resolve(compressed);
          } else {
            resolve('');
          }
        } catch {
          URL.revokeObjectURL(blobUrl);
          resolve('');
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        resolve('');
      };

      img.src = blobUrl;
    } catch {
      resolve('');
    }
  });

  if (objectUrlResult) {
    return objectUrlResult;
  }

  // Method 3: FileReader readAsDataURL Fallback
  return new Promise<string>((resolve) => {
    const reader = new FileReader();

    reader.onerror = () => resolve('');

    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      if (!rawDataUrl) {
        resolve('');
        return;
      }

      // Reject raw HEIC/HEIF data URLs because HTML <img> cannot render them on web
      if (rawDataUrl.startsWith('data:image/heic') || rawDataUrl.startsWith('data:image/heif')) {
        console.warn('HEIC file unprocessable on current browser');
        resolve('');
        return;
      }

      const img = new Image();

      img.onerror = () => {
        // Return raw data URL only if it's a standard web format
        if (rawDataUrl.startsWith('data:image/png') || rawDataUrl.startsWith('data:image/jpeg') || rawDataUrl.startsWith('data:image/webp')) {
          resolve(rawDataUrl);
        } else {
          resolve('');
        }
      };

      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(rawDataUrl);
            return;
          }

          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          const compressed = canvas.toDataURL('image/jpeg', quality);
          if (compressed && compressed.length > 100) {
            resolve(compressed);
          } else {
            resolve(rawDataUrl);
          }
        } catch {
          resolve(rawDataUrl);
        }
      };

      img.src = rawDataUrl;
    };

    reader.readAsDataURL(file);
  });
}

// Global Image Error Handler for <img> elements to handle broken/invalid image URLs smoothly
export function handleImgError(e: React.SyntheticEvent<HTMLImageElement, Event>, fallbackUrl = '') {
  const target = e.currentTarget;
  target.onerror = null; // Prevent infinite loop
  if (fallbackUrl) {
    target.src = fallbackUrl;
  } else {
    // Replace broken image with clean fallback placeholder instead of hiding (which leaves gray pixel)
    target.src = DEFAULT_FOOD_FALLBACK_SVG;
    target.classList.add('bg-amber-50', 'p-1', 'object-contain');
  }
}



