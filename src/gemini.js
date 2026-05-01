import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "YOUR_GEMINI_API_KEY"; // Replace with your actual key or use env
const genAI = new GoogleGenerativeAI(API_KEY);

export async function getAISuggestion(wardrobe, userRequest, season, weather, mood) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const wardrobeContext = wardrobe.map(i => ({
    id: i.id,
    name: i.name,
    category: i.category,
    color: i.color,
    occasions: i.occasions,
    formality: i.formality
  }));

  const prompt = `
    You are a professional fashion stylist. A user is asking for an outfit recommendation from their personal wardrobe.
    
    USER REQUEST: "${userRequest}"
    SEASON: "${season}"
    WEATHER: "${weather}"
    MOOD: "${mood}"
    
    WARDROBE DATA (JSON):
    ${JSON.stringify(wardrobeContext)}
    
    INSTRUCTIONS:
    1. Select exactly 3-5 items from the WARDROBE DATA that best fit the request.
    2. Return a JSON object with:
       - "title": A short catchy name for the outfit.
       - "itemIds": An array of the IDs of the selected items.
       - "reasons": An array of 3-4 short strings explaining why this specific combination works for the request and color theory.
       - "upgrades": An array of 2 short strings suggesting a style tip or small addition.
       - "confidence": A number from 70-98 representing how well this fits the request.

    Return ONLY valid JSON.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    // Clean potential markdown wrapping
    const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
}
