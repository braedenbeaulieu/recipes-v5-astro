import type { CollectionEntry } from 'astro:content';

export type RecipeEntry = CollectionEntry<'recipes'>;
export type RecipeData = RecipeEntry['data'] & {
  path?: string;
  published?: boolean;
};