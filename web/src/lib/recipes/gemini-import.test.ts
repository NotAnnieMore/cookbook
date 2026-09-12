import assert from "node:assert/strict";
import test from "node:test";

import { geminiRecipeToImportResult } from "./gemini-import-draft.ts";

test("turns a grounded Gemini payload into the normal editable recipe draft", () => {
  const result = geminiRecipeToImportResult({
    title: "Cheesecake de limão",
    description: "Uma sobremesa fresca.",
    servings: "8 pessoas",
    activeTime: "25 min",
    totalTime: "6 h",
    difficulty: "easy",
    tags: ["sobremesa", "limão"],
    ingredientGroups: [
      { name: "Base", items: ["2 cups bolacha triturada", "110g manteiga"] },
      { name: "Recheio", items: ["1 lata leite condensado"] },
    ],
    preparationSections: [
      { name: "Base", steps: ["Misturar a bolacha com a manteiga."] },
      { name: "Recheio", steps: ["Juntar o leite condensado."] },
    ],
  });

  assert.ok(result?.draft);
  assert.equal(result.draft.title, "Cheesecake de limão");
  assert.equal(result.draft.totalTime, "360");
  assert.equal(result.draft.difficulty, "easy");
  assert.deepEqual(result.draft.tags, ["sobremesa", "limão"]);
  assert.equal(result.draft.ingredients[0].group, "Base");
  assert.equal(result.draft.ingredients[0].unit, "ml");
  assert.equal(result.draft.ingredients[0].quantity, "480");
  assert.equal(result.draft.steps[1].section, "Recheio");
});

test("keeps grounded ingredients when the source does not contain preparation", () => {
  const result = geminiRecipeToImportResult({
    title: "Receita incompleta",
    description: "",
    servings: "",
    activeTime: "",
    totalTime: "",
    difficulty: "",
    tags: [],
    ingredientGroups: [{ name: "", items: ["2 pacotes de natas"] }],
    preparationSections: [],
  });

  assert.ok(result?.draft);
  assert.equal(result.draft.ingredients.length, 1);
  assert.equal(result.draft.ingredients[0].quantity, "400");
  assert.equal(result.draft.ingredients[0].unit, "ml");
  assert.equal(result.draft.ingredients[0].name, "natas");
  assert.equal(result.draft.ingredients[0].originalQuantity, "2");
  assert.equal(result.draft.ingredients[0].originalUnit, "pacotes");
  assert.equal(result.draft.steps.length, 0);
  assert.match(result.warnings.join(" "), /não disponibilizou a preparação/i);
});
