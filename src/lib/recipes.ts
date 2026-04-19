import { getCollection } from 'astro:content';
import type { RecipeData, RecipeEntry } from '@/types/index';

/**
 * Get all published recipe entriess sorted by title
 */
export async function getAllRecipeEntries(): Promise<RecipeEntry[]> {
  const recipes = await getCollection('recipes', ({ data }) => data.published !== false);
  return recipes
    .map((recipe) => ({
      ...recipe,
      slug: recipe.id.replace(/\.md$/, '')
    }))
    .sort((a, b) => a.data.title.localeCompare(b.data.title));
}

/**
 * Get all published recipes data object sorted by title
 */
export async function getAllRecipes(): Promise<RecipeData[]> {
  const recipeEntries = await getAllRecipeEntries()
  return recipeEntries
    .map(entry => entry.data)
  
}

/**
 * Get recipes grouped by category (from frontmatter)
 */
export async function getRecipesByCategory(): Promise<RecipeData[]> {
  const recipes = await getAllRecipes();
  const grouped: RecipeData[] = {};

  for (const recipe of recipes) {
    const category = recipe.category || 'uncategorized';
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
    if (recipe.tags && Array.isArray(recipe.tags)) {
      recipe.tags.forEach((tag) => tags.add(tag));
    }
  }
  return Array.from(tags).sort();
}

/**
 * Get recipes by tag
 */
export async function getRecipesByTag(tag: string): Promise<RecipeData[]> {
  const recipes = await getAllRecipes();
  return recipes.filter(
    (recipe) => recipe.tags && recipe.tags.includes(tag)
  );
}

/**
 * Get recipes by category (from frontmatter)
 */
export async function getRecipesInCategory(category: string): Promise<RecipeData[]> {
  const recipes = await getAllRecipes();
  return recipes.filter(
    (recipe) => recipe.category === (category)
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
export async function getRecipeEntryBySlug(slug: string): Promise<RecipeEntry | undefined> {
  const recipes = await getAllRecipeEntries();
  return recipes.find((recipe) => recipe.data.slug === slug);
}

/**
 * Get recipe by slug (flat format)
 */
export async function getRecipeBySlug(slug: string): Promise<RecipeData | undefined> {
  const recipes = await getAllRecipes();
  return recipes.find((recipe) => recipe.slug === slug);
}

/**
 * Get previous and next recipes in category
 */
export async function getRecipeNavigation(
  currentSlug: string
): Promise<{ prev: RecipeData | null; next: RecipeData | null }> {
  const currentRecipe = await getRecipeBySlug(currentSlug);
  if (!currentRecipe) {
    return { prev: null, next: null };
  }

  const category = currentRecipe.category || 'uncategorized';
  const recipesInCategory = await getRecipesInCategory(category);
  const currentIndex = recipesInCategory.findIndex((recipe) => recipe.slug === currentSlug);

  return {
    prev: currentIndex > 0 ? recipesInCategory[currentIndex - 1] : null,
    next: currentIndex < recipesInCategory.length - 1 ? recipesInCategory[currentIndex + 1] : null
  };
}

/**
 * Get recipe items
 */
export async function getRecipeItems(): Promise<RecipeData[]> {
  const recipeEntries = await getAllRecipeEntries();
  return recipeEntries.map((recipe: RecipeEntry) => {
    return {
      title: recipe.data.title,
      path: `/recipes/${recipe.data.slug}/`,
      slug: recipe.data.slug,
      category: recipe.data.category || 'uncategorized',
      description: recipe.data.description,
      prepTime: recipe.data.prepTime,
      cookTime: recipe.data.cookTime,
      servings: recipe.data.servings,
      difficulty: recipe.data.difficulty,
      published: recipe.data.published
    };
  });
}

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;

  let totalMinutes = 0;
  const parts = timeStr.toLowerCase().split(' ');

  for (let i = 0; i < parts.length; i++) {
    const val = parseInt(parts[i]);
    if (!isNaN(val)) {
      const unit = parts[i + 1] || '';
      if (unit.includes('hour') || unit.includes('hr')) {
        totalMinutes += val * 60;
      } else if (unit.includes('min')) {
        totalMinutes += val;
      }
    }
  }
  return totalMinutes;
}

export function getRecipeTotalTime(recipe: RecipeData) {
  const prep = parseTimeToMinutes(recipe.prepTime || '');
  const cook = parseTimeToMinutes(recipe.cookTime || '');
  
  return `${prep + cook} mins`;
}