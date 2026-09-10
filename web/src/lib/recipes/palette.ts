const panelPalette = [
  { colour: "#285240", hue: 154 },
  { colour: "#355267", hue: 205 },
  { colour: "#59415D", hue: 292 },
  { colour: "#74473D", hue: 11 },
  { colour: "#59613A", hue: 71 },
  { colour: "#584A68", hue: 268 },
] as const;

function hueDistance(first: number, second: number) {
  const distance = Math.abs(first - second) % 360;
  return Math.min(distance, 360 - distance);
}

function rgbHue(red: number, green: number, blue: number) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const maximum = Math.max(r, g, b);
  const minimum = Math.min(r, g, b);
  const delta = maximum - minimum;
  if (delta < 0.04) return null;

  let hue = 0;
  if (maximum === r) hue = ((g - b) / delta) % 6;
  else if (maximum === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;
  return (hue * 60 + 360) % 360;
}

export function fallbackRecipeColour(seed: string) {
  const hash = [...seed].reduce(
    (total, character) => (total * 31 + character.charCodeAt(0)) >>> 0,
    2166136261,
  );
  return panelPalette[hash % panelPalette.length].colour;
}

export function panelColourFromPixels(
  pixels: ArrayLike<number>,
  fallbackSeed: string,
) {
  let x = 0;
  let y = 0;
  let totalWeight = 0;

  for (let index = 0; index + 3 < pixels.length; index += 4) {
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    const alpha = pixels[index + 3] / 255;
    const maximum = Math.max(red, green, blue);
    const minimum = Math.min(red, green, blue);
    const saturation = maximum === 0 ? 0 : (maximum - minimum) / maximum;
    const hue = rgbHue(red, green, blue);

    if (alpha < 0.5 || hue === null || maximum < 35 || minimum > 245) continue;
    const weight = alpha * Math.max(0.15, saturation);
    const radians = (hue * Math.PI) / 180;
    x += Math.cos(radians) * weight;
    y += Math.sin(radians) * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return fallbackRecipeColour(fallbackSeed);
  const photoHue = (Math.atan2(y, x) * 180) / Math.PI;
  const complementaryHue = ((photoHue + 360) % 360 + 180) % 360;
  return [...panelPalette].sort(
    (first, second) =>
      hueDistance(first.hue, complementaryHue) -
      hueDistance(second.hue, complementaryHue),
  )[0].colour;
}
