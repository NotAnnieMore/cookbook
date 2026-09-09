export type RecipeDifficulty = "easy" | "medium" | "hard" | null;

export type RecipeSummary = {
  id: string;
  title: string;
  description: string | null;
  activeTimeMinutes: number | null;
  totalTimeMinutes: number | null;
  difficulty: RecipeDifficulty;
  createdByName: string;
  isFavourite: boolean;
  coverUrl: string | null;
  updatedAt: string;
};
