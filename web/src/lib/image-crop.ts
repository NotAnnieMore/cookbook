export type ImageCropInput = {
  imageWidth: number;
  imageHeight: number;
  aspectRatio?: number;
  zoom?: number;
  focusX?: number;
  focusY?: number;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function calculateImageCrop({
  imageWidth,
  imageHeight,
  aspectRatio = 3 / 2,
  zoom = 1,
  focusX = 50,
  focusY = 50,
}: ImageCropInput) {
  const safeZoom = clamp(zoom, 1, 3);
  const baseWidth = Math.min(imageWidth, imageHeight * aspectRatio);
  const baseHeight = baseWidth / aspectRatio;
  const width = baseWidth / safeZoom;
  const height = baseHeight / safeZoom;
  const x = (imageWidth - width) * (clamp(focusX, 0, 100) / 100);
  const y = (imageHeight - height) * (clamp(focusY, 0, 100) / 100);

  return { x, y, width, height };
}
