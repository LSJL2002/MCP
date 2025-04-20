import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "korean-recipe-server",
  version: "2.0.0"
});

const userIngredients = new Map();
const selectedRecipe = new Map();
const languageSettings = new Map();

// Tool: Set Language
server.tool(
  "set_language",
  { lang: z.enum(["ko", "en"]) },
  async ({ lang }, ctx) => {
    languageSettings.set(ctx.sessionId, lang);
    return {
      content: [
        {
          type: "text",
          text: lang === "ko"
            ? "✅ 언어가 한국어로 설정되었습니다."
            : "✅ Language has been set to English."
        }
      ]
    };
  }
);

// Helper: Translate recipe content
function translate(recipe, lang) {
  if (lang === "en") {
    return {
      name: recipe.name === "계란찜" ? "Steamed Egg" :
            recipe.name === "계란볶음밥" ? "Egg Fried Rice" : recipe.name,
      ingredients: recipe.ingredients,
      time: recipe.time.includes("분") ? recipe.time.replace("분", " min") : recipe.time,
      difficulty: recipe.difficulty === "쉬움" ? "Easy" :
                  recipe.difficulty === "보통" ? "Medium" :
                  recipe.difficulty === "어려움" ? "Hard" : recipe.difficulty,
      steps: recipe.steps
    };
  } else {
    return recipe;
  }
}

// Tool: Input Ingredients + Claude integration
server.tool(
  "input_ingredients",
  { ingredients: z.array(z.string()) },
  async ({ ingredients }, ctx) => {
    userIngredients.set(ctx.sessionId, ingredients);
    const lang = languageSettings.get(ctx.sessionId) || "ko";

    const response = await ctx.runModel({
      name: "claude-3-opus",
      prompt: `
You are a Korean recipe expert. Based on the following ingredients:

${ingredients.join(", ")}

Suggest one Korean dish that can be made with them. Return:
- Name of the dish
- List of required ingredients
- Time needed (in minutes)
- Difficulty (Easy, Medium, Hard)
- Cooking steps

Respond in ${lang === "ko" ? "Korean" : "English"}.

Format it as JSON:
{
  "name": "",
  "ingredients": [],
  "time": "",
  "difficulty": "",
  "steps": []
}
`
    });

    let recipe;
    try {
      recipe = JSON.parse(response.text);
    } catch (e) {
      return {
        content: [
          {
            type: "text",
            text: lang === "ko"
              ? "❌ 레시피 생성에 실패했습니다. 다시 시도해주세요."
              : "❌ Failed to generate a recipe. Please try again."
          }
        ]
      };
    }

    selectedRecipe.set(ctx.sessionId, JSON.stringify([recipe]));
    const tr = translate(recipe, lang);

    return {
      content: [
        { type: "text", text: `✅ ${lang === "ko" ? "추천 요리" : "Suggested recipe"}: ${tr.name}` },
        { type: "text", text: `${lang === "ko" ? "재료" : "Ingredients"}: ${tr.ingredients.join(", ")}` },
        { type: "text", text: `${lang === "ko" ? "조리 시간" : "Cooking time"}: ${tr.time}` },
        { type: "text", text: `${lang === "ko" ? "난이도" : "Difficulty"}: ${tr.difficulty}` },
        {
          type: "text",
          text: `${lang === "ko" ? "조리법" : "Instructions"}:\n` +
                tr.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")
        }
      ]
    };
  }
);

// Tool: Select Recipe (Still needed in case you allow multiple later)
server.tool(
  "select_recipe",
  { choice: z.number() },
  async ({ choice }, ctx) => {
    const lang = languageSettings.get(ctx.sessionId) || "ko";
    const raw = selectedRecipe.get(ctx.sessionId);

    if (!raw) {
      return {
        content: [{
          type: "text",
          text: lang === "ko"
            ? "먼저 식재료를 입력해주세요."
            : "Please input ingredients first."
        }]
      };
    }

    const recipes = JSON.parse(raw);
    const recipe = recipes[choice - 1];

    if (!recipe) {
      return {
        content: [{
          type: "text",
          text: lang === "ko"
            ? "올바른 번호를 선택해주세요."
            : "Please select a valid recipe number."
        }]
      };
    }

    const tr = translate(recipe, lang);

    return {
      content: [
        { type: "text", text: `✅ ${lang === "ko" ? "선택된 요리" : "Selected recipe"}: ${tr.name}` },
        { type: "text", text: `${lang === "ko" ? "필요한 재료" : "Ingredients"}: ${tr.ingredients.join(", ")}` },
        { type: "text", text: `${lang === "ko" ? "조리 시간" : "Cooking time"}: ${tr.time}` },
        { type: "text", text: `${lang === "ko" ? "난이도" : "Difficulty"}: ${tr.difficulty}` },
        {
          type: "text",
          text: `${lang === "ko" ? "조리법" : "Instructions"}:\n` +
                tr.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")
        }
      ]
    };
  }
);

// Connect to stdio
const transport = new StdioServerTransport();
await server.connect(transport);
