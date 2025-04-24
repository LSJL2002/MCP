import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "korean-recipe-server",
  version: "3.0.0"
});

// 🔐 Replace with your actual API key
const apiKey = "cvSzQEHn2ScRtCVDcyRN5K3ebBvaDubAT4bFA3lL";

const languageSettings = new Map();

async function callCohere(prompt) {
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
  return await callCohere(prompt);
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

// Tool: Input Ingredients + Generate Recipes
server.tool(
  "input_ingredients",
  { ingredients: z.array(z.string()) },
  async ({ ingredients }, ctx) => {
    const lang = languageSettings.get(ctx.sessionId) || "ko";
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

// 🔍 Tool: Expand Steps for a Chosen Recipe
server.tool(
  "expand_recipe_steps",
  {
    name: z.string(),
    steps: z.array(z.string())
  },
  async ({ name, steps }, ctx) => {
    const lang = languageSettings.get(ctx.sessionId) || "ko";
    const prompt = `
You are a Korean cooking expert.

A user selected the recipe "${name}". These are the current steps:
${steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}

Please rewrite and expand them into more detailed cooking instructions, one step per item.
Respond in ${lang === "ko" ? "Korean" : "English"}.
Only return a numbered list of improved steps.
`;

    const detailed = await callCohere(prompt);

    return {
      content: [{
        type: "text",
        text: lang === "ko"
          ? `👩‍🍳 자세한 조리 단계:\n${detailed}`
          : `👩‍🍳 Detailed Cooking Steps:\n${detailed}`
      }]
    };
  }
);

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);
