import fs from "fs";
import path from "path";
import os from "os";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Initialize the MCP server
const server = new McpServer({
  name: "korean-recipe-server",
  version: "3.0.0"
});

const apiKey = "cvSzQEHn2ScRtCVDcyRN5K3ebBvaDubAT4bFA3lL";
const languageSettings = new Map();
const recipeCache = new Map();

async function generateWithCohere(ingredients, lang) {
  const prompt = `
You are a Korean cooking expert.

Based on these ingredients: ${ingredients.join(", ")}

Suggest 3 Korean recipes. For each, return:
- name
- ingredients
- time (in minutes)
- difficulty (1–5)
- steps

Respond in ${lang === "ko" ? "Korean" : "English"}.
Respond only in valid JSON format like:
[
  {
    "name": "...",
    "ingredients": [...],
    "time": "...",
    "difficulty": ...,
    "steps": [...]
  }
]
`;

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

// Set language tool
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

// Input ingredients tool
server.tool(
  "input_ingredients",
  { ingredients: z.array(z.string()) },
  async ({ ingredients }, ctx) => {
    const lang = languageSettings.get(ctx.sessionId) || "ko";
    const raw = await generateWithCohere(ingredients, lang);

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error("❌ JSON parsing error:", err);
      return {
        content: [{ type: "text", text: "❌ 생성된 응답이 JSON 형식이 아닙니다." }]
      };
    }

    recipeCache.set(ctx.sessionId, parsed);

    const formattedRecipes = parsed.map((r, idx) => {
      return `🍲 레시피 ${idx + 1}: ${r.name}\n` +
        `🛒 재료: ${r.ingredients.join(", ")}\n` +
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

// Expand recipe tool
server.tool(
  "expand_recipe",
  { index: z.enum(["1", "2", "3"]) },
  async ({ index }, ctx) => {
    const recipes = recipeCache.get(ctx.sessionId);
    if (!recipes) {
      return {
        content: [{ type: "text", text: "❌ No recipe data available. Please input ingredients first." }]
      };
    }

    const idx = parseInt(index, 10) - 1;
    const recipe = recipes[idx];

    if (!recipe) {
      return {
        content: [{ type: "text", text: "❌ Invalid recipe number." }]
      };
    }

    return {
      content: [
        {
          type: "text",
          text:
            `📋 Steps for "${recipe.name}":\n\n` +
            recipe.steps.map((s, i) => `  ${i + 1}. ${s}`).join("\n")
        }
      ]
    };
  }
);

// Save recipe tool
server.tool(
  "save_recipe",
  { index: z.enum(["1", "2", "3"]) },
  async ({ index }, ctx) => {
    const recipes = recipeCache.get(ctx.sessionId);
    if (!recipes) {
      return {
        content: [{ type: "text", text: "❌ No recipe data to save. Please input ingredients first." }]
      };
    }

    const idx = parseInt(index, 10) - 1;
    const recipe = recipes[idx];

    if (!recipe) {
      return {
        content: [{ type: "text", text: "❌ Invalid recipe number." }]
      };
    }

    const desktopPath = path.join(os.homedir(), "Desktop");
    const fileName = `${recipe.name.replace(/\s+/g, "_")}.txt`;
    const filePath = path.join(desktopPath, fileName);

    const fileContent =
      `Ingredients:\n` +
      recipe.ingredients.map(i => `- ${i}`).join("\n") +
      `\n\nSteps:\n` +
      recipe.steps.map((s, i) => `${i + 1}. ${s}`).join("\n");

    try {
      fs.writeFileSync(filePath, fileContent);
      return {
        content: [
          {
            type: "text",
            text: `✅ "${recipe.name}" has been saved to your Desktop as "${fileName}".`
          }
        ]
      };
    } catch (err) {
      console.error("❌ File write failed:", err);
      return {
        content: [{ type: "text", text: "❌ Failed to save file." }]
      };
    }
  }
);

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);
