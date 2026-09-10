import assert from "node:assert/strict";
import test from "node:test";

import { calculateImageCrop } from "./image-crop.ts";

test("creates a centred 3:2 crop for a portrait image", () => {
  assert.deepEqual(calculateImageCrop({ imageWidth: 900, imageHeight: 1200 }), {
    x: 0,
    y: 300,
    width: 900,
    height: 600,
  });
});

test("moves and zooms the crop without leaving image bounds", () => {
  assert.deepEqual(calculateImageCrop({ imageWidth: 1800, imageHeight: 1200, zoom: 2, focusX: 100, focusY: 0 }), {
    x: 900,
    y: 0,
    width: 900,
    height: 600,
  });
});
