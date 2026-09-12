export type StepIngredientInput = {
  ingredientClientIds: number[];
};

export type IngredientClientInput = {
  clientId: number;
};

type SavedOrderedRow = {
  id: string;
  sort_order: number;
};

export function buildStepIngredientRows(
  ingredients: IngredientClientInput[],
  steps: StepIngredientInput[],
  savedIngredients: SavedOrderedRow[],
  savedSteps: SavedOrderedRow[],
) {
  const ingredientIds = new Map(
    savedIngredients.flatMap((row) => {
      const ingredient = ingredients[row.sort_order];
      return ingredient ? [[ingredient.clientId, row.id] as const] : [];
    }),
  );
  const stepIds = new Map(savedSteps.map((row) => [row.sort_order, row.id]));

  return steps.flatMap((step, stepIndex) => {
    const stepId = stepIds.get(stepIndex);
    if (!stepId) return [];
    return [...new Set(step.ingredientClientIds)].flatMap((clientId, sortOrder) => {
      const ingredientId = ingredientIds.get(clientId);
      return ingredientId ? [{ step_id: stepId, ingredient_id: ingredientId, sort_order: sortOrder }] : [];
    });
  });
}
