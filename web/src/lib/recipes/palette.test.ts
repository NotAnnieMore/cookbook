import assert from "node:assert/strict";
import test from "node:test";

import {
  fallbackRecipeColour,
  panelColourFromPixels,
} from "./palette.ts";

test("keeps the fallback colour stable for the same recipe", () => {
  assert.equal(fallbackRecipeColour("recipe-123"), fallbackRecipeColour("recipe-123"));
});

test("selects a stable colour among compatible complements for a warm photograph", () => {
  const warmPixels = new Uint8ClampedArray([
    220, 155, 90, 255,
    190, 120, 55, 255,
    235, 190, 120, 255,
  ]);
  const colour = panelColourFromPixels(warmPixels, "recipe-warm");
  assert.ok(["#355267", "#285240", "#59415D", "#584A68"].includes(colour));
  assert.equal(panelColourFromPixels(warmPixels, "recipe-warm"), colour);
});

test("allows different recipes with the same warm photograph to vary within the complementary family", () => {
  const warmPixels = new Uint8ClampedArray([
    220, 155, 90, 255,
    190, 120, 55, 255,
    235, 190, 120, 255,
  ]);
  const colours = new Set(
    Array.from({ length: 12 }, (_, index) =>
      panelColourFromPixels(warmPixels, `warm-recipe-${index}`),
    ),
  );
  assert.ok(colours.size >= 2);
});

test("falls back deterministically when the photograph has no useful hue", () => {
  const greyPixels = new Uint8ClampedArray([120, 120, 120, 255]);
  assert.equal(
    panelColourFromPixels(greyPixels, "recipe-grey"),
    fallbackRecipeColour("recipe-grey"),
  );
});
