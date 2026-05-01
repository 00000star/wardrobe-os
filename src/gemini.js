import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyDLh6o2E82_vMX-SrqjGHA7LK_rD4Aj-4Q"; // Automatically generated from gcloud session
const genAI = new GoogleGenerativeAI(API_KEY);

export async function analyzeImage(base64Image) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    Analyze this piece of clothing from a photo. 
    Return a JSON object with:
    - "name": A concise, descriptive name (e.g., "Navy Blue Slim Fit Chinos").
    - "category": Must be one of: ["Shirts", "Trousers", "Shoes", "Jackets", "Knitwear", "Accessories"].
    - "color": One dominant color from: ["White", "Black", "Navy", "Blue", "Brown", "Beige", "Grey", "Green", "Burgundy", "Cream"].
    - "occasions": An array of fitting occasions from: ["Casual", "Smart Casual", "Business Casual", "Formal", "Date Night", "Weekend"].
    - "seasons": An array of fitting seasons from: ["Summer", "Winter", "Rainy", "All Season"].
    - "formality": A number from 1 (very casual) to 5 (formal).
    
    Return ONLY valid JSON.
  `;

  try {
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image.split(",")[1],
          mimeType: "image/jpeg"
        }
      }
    ]);
    const response = await result.response;
    const text = response.text();
    const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini Vision Error:", error);
    return null;
  }
}

export async function getAISuggestion(wardrobe, userRequest, season, weather, mood) {
  // ... existing implementation ...
}

export async function buildCapsule(wardrobe, prompt) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const wardrobeContext = wardrobe.map(i => ({
    id: i.id,
    name: i.name,
    category: i.category,
    color: i.color,
    formality: i.formality
  }));

  const aiPrompt = `
    Create a highly versatile 10-piece capsule wardrobe from the user's closet.
    USER THEME/PROMPT: "${prompt}"
    
    WARDROBE DATA:
    ${JSON.stringify(wardrobeContext)}
    
    INSTRUCTIONS:
    1. Select exactly 10 items that work perfectly together for the given theme.
    2. Ensure a mix of tops, bottoms, shoes, and layers.
    3. Return a JSON object with:
       - "title": A name for this capsule.
       - "itemIds": Array of the 10 selected item IDs.
       - "explanation": A short paragraph (2-3 sentences) explaining why these 10 items create a cohesive capsule.

    Return ONLY valid JSON.
  `;

  try {
    const result = await model.generateContent(aiPrompt);
    const response = await result.response;
    const text = response.text();
    const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini Capsule Error:", error);
    return null;
  }
}
