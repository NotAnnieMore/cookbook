"use client";

import { useEffect, useState } from "react";

import {
  fallbackRecipeColour,
  panelColourFromPixels,
} from "@/lib/recipes/palette";

export function useAdaptiveRecipeColour(
  imageUrl: string | null | undefined,
  recipeId: string | undefined,
) {
  const seed = recipeId ?? "cookbook";
  const colourKey = `${seed}:${imageUrl ?? "no-image"}`;
  const [sampledColour, setSampledColour] = useState<{
    key: string;
    colour: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!imageUrl) return () => { cancelled = true; };

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 32;
        canvas.height = 32;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) return;
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        setSampledColour({
          key: colourKey,
          colour: panelColourFromPixels(pixels, seed),
        });
      } catch {
        return;
      }
    };
    image.onerror = () => undefined;
    image.src = imageUrl;

    return () => {
      cancelled = true;
      image.onload = null;
      image.onerror = null;
    };
  }, [colourKey, imageUrl, seed]);

  return sampledColour?.key === colourKey
    ? sampledColour.colour
    : fallbackRecipeColour(seed);
}
