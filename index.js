import fs from "fs";
import path from "path";
import os from "os";
import fetch from "node-fetch";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "recipe-server",
  version: "3.0.0"
});

const apiKey = "cvSzQEHn2ScRtCVDcyRN5K3ebBvaDubAT4bFA3lL";
const nutritionixAppId = "c8fc1217";   // ⚡ <-- Put your Nutritionix App ID here
const nutritionixApiKey = "6c588cadf8429dc79e20448399bd04a2	"; // ⚡ <-- Put your Nutritionix API Key here

const languageSettings = new Map();
const recipeCache      = new Map();
const allergySettings  = new Map();
const cuisineSettings  = new Map();


async function generateWithCohere(ingredients, lang, allergies, cuisine) {
  const allergyClause = allergies && allergies.length > 0
    ? `\n\nExclude any recipes that include these ingredients: ${allergies.join(", ")}`
    : "";

  const cuisineClause = cuisine
    ? `\n\nFocus on ${cuisine} recipes.`
    : "";

  const prompt = `
    You are an expert in ${cuisine || "Korean"} cooking.
    
    Based on these ingredients: ${ingredients.join(", ")}
    ${allergyClause}${cuisineClause}
    
    Suggest 3 recipes in **strict JSON** format only. Do not include explanations or any other text.
    
    Each recipe must include:
    - name (string)
    - ingredients (array of objects: { name: string, price: number }) in English
    - time (string, e.g., "30 minutes")
    - difficulty (integer 1-5)
    - steps (array of strings)
    - total cost (number)
    
    Respond ONLY with a valid JSON array of 3 objects like:
    [
      {
        "name": "Recipe Name",
        "ingredients": [
          { "name": "Eggs", "price": 1000 },
          ...
        ],
        "time": "30 minutes",
        "difficulty": 2,
        "steps": ["Step 1...", "Step 2..."],
        "total cost": 7000
      },
      ...
    ]
    Response language: ${lang === "ko" ? "Korean" : "English"}
  `.trim();

  try {
    const res = await fetch("https://api.cohere.ai/v1/chat", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "command-r-plus",
        message: prompt,
        temperature: 0.7,
        max_tokens: 1000
      })
    });
    const data = await res.json();
    return data.text || data.generations?.[0]?.text || "❌ No valid response from Cohere.";
  } catch (err) {
    console.error("❌ Cohere request failed:\n", err);
    return "❌ Cohere API request failed.";
  }
}

server.tool(
  "set_language",
  { lang: z.enum(["ko", "en"]) },
  async ({ lang }, ctx) => {
    languageSettings.set(ctx.sessionId, lang);
    return {
      content: [{
        type: "text",
        text: lang === "ko"
          ? "✅ 언어가 한국어로 설정되었습니다."
          : "✅ Language has been set to English."
      }]
    };
  }
);

server.tool(
  "input_allergy",
  { allergy: z.string() },
  async ({ allergy }, ctx) => {
    const sess = ctx.sessionId;
    const list = allergySettings.get(sess) || [];
    list.push(allergy);
    allergySettings.set(sess, list);
    return {
      content: [{
        type: "text",
        text: `✅ 알레르기 재료가 추가되었습니다: ${allergy}`
      }]
    };
  }
);

server.tool(
  "type_food",
  { cuisine: z.enum(["한식", "중식", "일식", "양식", "기타"]) },
  async ({ cuisine }, ctx) => {
    cuisineSettings.set(ctx.sessionId, cuisine);
    return {
      content: [{
        type: "text",
        text: `✅ 선호 음식 종류가 “${cuisine}”(으)로 설정되었습니다.`
      }]
    };
  }
);

server.tool(
  "input_ingredients",
  { ingredients: z.array(z.string()) },
  async ({ ingredients }, ctx) => {
    const sess      = ctx.sessionId;
    const lang      = languageSettings.get(sess) || "ko";
    const allergies = allergySettings.get(sess)   || [];
    const cuisine   = cuisineSettings.get(sess)   || "한식";

    const raw = await generateWithCohere(ingredients, lang, allergies, cuisine);

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error("❌ JSON parsing error:", err);
      return {
        content: [{ type: "text", text: "❌ 생성된 응답이 JSON 형식이 아닙니다." }]
      };
    }

    recipeCache.set(sess, parsed);

    const formattedRecipes = parsed.map((r, idx) => {
      return `🍲 레시피 ${idx + 1}: ${r.name}\n` +
             `🛒 재료: ${r.ingredients.map(i => i.name).join(", ")}\n` +
             `⏱️ 시간: ${r.time} / 난이도: ${r.difficulty}\n`;
    }).join("\n\n");

    return {
      content: [
        {
          type: "text",
          text: "Here are the 3 full recipes (in JSON format):\n\n" +
                JSON.stringify(parsed, null, 2)
        },
        {
          type: "text",
          text: formattedRecipes + "\n\n(Use `expand_recipe` or `save_recipe` tool for more!)"
        }
      ]
    };
  }
);

server.tool(
  "expand_recipe",
  { index: z.enum(["1", "2", "3"]) },
  async ({ index }, ctx) => {
    const recipes = recipeCache.get(ctx.sessionId);
    if (!recipes) {
      return { content: [{ type: "text", text: "❌ No recipe data available. Please input ingredients first." }] };
    }
    const idx = parseInt(index, 10) - 1;
    const recipe = recipes[idx];
    if (!recipe) {
      return { content: [{ type: "text", text: "❌ Invalid recipe number." }] };
    }
    return {
      content: [{
        type: "text",
        text:
          `📋 Recipe: "${recipe.name}"\n` +
          `💰 Estimated Cost: ${recipe["total cost"] || "Unknown"}\n` +
          `⏱️ Time: ${recipe.time} / Difficulty: ${recipe.difficulty}\n\n` +
          `🧑‍🍳 Steps:\n` +
          recipe.steps.map((s, i) => `  ${i + 1}. ${s}`).join("\n")
      }]
    };
  }
);

server.tool(
  "save_recipe",
  { index: z.enum(["1", "2", "3"]) },
  async ({ index }, ctx) => {
    const recipes = recipeCache.get(ctx.sessionId);
    if (!recipes) {
      return { content: [{ type: "text", text: "❌ No recipe data to save. Please input ingredients first." }] };
    }
    const idx = parseInt(index, 10) - 1;
    const recipe = recipes[idx];
    if (!recipe) {
      return { content: [{ type: "text", text: "❌ Invalid recipe number." }] };
    }

    const desktopPath = path.join(os.homedir(), "Desktop");
    const folderPath  = path.join(desktopPath, "Generated Recipes");
    const fileName    = `${recipe.name.replace(/\s+/g, "_")}.txt`;
    const filePath    = path.join(folderPath, fileName);

    if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath);

    const fileContent =
      `Recipe: ${recipe.name}\n` +
      `Time: ${recipe.time} minutes\n` +
      `Difficulty: ${recipe.difficulty}/5\n\n` +
      `Ingredients:\n` +
      recipe.ingredients.map(i => `- ${i.name} (${i.price}₩)`).join("\n") +
      `\n\nSteps:\n` +
      recipe.steps.map((s, i) => `${i + 1}. ${s}`).join("\n");

    try {
      fs.writeFileSync(filePath, fileContent);
      return {
        content: [{
          type: "text",
          text: `✅ "${recipe.name}" has been saved to your Desktop/Generated Recipes as "${fileName}".`
        }]
      };
    } catch (err) {
      console.error("❌ File write failed:", err);
      return { content: [{ type: "text", text: "❌ Failed to save file." }] };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
