import { GoogleGenAI } from "@google/genai";
import { WeeklyPlan, BudgetSettings } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const generateWeeklyPlan = async (budget: BudgetSettings, preferences: string = "") => {
  const model = "gemini-3-flash-preview";
  const prompt = `
    Generate a weekly meal plan (Saturday to Sunday) for a budget of ${budget.monthlyBudget / 4} ${budget.currency} per week.
    Number of family members (servings): ${budget.servings}
    User preferences: ${preferences}
    
    IMPORTANT: ALL OUTPUT MUST BE IN INDONESIAN LANGUAGE (Bahasa Indonesia).
    
    Requirements:
    - Each meal (Breakfast, Lunch, Dinner) MUST have 2 items: 1 Vegetable dish and 1 Main dish (Lauk).
    - Include optional snacks/desserts.
    - STRATEGY: Optimize for ingredient reuse. Choose dishes that share common raw ingredients to minimize waste and cost.
    - Provide estimated prices for each item in ${budget.currency}, scaled for ${budget.servings} people.
    - For each item, provide a list of "ingredients" and a short list of "instructions" (recipe steps).
    - Generate a COMPREHENSIVE shopping list divided into "raw" (bahan baku) and "spice" (bumbu-bumbu), with quantities scaled for ${budget.servings} people.
    - The output must be valid JSON matching the WeeklyPlan structure.
    
    Structure:
    {
      "plan": {
        "Sabtu": {
          "breakfast": { "items": [{"name": "...", "category": "vegetable", "estimatedPrice": 0, "ingredients": ["..."], "instructions": ["..."]}] },
          ...
        },
        ...
      },
      "shoppingList": [
        {"name": "Chicken", "price": 50000, "quantity": "1kg", "category": "raw"},
        {"name": "Garlic", "price": 5000, "quantity": "100g", "category": "spice"}
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });
    return JSON.parse(response.text || "{}") as WeeklyPlan;
  } catch (error) {
    console.error("Error generating plan:", error);
    return null;
  }
};

export const estimatePrices = async (items: string[], currency: string) => {
  const model = "gemini-3-flash-preview";
  const prompt = `
    Estimate the current market prices for these grocery items in ${currency}.
    Items: ${items.join(", ")}
    Return a JSON array of objects: [{"name": "...", "price": 0, "quantity": "e.g. 1kg", "category": "..."}]
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Error estimating prices:", error);
    return [];
  }
};
