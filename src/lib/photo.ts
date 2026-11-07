// Сжатие фото улова перед сохранением: длинная сторона до 1280px, WebP (или JPEG, где WebP не кодируется).
// Снимок с телефона весит 3–8 МБ, после сжатия — 150–300 КБ, и журнал не съедает память.

export const PHOTO_MAX_SIDE = 1280;

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      // imageOrientation учитывает EXIF-поворот снимков с камеры.
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* падаем на <img> — например, HEIC в браузере без его поддержки */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Файл из <input type="file"> → data URL сжатого фото. Бросает Error с понятным текстом. */
export async function compressPhoto(file: Blob, maxSide = PHOTO_MAX_SIDE): Promise<string> {
  let src: ImageBitmap | HTMLImageElement;
  try {
    src = await decode(file);
  } catch {
    throw new Error('Не удалось открыть фото. Попробуйте другой снимок или формат JPEG.');
  }
  const w = 'naturalWidth' in src ? src.naturalWidth : src.width;
  const h = 'naturalHeight' in src ? src.naturalHeight : src.height;
  const k = Math.min(1, maxSide / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * k));
  canvas.height = Math.max(1, Math.round(h * k));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Не удалось обработать фото на этом устройстве.');
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
  if ('close' in src) src.close();
  // Safari до 17 молча отдаёт PNG вместо WebP — тогда берём JPEG.
  const webp = canvas.toDataURL('image/webp', 0.8);
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.82);
}
