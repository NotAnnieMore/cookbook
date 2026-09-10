import assert from "node:assert/strict";
import test from "node:test";

import {
  fallbackRecipeColour,
  panelColourFromPixels,
} from "./palette.ts";

test("keeps the fallback colour stable for the same recipe", () => {
  assert.equal(fallbackRecipeColour("recipe-123"), fallbackRecipeColour("recipe-123"));
});

test("selects a controlled complementary colour for a warm photograph", () => {
  const warmPixels = new Uint8ClampedArray([
    220, 155, 90, 255,
    190, 120, 55, 255,
    235, 190, 120, 255,
  ]);
  assert.equal(panelColourFromPixels(warmPixels, "fallback"), "#355267");
});

test("falls back deterministically when the photograph has no useful hue", () => {
  const greyPixels = new Uint8ClampedArray([120, 120, 120, 255]);
  assert.equal(
    panelColourFromPixels(greyPixels, "recipe-grey"),
    fallbackRecipeColour("recipe-grey"),
  );
});
