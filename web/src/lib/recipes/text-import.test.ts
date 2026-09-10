import assert from "node:assert/strict";
import test from "node:test";

import { parseRecipeText } from "./text-import.ts";

test("parses a grouped Portuguese recipe and normalizes American measures", () => {
  const result = parseRecipeText(`Cheesecake da Ana
Uma sobremesa fresca.
Porções: 8
Tempo total: 1 h 30 min

Ingredientes
Base:
- 2 cups bolacha triturada
- 110 g de manteiga
Recheio:
- 1 lata de leite condensado
- 1 cup cream cheese

Preparação
Base:
1. Misturar a bolacha com a manteiga.
Recheio:
2. Bater o queijo creme e juntar o leite condensado.`);

  assert.equal(result.error, null);
  assert.equal(result.draft?.title, "Cheesecake da Ana");
  assert.equal(result.draft?.servings, "8");
  assert.equal(result.draft?.totalTime, "90");
  assert.equal(result.draft?.ingredients.length, 4);
  assert.equal(result.draft?.ingredients[0].group, "Base");
  assert.equal(result.draft?.ingredients[0].unit, "ml");
  assert.equal(result.draft?.ingredients[0].quantity, "480");
  assert.equal(result.draft?.ingredients[3].unit, "g");
  assert.equal(result.draft?.ingredients[3].quantity, "227");
  assert.equal(result.draft?.ingredients[3].originalUnit, "cup");
  assert.equal(result.draft?.steps[1].section, "Recheio");
});

test("infers ingredients and preparation without explicit headings", () => {
  const result = parseRecipeText("Bolo simples\n2 ovos\nMisturar tudo");
  assert.equal(result.error, null);
  assert.equal(result.draft?.ingredients[0].name, "ovos");
  assert.equal(result.draft?.steps[0].instruction, "Misturar tudo");
  assert.match(result.warnings.join(" "), /automaticamente/);
});

test("splits an unformatted preparation paragraph into individual steps", () => {
  const result = parseRecipeText(`Cheesecake simples
- 400 g de bolacha
- 110 g de manteiga
Triturar a bolacha. Misturar com a manteiga. Pressionar na forma e levar ao frigorífico.`);

  assert.equal(result.error, null);
  assert.equal(result.draft?.ingredients.length, 2);
  assert.deepEqual(result.draft?.steps.map((step) => step.instruction), [
    "Triturar a bolacha.",
    "Misturar com a manteiga.",
    "Pressionar na forma e levar ao frigorífico.",
  ]);
});

test("keeps unquantified ingredients and flags them for review", () => {
  const result = parseRecipeText(`Sopa
Ingredientes
- sal a gosto
- salsa
Preparação
- Triturar e servir.`);

  assert.equal(result.draft?.ingredients[0].name, "sal");
  assert.equal(result.draft?.ingredients[0].unit, "q.b.");
  assert.equal(result.draft?.ingredients[1].name, "salsa");
  assert.equal(result.warnings.length, 1);
});

test("recognizes metric units attached directly to the quantity", () => {
  const result = parseRecipeText(`Salame de chocolate branco
Ingredientes:
- 300g Chocolate branco
- 100ml Natas frias
- 80g Manteiga
- 200g Bolacha Maria
Preparação:
1. Misturar todos os ingredientes.`);

  assert.equal(result.error, null);
  assert.deepEqual(
    result.draft?.ingredients.map(({ quantity, unit, name }) => ({
      quantity,
      unit,
      name,
    })),
    [
      { quantity: "300", unit: "g", name: "Chocolate branco" },
      { quantity: "100", unit: "ml", name: "Natas frias" },
      { quantity: "80", unit: "g", name: "Manteiga" },
      { quantity: "200", unit: "g", name: "Bolacha Maria" },
    ],
  );
});
