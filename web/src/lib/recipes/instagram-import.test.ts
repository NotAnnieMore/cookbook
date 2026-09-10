import assert from "node:assert/strict";
import test from "node:test";

import { canonicalInstagramPostUrl, extractRecipeFromInstagramHtml } from "./instagram-import.ts";

test("canonicalizes Instagram posts and reels without sharing parameters", () => {
  assert.equal(canonicalInstagramPostUrl("https://www.instagram.com/reel/ABC_123/?igsh=example"), "https://www.instagram.com/reel/ABC_123/");
  assert.equal(canonicalInstagramPostUrl("https://instagr.am/p/xyz-789/?utm_source=share"), "https://www.instagram.com/p/xyz-789/");
  assert.equal(canonicalInstagramPostUrl("https://example.com/reel/ABC_123"), null);
});

test("extracts and parses a public Instagram caption", () => {
  const caption = "Bolo de limão  Ingredientes: • 200g farinha • 2 ovos  Preparação: 1. Misturar os ingredientes. 2. Levar ao forno. #bolo #limão";
  const html = `<html><head><meta property="og:description" content="${caption.replaceAll("&", "&amp;").replaceAll('"', "&quot;")}"></head></html>`;
  const result = extractRecipeFromInstagramHtml(html);

  assert.equal(result.draft?.title, "Bolo de limão");
  assert.equal(result.draft?.ingredients.length, 2);
  assert.equal(result.draft?.steps.length, 2);
  assert.deepEqual(result.draft?.tags, ["bolo", "limão"]);
  assert.equal(result.caption, caption);
});
