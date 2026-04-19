import { getCollection } from 'astro:content';
import type { RecipeData, RecipeEntry } from '@/types/index';

/**
 * Get all published recipes sorted by title
 */
export async function getAllRecipes(): Promise<RecipeEntry[]> {
  const recipes = await getCollection('recipes', ({ data }) => data.published !== false);
  return recipes
    .map((recipe) => ({
      ...recipe,
      slug: recipe.id.replace(/\.md$/, '')
    }))
    .sort((a, b) => a.data.title.localeCompare(b.data.title));
}

/**
 * Get recipes grouped by category (from frontmatter)
 */
export async function getRecipesByCategory(): Promise<RecipeData[]> {
  const recipes = await getAllRecipes();
  const grouped: RecipeData[] = {};

  for (const recipe of recipes) {
    const category = recipe.data.category || 'uncategorized';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(recipe);
  }

  return grouped;
}

/**
 * Get all unique tags from recipes
 */
export async function getAllTags(): Promise<string[]> {
  const recipes = await getAllRecipes();
  const tags = new Set<string>();

  for (const recipe of recipes) {
    if (recipe.data.tags && Array.isArray(recipe.data.tags)) {
      recipe.data.tags.forEach((tag) => tags.add(tag));
    }
  }
  return Array.from(tags).sort();
}

/**
 * Get recipes by tag
 */
export async function getRecipesByTag(tag: string): Promise<RecipeEntry[]> {
  const recipes = await getAllRecipes();
  return recipes.filter(
    (recipe) => recipe.data.tags && recipe.data.tags.includes(tag)
  );
}

/**
 * Get recipes by category (from frontmatter)
 */
export async function getRecipesInCategory(category: string): Promise<RecipeEntry[]> {
  const recipes = await getAllRecipes();
  return recipes.filter(
    (recipe) => recipe.data.category === (category)
  );
}

/**
 * Get all categories
 */
export async function getAllCategories(): Promise<string[]> {
  const grouped = await getRecipesByCategory();
  return Object.keys(grouped).sort();
}

/**
 * Get recipe by slug (flat format)
 */
export async function getRecipeBySlug(slug: string): Promise<RecipeEntry | undefined> {
  const recipes = await getAllRecipes();
  return recipes.find((recipe) => recipe.data.slug === slug);
}

/**
 * Get previous and next recipes in category
 */
export async function getRecipeNavigation(
  currentSlug: string
): Promise<{ prev: RecipeEntry | null; next: RecipeEntry | null }> {
  const currentRecipe = await getRecipeBySlug(currentSlug);
  if (!currentRecipe) {
    return { prev: null, next: null };
  }

  const category = currentRecipe.data.category || 'uncategorized';
  const recipesInCategory = await getRecipesInCategory(category);
  const currentIndex = recipesInCategory.findIndex((recipe) => recipe.data.slug === currentSlug);

  return {
    prev: currentIndex > 0 ? recipesInCategory[currentIndex - 1] : null,
    next: currentIndex < recipesInCategory.length - 1 ? recipesInCategory[currentIndex + 1] : null
  };
}
