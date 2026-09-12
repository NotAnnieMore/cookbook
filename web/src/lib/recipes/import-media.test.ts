import assert from "node:assert/strict";
import test from "node:test";

import { detectImportImageMime } from "./import-media.ts";

test("detects the supported image formats by their real signature", () => {
  assert.equal(detectImportImageMime(new Uint8Array([0xff, 0xd8, 0xff, 0x00])), "image/jpeg");
  assert.equal(detectImportImageMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "image/png");
  assert.equal(detectImportImageMime(new Uint8Array([
    0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
  ])), "image/webp");
});

test("rejects files whose extension or declared type could disguise another format", () => {
  assert.equal(detectImportImageMime(new TextEncoder().encode("not really an image")), null);
});
