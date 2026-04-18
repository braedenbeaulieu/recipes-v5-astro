import type { CollectionEntry } from 'astro:content';

export type Recipe = CollectionEntry<'recipes'>;
export type RecipeData = Recipe['data'];
export type Recipes = {
  recipes: RecipeData[]
}

export interface RecipeWithSlug extends Recipe {
  slug: string;
}

export interface CategoryRecipes {
  [category: string]: RecipeWithSlug[];
}

export type TaxTerm = {
  name: string
  count: number
}

export interface TaxListProps {
  terms: TaxTerm[]
  slug: string
}