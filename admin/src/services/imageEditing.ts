export type CropRatio = 'free' | 'square' | 'landscape' | 'standard';
export type QuarterTurn = 0 | 90 | 180 | 270;

export interface ImageEdits {
  ratio: CropRatio;
  focal: { x: number; y: number };
  freeCrop: { width: number; height: number };
  rotation: QuarterTurn;
  flipHorizontal: boolean;
  flipVertical: boolean;
  brightness: number;
  contrast: number;
  saturation: number;
  grayscale: number;
  sepia: number;
  blur: number;
}

export const defaultImageEdits: ImageEdits = {
  ratio: 'free', focal: { x: 50, y: 50 }, freeCrop: { width: 100, height: 100 }, rotation: 0,
  flipHorizontal: false, flipVertical: false,
  brightness: 100, contrast: 100, saturation: 100,
  grayscale: 0, sepia: 0, blur: 0,
};

export const cropRatios: Record<CropRatio, number | null> = {
  free: null, square: 1, landscape: 16 / 9, standard: 4 / 3,
};

const percent = (value: number) => Math.min(100, Math.max(0, value));

export function cropRectangle(
  width: number,
  height: number,
  ratio: number | null,
  focal: ImageEdits['focal'],
  freeCrop: ImageEdits['freeCrop'] = { width: 100, height: 100 },
) {
  if (!width || !height) return { x: 0, y: 0, width, height };
  const cropWidth = ratio
    ? Math.min(width, height * ratio)
    : width * Math.max(1, percent(freeCrop.width)) / 100;
  const cropHeight = ratio
    ? Math.min(height, width / ratio)
    : height * Math.max(1, percent(freeCrop.height)) / 100;
  const x = Math.round(Math.min(width - cropWidth, Math.max(0, width * percent(focal.x) / 100 - cropWidth / 2)) * 100) / 100;
  const y = Math.round(Math.min(height - cropHeight, Math.max(0, height * percent(focal.y) / 100 - cropHeight / 2)) * 100) / 100;
  return { x, y, width: cropWidth, height: cropHeight };
}

export function outputDimensions(width: number, height: number, rotation: QuarterTurn) {
  return rotation === 90 || rotation === 270 ? { width: height, height: width } : { width, height };
}

export function imageFilters(edits: ImageEdits) {
  return `brightness(${edits.brightness}%) contrast(${edits.contrast}%) saturate(${edits.saturation}%) grayscale(${edits.grayscale}%) sepia(${edits.sepia}%) blur(${edits.blur}px)`;
}

export function renderImage(image: CanvasImageSource, width: number, height: number, edits: ImageEdits, maxDimension = 4096): HTMLCanvasElement {
  const crop = cropRectangle(width, height, cropRatios[edits.ratio], edits.focal, edits.freeCrop);
  const rotated = outputDimensions(crop.width, crop.height, edits.rotation);
  const scale = Math.min(1, maxDimension / Math.max(rotated.width, rotated.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(rotated.width * scale));
  canvas.height = Math.max(1, Math.round(rotated.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available in this browser');
  ctx.imageSmoothingQuality = 'high';
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(edits.rotation * Math.PI / 180);
  ctx.scale(edits.flipHorizontal ? -1 : 1, edits.flipVertical ? -1 : 1);
  ctx.filter = imageFilters(edits);
  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height,
    -crop.width * scale / 2, -crop.height * scale / 2, crop.width * scale, crop.height * scale);
  return canvas;
}

export function loadEditableImage(file: Blob): Promise<{ image: HTMLImageElement; url: string }> {
  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      if (!image.naturalWidth || !image.naturalHeight) {
        URL.revokeObjectURL(url);
        reject(new Error('This image has no browser-readable dimensions'));
        return;
      }
      resolve({ image, url });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This image cannot be edited in the browser'));
    };
    image.src = url;
  });
}

export function exportImage(
  canvas: HTMLCanvasElement,
  name: string,
  format: 'image/webp' | 'image/png' | 'image/jpeg',
  quality: number,
  extension?: string,
): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob || blob.type !== format) return reject(new Error('The selected output format is not supported by this browser'));
      const ext = extension || (format === 'image/jpeg' ? 'jpg' : format === 'image/png' ? 'png' : 'webp');
      resolve(new File([blob], `${name.replace(/\.[^.]+$/, '')}_edited.${ext}`, { type: format }));
    }, format, format === 'image/png' ? undefined : quality);
  });
}
