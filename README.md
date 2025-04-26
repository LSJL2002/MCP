# Korean Recipe Server

This is an MCP server that provides tools for generating Korean recipes based on ingredients provided by the user. The server uses the Cohere API to generate the recipes.

## Tools

The server provides the following tools:

- `set_language`: Sets the language for the recipe generation.
  - Parameters:
    - `lang`: `ko` for Korean, `en` for English.
- `input_allergy`: Adds an allergy to the list of allergies to exclude from the recipes.
  - Parameters:
    - `allergy`: The allergy to exclude.
- `type_food`: Sets the preferred cuisine for the recipe generation.
  - Parameters:
    - `cuisine`: `한식` (Korean), `중식` (Chinese), `일식` (Japanese), `양식` (Western), `기타` (Other).
- `input_ingredients`: Generates 3 recipes based on the provided ingredients, language, allergies, and cuisine.
  - Parameters:
    - `ingredients`: An array of ingredients.
- `expand_recipe`: Expands a recipe to show the steps and estimated cost.
  - Parameters:
    - `index`: The index of the recipe to expand (1, 2, or 3).
- `save_recipe`: Saves a recipe to the Desktop/Generated Recipes folder.
  - Parameters:
    - `index`: The index of the recipe to save (1, 2, or 3).

## Usage

To use this server, you need to have an MCP client connected to it. You can then use the tools provided by the server to generate recipes.

### Example

1.  Set the language to Korean:

    ```json
    {
      "tool_name": "set_language",
      "arguments": {
        "lang": "ko"
      }
    }
    ```

2.  Add an allergy to the list of allergies to exclude:

    ```json
    {
      "tool_name": "input_allergy",
      "arguments": {
        "allergy": "땅콩"
      }
    }
    ```

3.  Set the preferred cuisine to Korean:

    ```json
    {
      "tool_name": "type_food",
      "arguments": {
        "cuisine": "한식"
      }
    }
    ```

4.  Generate 3 recipes based on the provided ingredients:

    ```json
    {
      "tool_name": "input_ingredients",
      "arguments": {
        "ingredients": ["김치", "돼지고기"]
      }
    }
    ```

5.  Expand the first recipe to show the steps and estimated cost:

    ```json
    {
      "tool_name": "expand_recipe",
      "arguments": {
        "index": "1"
      }
    }
    ```

6.  Save the first recipe to the Desktop/Generated Recipes folder:

    ```json
    {
      "tool_name": "save_recipe",
      "arguments": {
        "index": "1"
      }
    }
