import assert from "node:assert/strict";
import test from "node:test";

import { shouldTranslateToPortuguese } from "./import-language.ts";

test("recognizes Portuguese recipe text without requesting translation", () => {
  assert.equal(shouldTranslateToPortuguese("Ingredientes: açúcar e manteiga. Preparação: juntar, bater e deixar no forno."), false);
});

test("recognizes common foreign recipe text that should be translated", () => {
  assert.equal(shouldTranslateToPortuguese("Ingredients: chicken, butter and flour. Instructions: stir, bake and serve."), true);
  assert.equal(shouldTranslateToPortuguese("Ingredientes: azúcar y mantequilla. Preparación: mezclar y hornear."), true);
  assert.equal(shouldTranslateToPortuguese("Honey glazed garlic chicken bites with bacon"), true);
});
