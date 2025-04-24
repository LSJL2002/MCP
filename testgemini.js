import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.COHERE_API_KEY;
const prompt = `Suggest 3 Korean recipes using rice, eggs, and spring onions. Respond in JSON with name, ingredients, time, difficulty, steps.`;

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
console.log(JSON.stringify(data, null, 2));
