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

test("counts garlic cloves as units instead of a special measurement", () => {
  const result = parseRecipeText(`Frango com alho
Ingredientes
- 2 dentes de alho
Preparação
- Picar o alho e cozinhar.`);

  assert.equal(result.error, null);
  assert.deepEqual(
    result.draft?.ingredients.map(({ quantity, unit, name }) => ({
      quantity,
      unit,
      name,
    })),
    [{ quantity: "2", unit: "unid.", name: "alho" }],
  );
});

test("keeps a title-less personal recipe editable and reads a trailing mixed metric range", () => {
  const result = parseRecipeText(`INGREDIENTES:

- Lombinho de porco 800g-1.6kg (normalmente faço 2 pedaços de lombinho, dá para 2 refeições com 4 pessoas)
- Mostarda
- Mel
- Alhos ralados, pimentão doce e noz-moscada
- Azeite
- Sal

============================================== PREPARO:

- Numa tigela colocar, 3 colheres de sopa de mostarda; 2 colheres de sopa de mel; 3 dentes de alhos ralados; 1/2 colher de chá de pimentão doce; 1/2 colher de chá de noz-moscada; 150ml de azeite.
- Numa travessa colocar os lombinhos e deitar a nossa mistura por cima. e deixar marinar (quanto mais tempo melhor!)
- Levar ao forno a 180ºC durante 1 hora

============================================== COISAS QUE EU FAÇO:

- Quando falta uns 10-20mins eu abro o forno e corto o lombinho a meio
- De vez em quando regar a carne com o próprio molho.`);

  assert.equal(result.error, null);
  assert.equal(result.draft?.title, "Receita importada");
  assert.deepEqual(
    {
      quantity: result.draft?.ingredients[0].quantity,
      quantityMax: result.draft?.ingredients[0].quantityMax,
      unit: result.draft?.ingredients[0].unit,
      name: result.draft?.ingredients[0].name,
      originalQuantity: result.draft?.ingredients[0].originalQuantity,
      originalQuantityMax: result.draft?.ingredients[0].originalQuantityMax,
      originalUnit: result.draft?.ingredients[0].originalUnit,
    },
    {
      quantity: "0,8",
      quantityMax: "1,6",
      unit: "kg",
      name: "Lombinho de porco (normalmente faço 2 pedaços de lombinho, dá para 2 refeições com 4 pessoas)",
      originalQuantity: "800",
      originalQuantityMax: "1,6",
      originalUnit: "g–kg",
    },
  );
  assert.equal(result.draft?.steps.at(-1)?.section, "COISAS QUE EU FAÇO");
  assert.match(result.warnings.join(" "), /título/i);
});

test("recognizes friendly headings, social bullets and more cooking verbs", () => {
  const result = parseRecipeText(`Bolo de iogurte
✨ O que vais precisar ✨
→2 ovos
✔ 2 dl de iogurte
• 15 cl de óleo
👩‍🍳 Como fazer 👩‍🍳
Untar a forma.
Incorporar os ingredientes e levar ao forno.`);

  assert.equal(result.error, null);
  assert.deepEqual(
    result.draft?.ingredients.map(({ quantity, unit, name }) => ({ quantity, unit, name })),
    [
      { quantity: "2", unit: "unid.", name: "ovos" },
      { quantity: "200", unit: "ml", name: "iogurte" },
      { quantity: "150", unit: "ml", name: "óleo" },
    ],
  );
  assert.deepEqual(result.draft?.steps.map((step) => step.instruction), [
    "Untar a forma.",
    "Incorporar os ingredientes e levar ao forno.",
  ]);
});

test("recognizes common packet and discrete-item vocabulary", () => {
  const result = parseRecipeText(`Sobremesa rápida
Ingredientes
- 2 embalagens de natas
- 3 fatias de limão
Preparação
- Bater as natas e servir.`);

  assert.equal(result.error, null);
  assert.deepEqual(
    result.draft?.ingredients.map(({ quantity, unit, name }) => ({ quantity, unit, name })),
    [
      { quantity: "400", unit: "ml", name: "natas" },
      { quantity: "3", unit: "unid.", name: "limão" },
    ],
  );
});
