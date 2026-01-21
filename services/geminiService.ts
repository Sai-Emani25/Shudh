import { GoogleGenAI } from "@google/genai";
import { AnalysisResult } from "../types.ts";

export class GeminiService {
  private cleanJson(text: string): string {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? jsonMatch[0] : text.trim();
  }

  async analyzeIngredients(input: { imageDatas?: string[]; url?: string; productName?: string }): Promise<AnalysisResult> {
    const apiKey = (process.env.GEMINI_API_KEY || process.env.API_KEY) as string;
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `
      You are "Shudh Lens Pro", a world-class senior clinical toxicologist powered by real-time data.
      
      CORE MISSION:
      Use 'googleSearch' to verify EVERY claim. If information in the provided images contradicts reputable scientific sources or official manufacturer ingredient lists found via search, YOU MUST OVERWRITE IMAGE DATA WITH SEARCH ENGINE DATA. Accuracy is the highest priority.
      
      CRITICAL VALIDATION:
      1. Detect if the input is a food product. If not, return the standard error JSON.
      2. Identify "Product Labels" (e.g., Organic, Non-GMO, Bioengineered, Gluten-Free, Fair Trade, Vegan, High-Fructose Warning). Explain the health impact of these labels.
      
      STRICT VERIFICATION:
      - Compare OCR text from images with live search results for the product: ${input.productName || 'the items in the image'}.
      - Detect hidden chemicals not explicitly readable but verified to be in this product version via search.
      
      STRICT PENALTY SCORING (0-100):
      - 90+: Verified Carcinogens, Endocrine Disruptors, or banned substances (e.g., Titanium Dioxide in some regions).
      - +25: Harmful emulsifiers (Carrageenan, Polysorbate 80).
      - +20: Synthetic colors (Red 40, Yellow 5).
      
      Output ONLY valid JSON.
    `;

    const prompt = `
      Perform a deep toxicological audit. 
      Product: ${input.productName || 'Content in scans'}
      Target URL: ${input.url || 'None'}
      
      Steps:
      1. Extract visible ingredients from scans.
      2. SEARCH GOOGLE to confirm the full ingredient list for this product.
      3. Identify any certifications, warnings, or labels (e.g. "Contains Bioengineered Food Ingredients").
      4. Correct any image OCR errors using search data.
      
      JSON SCHEMA:
      {
        "productName": "string",
        "riskScore": number,
        "overallFlag": "RED" | "YELLOW" | "GREEN",
        "summary": "string",
        "longTermEffects": "string",
        "ingredients": [
          {
            "name": "string",
            "category": "string",
            "hazardLevel": "Low" | "Moderate" | "High",
            "description": "string",
            "potentialRisks": ["string"],
            "benefits": ["string"],
            "flag": "RED" | "YELLOW" | "GREEN"
          }
        ],
        "productLabels": [
          { "title": "string", "impact": "string", "isPositive": boolean }
        ],
        "nutritionalInsights": [],
        "verifiedSources": []
      }
    `;

    const parts: any[] = [{ text: prompt }];
    if (input.imageDatas && input.imageDatas.length > 0) {
      input.imageDatas.forEach(data => {
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: data.includes('base64,') ? data.split(',')[1] : data
          }
        });
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview", // Switched to flash for fast search grounding
        contents: [{ role: 'user', parts }],
        config: {
          systemInstruction,
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          temperature: 0.1,
        }
      });

      const rawText = response.text || "{}";
      const cleanedJson = this.cleanJson(rawText);
      const result = JSON.parse(cleanedJson) as AnalysisResult;

      // Mandatory: Extract sources from grounding chunks
      const groundingMetadata = (response.candidates?.[0] as any)?.groundingMetadata;
      if (groundingMetadata?.groundingChunks) {
        const searchSources = groundingMetadata.groundingChunks
          .filter((chunk: any) => chunk.web)
          .map((chunk: any) => ({
            title: chunk.web.title,
            uri: chunk.web.uri
          }));

        // Merge with existing sources if any
        result.verifiedSources = [...(result.verifiedSources || []), ...searchSources].slice(0, 8);
      }

      result.scannedImages = input.imageDatas;
      return result;
    } catch (error) {
      console.error("Gemini Search Error:", error);
      throw new Error("Unable to verify product data via clinical search. Please check your connection.");
    }
  }
}