import assert from "node:assert/strict";
import test from "node:test";

import { canonicalTikTokVideoUrl, extractRecipeFromTikTokOEmbed, prepareTikTokCaption } from "./tiktok-import.ts";

const caption = `Honey Glazed Bacon Wrapped Garlic Chicken Bites
Indulge in these delicious savory and sweet bites.  **Ingredients:**  * Garlic chicken bites * Bacon * Honey  **Instructions:**  1. Prepare your garlic chicken bites. 2. Wrap each chicken bite with a strip of bacon. 3. Cook until crispy. 4. Glaze generously with honey.`;

test("removes TikTok sharing parameters from a direct video URL", () => {
  assert.equal(
    canonicalTikTokVideoUrl("https://www.tiktok.com/@shewillevolve/video/7636525672646724895?_r=1&utm_source=share"),
    "https://www.tiktok.com/@shewillevolve/video/7636525672646724895",
  );
  assert.equal(canonicalTikTokVideoUrl("https://example.com/video/123"), null);
});

test("turns an inline TikTok caption into parseable recipe sections", () => {
  const prepared = prepareTikTokCaption(caption);
  assert.match(prepared, /\nIngredients\n/);
  assert.match(prepared, /\nInstructions\n/);

  const result = extractRecipeFromTikTokOEmbed(JSON.stringify({
    provider_name: "TikTok",
    author_name: "She Will Evolve",
    title: caption,
  }));

  assert.equal(result.draft?.title, "Honey Glazed Bacon Wrapped Garlic Chicken Bites");
  assert.equal(result.draft?.ingredients.length, 3);
  assert.equal(result.draft?.steps.length, 4);
  assert.equal(result.authorName, "She Will Evolve");
  assert.equal(result.caption, caption);
});
