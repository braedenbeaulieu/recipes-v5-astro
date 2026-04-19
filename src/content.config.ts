import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const recipes = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/recipes' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    category: z.string(),
    description: z.string().optional(),
    prepTime: z.string().optional(),
    cookTime: z.string().optional(),
    totalTime: z.string().optional(),
    servings: z.union([z.string(), z.number()]).optional(),
    difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
    tags: z.array(z.string()).optional(),
    image: z.string().optional().nullable(),
    published: z.boolean().optional().default(true)
  })
});

export const collections = {
  recipes
};
