import type { CollectionEntry } from 'astro:content';

export type Recipe = CollectionEntry<'recipes'>;
export type RecipeData = Recipe['data'];

export interface RecipeWithSlug extends Recipe {
  slug: string;
}

export interface CategoryRecipes {
  [category: string]: RecipeWithSlug[];
}
