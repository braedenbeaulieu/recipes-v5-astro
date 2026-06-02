export default {
    async fetch(request, env, ctx) {
        try {
            const reqUrl = new URL(request.url);

            // =========================================
            // AUTHENTICATION
            // =========================================
            const providedKey = reqUrl.searchParams.get("key");
            
            if (!providedKey || providedKey !== env.API_PASSCODE) {
                return new Response("Unauthorized: Invalid API Key", { status: 401 });
            }

            // =========================================
            // TARGET URL
            // =========================================
            const targetUrl = reqUrl.searchParams.get("url");
            
            if (!targetUrl) {
                return new Response("Bad Request: Missing ?url=https://...", { status: 400 });
            }

            // =========================================
            // FETCH PAGE
            // =========================================
            const pageRes = await fetch(targetUrl, {
                headers: {
                    "user-agent": "Mozilla/5.0 (compatible; RecipeBot/1.0)"
                }
            });

            if (!pageRes.ok) {
                return new Response(`Error: Failed to fetch page (${pageRes.status})`, { status: 500 });
            }

            const html = await pageRes.text();

            // =========================================
            // EXTRACT RECIPE
            // =========================================
            const recipe = extractRecipeFromJsonLd(html);

            if (!recipe) {
                return new Response("Error: No recipe schema found on this page.", { status: 500 });
            }

            // =========================================
            // GENERATE MARKDOWN
            // =========================================
            const markdown = generateMarkdown(recipe);

            return new Response(markdown, {
                headers: {
                    "content-type": "text/markdown; charset=utf-8"
                }
            });
            
        } catch (err) {
            return new Response(`Error: ${err.message}\n${err.stack}`, { status: 500 });
        }
    }
};

// =========================================
// EXTRACTION & NORMALIZATION
// =========================================

function extractRecipeFromJsonLd(html) {
    const scripts = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];

    for (const match of scripts) {
        try {
            const raw = match[1].trim();
            const parsed = JSON.parse(raw);
            const recipe = findRecipeObject(parsed);

            if (recipe) {
                return normalizeRecipe(recipe);
            }
        } catch (e) {
            // Ignore invalid JSON-LD blocks and continue searching
        }
    }
    return null;
}

function findRecipeObject(obj) {
    if (!obj) return null;

    if (Array.isArray(obj)) {
        for (const item of obj) {
            const found = findRecipeObject(item);
            if (found) return found;
        }
    }

    if (typeof obj === "object") {
        const type = Array.isArray(obj["@type"]) ? obj["@type"] : [obj["@type"]];
        if (type.includes("Recipe")) return obj;
        if (obj["@graph"]) return findRecipeObject(obj["@graph"]);
    }
    return null;
}

function normalizeRecipe(recipe) {
    const title = recipe.name || "Untitled Recipe";
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    
    // Formatting Tags
    let tags = [];
    if (typeof recipe.keywords === "string") {
        tags = recipe.keywords.split(",").map(t => t.trim());
    } else if (Array.isArray(recipe.keywords)) {
        tags = recipe.keywords;
    }

    return {
        category: recipe.recipeCategory || "dinner", // Falls back to dinner
        title,
        slug,
        description: recipe.description || "",
        prepTime: formatTime(recipe.prepTime),
        cookTime: formatTime(recipe.cookTime),
        totalTime: formatTime(recipe.totalTime),
        servings: recipe.recipeYield ? (Array.isArray(recipe.recipeYield) ? recipe.recipeYield[0] : recipe.recipeYield) : "1",
        difficulty: tags.some(t => t.toLowerCase().includes("easy")) ? "Easy" : "Medium",
        tags,
        ingredients: recipe.recipeIngredient || [],
        instructions: normalizeInstructions(recipe.recipeInstructions)
    };
}

function normalizeInstructions(instructions) {
    if (!instructions) return [];

    if (typeof instructions === "string") {
        return [{ title: "Directions", text: instructions }];
    }

    if (Array.isArray(instructions)) {
        const steps = [];
        for (const item of instructions) {
            // If it's a section, group the steps under the section title
            if (item["@type"] === "HowToSection") {
                const sectionName = item.name || "Directions";
                const subSteps = item.itemListElement || [];
                const combinedText = subSteps.map(sub => sub.text || "").join("\n\n");
                
                steps.push({
                    title: sectionName,
                    text: combinedText
                });
            } 
            // If it's a standalone step
            else if (item["@type"] === "HowToStep") {
                steps.push({
                    title: item.name && item.name !== item.text ? item.name : `Step ${steps.length + 1}`,
                    text: item.text || ""
                });
            } 
            // Fallback for flat strings
            else if (typeof item === "string") {
                steps.push({
                    title: `Step ${steps.length + 1}`,
                    text: item
                });
            }
        }
        return steps;
    }

    if (typeof instructions === "object") {
        return normalizeInstructions([instructions]);
    }

    return [];
}

// Convert ISO 8601 durations (PT1H30M) to readable strings (1 hr 30 mins)
function formatTime(isoStr) {
    if (!isoStr) return "";
    const match = isoStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return isoStr;
    
    const hours = match[1] ? `${match[1]} hr${match[1] > 1 ? 's' : ''}` : "";
    const minutes = match[2] ? `${match[2]} mins` : "";
    return [hours, minutes].filter(Boolean).join(" ");
}

// =========================================
// MARKDOWN GENERATOR
// =========================================

function generateMarkdown(recipe) {
    const tags = recipe.tags.length > 0 
        ? recipe.tags.map(tag => `    - ${tag.toLowerCase().replace(/\s+/g, '-')}`).join("\n") 
        : "    - recipe";

    const ingredients = recipe.ingredients.map(i => `- ${i}`).join("\n");

    const directions = recipe.instructions.map(step => `### ${step.title}\n\n${step.text}`).join("\n\n");

    return `---
category: ${recipe.category}
title: ${recipe.title}
slug: ${recipe.slug}
description: ${recipe.description}
prepTime: ${recipe.prepTime}
cookTime: ${recipe.cookTime}
totalTime: ${recipe.totalTime}
servings: ${recipe.servings}
difficulty: ${recipe.difficulty}
tags:
${tags}
published: true
---

## Ingredients

${ingredients}

## Tools

- Mixing bowl
- Measuring tools
- Standard kitchen tools

## Directions

${directions}

## Notes

- Generated automatically from ${recipe.title}.
`;
}