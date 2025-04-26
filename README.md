# Recipe Server

## Introduction

This server provides tools for generating Korean recipes based on ingredients provided by the user. The server uses the Cohere API to generate the recipes.

## Installation

To install the server, follow these steps:

1.  Install Node.js and npm.
2.  Clone this repository.
3.  Run `npm install` to install the dependencies.

### Configuring Claude Desktop

To configure Claude Desktop and connect the tools to it, follow these steps:

1.  Open Claude Desktop.
2.  Go to Settings > Preferences > Model Context Protocol.
3.  You also need to add the following configuration to your `claude_desktop_config.json` file:

```json
{
  "recipegenerator": {
    "command": "node",
    "args": [
      "put your directory here"
    ]
  }
}
```

You can also use other MCP clients like Claude to interact with the server.

## API KEY
Add your own Cohere API key in the index.js file.

https://docs.cohere.com/cohere-documentation

const apiKey = "ADD API KEY HERE";

## License

This project is licensed under the MIT License.


### Running the Server

To run the server, execute the following command in your terminal:

```bash
node index.js
```

This will start the MCP server, and it will be ready to receive requests from an MCP client.

### Calling the Server

You can call the server using an MCP client. Here's an example of how to call the `input_ingredients` tool using a CLI:



## Tools

The server provides the following tools:

- `set_language`: Sets the language for the recipe generation.
  - Parameters:
    - `lang`: `ko` for Korean, `en` for English.
  - Example Output:
    ```json
    {
      "content": [
        {
          "type": "text",
          "text": "✅ 언어가 한국어로 설정되었습니다."
        }
      ]
    }
    ```
- `input_allergy`: Adds an allergy to the list of allergies to exclude from the recipes.
  - Parameters:
    - `allergy`: The allergy to exclude.
  - Example Output:
    ```json
    {
      "content": [
        {
          "type": "text",
          "text": "✅ 알레르기 재료가 추가되었습니다: 땅콩"
        }
      ]
    }
    ```
- `type_food`: Sets the preferred cuisine for the recipe generation.
  - Parameters:
    - `cuisine`: `한식` (Korean), `중식` (Chinese), `일식` (Japanese), `양식` (Western), `기타` (Other).
  - Example Output:
    ```json
    {
      "content": [
        {
          "type": "text",
          "text": "✅ 선호 음식 종류가 “한식”(으)로 설정되었습니다."
        }
      ]
    }
    ```
- `input_ingredients`: Generates 3 recipes based on the provided ingredients, language, allergies, and cuisine.
  - Parameters:
    - `ingredients`: An array of ingredients.
  - Example Output:
    ```json
    {
      "content": [
        {
          "type": "text",
          "text": "Here are the 3 full recipes (in JSON format):\n\n[{\"name\":\"김치찌개\",\"ingredients\":[{\"name\":\"김치\",\"price\":2000},{\"name\":\"돼지고기\",\"price\":5000},{\"name\":\"두부\",\"price\":1000}],\"time\":\"30 minutes\",\"difficulty\":2,\"steps\":[\"1. 김치를 볶는다.\",\"2. 돼지고기를 넣고 볶는다.\",\"3. 두부와 물을 넣고 끓인다.\"],\"total cost\":8000},{\"name\":\"돼지고기 김치볶음\",\"ingredients\":[{\"name\":\"김치\",\"price\":2000},{\"name\":\"돼지고기\",\"price\":5000},{\"name\":\"양파\",\"price\":500}],\"time\":\"20 minutes\",\"difficulty\":1,\"steps\":[\"1. 김치와 돼지고기를 볶는다.\",\"2. 양파를 넣고 볶는다.\"],\"total cost\":7500},{\"name\":\"김치전\",\"ingredients\":[{\"name\":\"김치\",\"price\":2000},{\"name\":\"부침가루\",\"price\":1000},{\"name\":\"물\",\"price\":0}],\"time\":\"15 minutes\",\"difficulty\":1,\"steps\":[\"1. 김치, 부침가루, 물을 섞는다.\",\"2. 프라이팬에 굽는다.\"],\"total cost\":3000}]"
        },
        {
          "type": "text",
          "text": "🍲 레시피 1: 김치찌개\\n🛒 재료: 김치, 돼지고기, 두부\\n⏱️ 시간: 30 minutes / 난이도: 2\\n\\n🍲 레시피 2: 돼지고기 김치볶음\\n🛒 재료: 김치, 돼지고기, 양파\\n⏱️ 시간: 20 minutes / 난이도: 1\\n\\n🍲 레시피 3: 김치전\\n🛒 재료: 김치, 부침가루, 물\\n⏱️ 시간: 15 minutes / 난이도: 1\\n\\n(Use `expand_recipe` or `save_recipe` tool for more!)"
        }
      ]
    }
    ```
- `expand_recipe`: Expands a recipe to show the steps and estimated cost.
  - Parameters:
    - `index`: The index of the recipe to expand (1, 2, or 3).
  - Example Output:
    ```json
    {
      "content": [
        {
          "type": "text",
          "text": "📋 Recipe: \\"김치찌개\\"\\n💰 Estimated Cost: Unknown\\n⏱️ Time: 30 minutes / Difficulty: 2\\n\\n🧑‍🍳 Steps:\\n  1. 김치를 볶는다.\\n  2. 돼지고기를 넣고 볶는다.\\n  3. 두부와 물을 넣고 끓인다."
        }
      ]
    }
    ```
- `save_recipe`: Saves a recipe to the Desktop/Generated Recipes folder.
  - Parameters:
    - `index`: The index of the recipe to save (1, 2, or 3).
  - Example Output:
    ```json
    {
      "content": [
        {
          "type": "text",
          "text": "✅ \\"김치찌개\\" has been saved to your Desktop/Generated Recipes as \\"김치찌개.txt\\"."
        }
      ]
    }
