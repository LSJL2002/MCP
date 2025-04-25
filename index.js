import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

const server = new McpServer({
  name: "korean-recipe-server",
  version: "3.0.0"
});

const languageSettings = new Map();
const allergySettings  = new Map();
const cuisineSettings  = new Map();

// 1) 알레르기 등록 툴
server.tool(
  "food_allergies",
  { allergies: z.array(z.string()) },
  async ({ allergies }, ctx) => {
    allergySettings.set(ctx.sessionId, allergies);
    return {
      content: [
        { type: "text", text: `✅ 알레르기 재료가 저장되었습니다: ${allergies.join(", ")}` }
      ]
    };
  }
);

server.tool(
  "type_of_food",
  { cuisine: z.enum(["한식", "중식", "일식", "양식", "기타"]) },
  async ({ cuisine }, ctx) => {
    cuisineSettings.set(ctx.sessionId, cuisine);
    return {
      content: [
        {
          type: "text",
          text: `✅ 음식 종류가 “${cuisine}”(으)로 설정되었습니다.`
        }
      ]
    };
  }
);

// 🔐 Hardcoded API key (replace with your actual key)
const apiKey = "cvSzQEHn2ScRtCVDcyRN5K3ebBvaDubAT4bFA3lL";

server.tool(
  "recipe_rec",
  {},
  async (_, ctx) => {
    const lang = languageSettings.get(ctx.sessionId) || "ko";
    const allergies   = allergySettings.get(ctx.sessionId)   || [];
    const cuisineType = cuisineSettings.get(ctx.sessionId)   || "한식";

    let { ingredients } = JSON.parse(await fs.readFile(
      path.join("data", `${ctx.sessionId}-ingredients.json`), "utf-8"
    ));


    const allergyNote = allergies.length
      ? `\n\n주의: 다음 재료를 포함하지 마세요: ${allergies.join(", ")}`
      : "";
    
    const cuisineNote = `\n\n요리 종류: ${cuisineType}`;
    const result = await generateWithCoherePrompt(prompt);

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

    if (!data.text && !data.generations) {
      console.error("❌ Cohere API error:\n", data);
      return "❌ Cohere API returned no text. Check the logs for error.";
    }

    return data.text || data.generations?.[0]?.text || "❌ No valid response from Cohere.";
  } catch (err) {
    console.error("❌ Cohere request failed:\n", err);
    return "❌ Cohere API request failed.";
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

// Tool: Recipe Recommendation (calls Cohere)
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
    const result = await generateWithCohere(ingredients, lang);

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