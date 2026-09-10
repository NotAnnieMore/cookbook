import assert from "node:assert/strict";
import test from "node:test";

import { extractRecipeFromHtml } from "./url-import.ts";

test("extracts a Schema.org Recipe and normalizes its measurements", () => {
  const html = `<!doctype html><html><head><script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [{
      "@type": ["Recipe", "NewsArticle"],
      "name": "Bolo de limão",
      "description": "Um bolo simples e fresco.",
      "prepTime": "PT20M",
      "totalTime": "PT1H5M",
      "recipeYield": "8 pessoas",
      "keywords": "bolo, limão",
      "recipeIngredient": ["300g Farinha", "1 cup açúcar"],
      "recipeInstructions": [
        {"@type": "HowToSection", "name": "Massa", "itemListElement": [
          {"@type": "HowToStep", "text": "Misturar os ingredientes."}
        ]},
        {"@type": "HowToStep", "text": "Levar ao forno."}
      ]
    }]
  }
  </script></head></html>`;

  const result = extractRecipeFromHtml(html);

  assert.equal(result.usedStructuredData, true);
  assert.equal(result.draft?.title, "Bolo de limão");
  assert.equal(result.draft?.activeTime, "20");
  assert.equal(result.draft?.totalTime, "65");
  assert.deepEqual(result.draft?.tags, ["bolo", "limão"]);
  assert.equal(result.draft?.ingredients[0].unit, "g");
  assert.equal(result.draft?.ingredients[0].name, "Farinha");
  assert.equal(result.draft?.ingredients[1].originalUnit, "cup");
  assert.equal(result.draft?.steps[0].section, "Massa");
});

test("falls back to readable HTML when structured data is unavailable", () => {
  const html = `<!doctype html><html><head>
    <meta property="og:title" content="Pão rápido">
    <meta name="description" content="Receita para o pequeno-almoço.">
  </head><body><main>
    <h2>Ingredientes</h2><ul><li>500g farinha</li><li>300ml água</li></ul>
    <h2>Preparação</h2><ol><li>Misturar tudo.</li><li>Levar ao forno.</li></ol>
  </main></body></html>`;

  const result = extractRecipeFromHtml(html);

  assert.equal(result.usedStructuredData, false);
  assert.equal(result.draft?.title, "Pão rápido");
  assert.equal(result.draft?.ingredients.length, 2);
  assert.equal(result.draft?.steps.length, 2);
});
