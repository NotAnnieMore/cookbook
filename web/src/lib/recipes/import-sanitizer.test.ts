import assert from "node:assert/strict";
import test from "node:test";

import { cleanImportedText, sanitizeImportedRecipe } from "./import-sanitizer.ts";

test("removes emoji sequences and collapses repeated whitespace", () => {
  assert.equal(cleanImportedText("Mexer  bem  👩🏽‍🍳 até ficar   liso ✨"), "Mexer bem até ficar liso");
  assert.equal(cleanImportedText("🇵🇹  Receita   da Ana"), "Receita da Ana");
});

test("sanitizes the editable fields while retaining the original ingredient text", () => {
  const draft = sanitizeImportedRecipe({
    title: "🍰  Bolo   de bolacha",
    description: "Muito   bom 😋",
    servings: "8",
    activeTime: "30",
    totalTime: "180",
    difficulty: "easy",
    tags: ["sobremesa ✨"],
    ingredients: [{
      name: "Bolacha   Maria 🍪",
      quantity: "200",
      quantityMax: "",
      unit: "g",
      optional: false,
      group: "Base  🍰",
      packageQuantity: "",
      packageUnit: "",
      originalText: "200g  Bolacha Maria 🍪",
    }],
    steps: [{ instruction: "Triturar  tudo. 👩‍🍳", section: "Preparar  a base" }],
  });

  assert.equal(draft.title, "Bolo de bolacha");
  assert.equal(draft.ingredients[0].name, "Bolacha Maria");
  assert.equal(draft.ingredients[0].originalText, "200g  Bolacha Maria 🍪");
  assert.deepEqual(draft.steps[0], { instruction: "Triturar tudo.", section: "Preparar a base" });
});

test("capitalizes the first actual letter in imported ingredients and preparation", () => {
  const draft = sanitizeImportedRecipe({
    title: "Receita",
    description: "",
    servings: "",
    activeTime: "",
    totalTime: "",
    difficulty: "",
    tags: [],
    ingredients: [{ name: "(bem maduro) abacate", quantity: "1", quantityMax: "", unit: "unid.", optional: false, group: "molho", packageQuantity: "", packageUnit: "" }],
    steps: [{ instruction: "aquecer o forno.", section: "preparação" }],
  });

  assert.equal(draft.ingredients[0].name, "(Bem maduro) abacate");
  assert.equal(draft.ingredients[0].group, "Molho");
  assert.deepEqual(draft.steps[0], { instruction: "Aquecer o forno.", section: "Preparação" });
});
