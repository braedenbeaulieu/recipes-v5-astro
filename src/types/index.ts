import type { CollectionEntry } from 'astro:content';

export type RecipeEntry = CollectionEntry<'recipes'>;
export type RecipeData = RecipeEntry['data'];
export interface RecipeItem {
  title: string;
  path: string;
  slug: string;
  category: string;
  description?: string;
  prepTime?: string;
  cookTime?: string;
  servings?: string | number;
  difficulty?: string;
}