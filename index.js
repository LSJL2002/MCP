import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const server = new McpServer({
  name: "korean-recipe-server",
  version: "3.0.0"
});

const languageSettings = new Map();

// 🔧 Gemini API Helper (with Claude log support)
async function generateWithGemini(ingredients, lang) {
  const apiKey = process.env.GEMINI_API_KEY;
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
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await res.json();

    if (!data.candidates) {
      console.error("❌ Gemini API error response:\n" + JSON.stringify(data, null, 2));
      return "❌ Gemini API returned no candidates. Check Claude logs for error.";
    }

    return data.candidates[0].content.parts[0].text;
  } catch (err) {
    console.error("❌ Gemini request failed:\n", err);
    return "❌ Gemini API request failed.";
  }
}

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

// Tool: Input Ingredients
server.tool(
  "input_ingredients",
  { ingredients: z.array(z.string()) },
  async ({ ingredients }, ctx) => {
    const filePath = path.join("data", `${ctx.sessionId}-ingredients.json`);
    await fs.mkdir("data", { recursive: true });
    await fs.writeFile(filePath, JSON.stringify({ ingredients }, null, 2));

    return {
      content: [{
        type: "text",
        text: "✅ Ingredients saved successfully!"
      }]
    };
  }
);

// Tool: Recipe Recommendation (calls Gemini)
server.tool(
  "recipe_rec",
  {},
  async (_, ctx) => {
    const lang = languageSettings.get(ctx.sessionId) || "ko";
    const filePath = path.join("data", `${ctx.sessionId}-ingredients.json`);
    let fileData;

    try {
      fileData = JSON.parse(await fs.readFile(filePath, "utf-8"));
    } catch {
      return {
        content: [{
          type: "text",
          text: lang === "ko"
            ? "❌ 저장된 재료가 없습니다. 먼저 재료를 입력해주세요."
            : "❌ No saved ingredients found. Please input them first."
        }]
      };
    }

    const { ingredients } = fileData;
    const result = await generateWithGemini(ingredients, lang);

    return {
      content: [{
        type: "text",
        text: lang === "ko"
          ? `🍽️ 추천된 레시피:\n${result}`
          : `🍽️ Recommended Recipes:\n${result}`
      }]
    };
  }
);

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);
