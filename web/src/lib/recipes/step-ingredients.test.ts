import assert from "node:assert/strict";
import test from "node:test";

import { buildStepIngredientRows } from "./step-ingredients.ts";

test("maps form ingredient choices to the saved step and ingredient ids", () => {
  const rows = buildStepIngredientRows(
    [{ clientId: 101 }, { clientId: 205 }, { clientId: 309 }],
    [{ ingredientClientIds: [205, 101, 205] }, { ingredientClientIds: [309] }],
    [
      { id: "ingredient-b", sort_order: 1 },
      { id: "ingredient-a", sort_order: 0 },
      { id: "ingredient-c", sort_order: 2 },
    ],
    [
      { id: "step-2", sort_order: 1 },
      { id: "step-1", sort_order: 0 },
    ],
  );

  assert.deepEqual(rows, [
    { step_id: "step-1", ingredient_id: "ingredient-b", sort_order: 0 },
    { step_id: "step-1", ingredient_id: "ingredient-a", sort_order: 1 },
    { step_id: "step-2", ingredient_id: "ingredient-c", sort_order: 0 },
  ]);
});
