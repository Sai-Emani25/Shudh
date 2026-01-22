
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, SafetyFlag } from "../types.ts";

export class GeminiService {
  /**
   * Performs toxicological audit using Gemini 3 Pro with search grounding.
   * Adheres to the latest GenAI SDK guidelines.
   */
  async analyzeIngredients(input: { imageDatas?: string[]; url?: string; productName?: string }): Promise<AnalysisResult> {
    // Guidelines: Create a new instance right before making an API call to ensure latest key is used.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const systemInstruction = `
      You are "Shudh Clinical Auditor", a clinical toxicologist.
      
      MANDATORY: Use 'googleSearch' to verify the product: ${input.productName || 'the item in the images'}.
      
      RULES:
      1. Cross-reference visual data with search results. Search is the source of truth for ingredients.
      2. Identify Product Labels (Organic, Bioengineered, Non-GMO, etc.) and explain health impacts.
      3. If the product is not food or the content is unreadable, set the error field in the JSON response to "NOT_FOOD_OR_BLURRY".
      
      SCORING (0-100):
      - 90+ for Carcinogens or Banned substances.
      - 70+ for chronic disruptors (HFCS, Maltodextrin, Carrageenan).
    `;

    const prompt = `
      Action: Perform toxicological audit of ${input.productName || 'scanned images'}.
      Context URL: ${input.url || 'None'}
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
        model: "gemini-3-pro-preview", // Complex clinical reasoning and auditing task
        contents: [{ role: 'user', parts }],
        config: {
          systemInstruction,
          tools: [{ googleSearch: {} }],
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              productName: { type: Type.STRING },
              riskScore: { type: Type.NUMBER },
              overallFlag: { type: Type.STRING, enum: Object.values(SafetyFlag) },
              summary: { type: Type.STRING },
              longTermEffects: { type: Type.STRING },
              ingredients: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    category: { type: Type.STRING },
                    hazardLevel: { type: Type.STRING, enum: ["Low", "Moderate", "High", "Unknown"] },
                    description: { type: Type.STRING },
                    potentialRisks: { type: Type.ARRAY, items: { type: Type.STRING } },
                    benefits: { type: Type.ARRAY, items: { type: Type.STRING } },
                    flag: { type: Type.STRING, enum: Object.values(SafetyFlag) }
                  },
                  required: ["name", "category", "hazardLevel", "description", "potentialRisks", "benefits", "flag"]
                }
              },
              productLabels: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    impact: { type: Type.STRING },
                    isPositive: { type: Type.BOOLEAN }
                  }
                }
              },
              nutritionalInsights: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    fact: { type: Type.STRING },
                    effect: { type: Type.STRING },
                    impact: { type: Type.STRING, enum: ["Positive", "Negative", "Neutral"] }
                  }
                }
              },
              error: { type: Type.STRING, enum: ["NOT_FOOD_OR_BLURRY", "SEARCH_FAILED"] },
              errorMessage: { type: Type.STRING }
            },
            required: ["productName", "riskScore", "overallFlag", "summary", "longTermEffects", "ingredients", "nutritionalInsights"]
          }
        }
      });

      // Correctly access .text property from GenerateContentResponse as per guidelines.
      const text = response.text;
      if (!text) throw new Error("Clinical report engine returned empty response.");
      
      const result = JSON.parse(text) as AnalysisResult;
      
      // Extract Google Search grounding metadata as required by guidelines.
      const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
      if (groundingMetadata?.groundingChunks) {
        const searchSources = groundingMetadata.groundingChunks
          .filter((chunk: any) => chunk.web)
          .map((chunk: any) => ({
            title: chunk.web.title,
            uri: chunk.web.uri
          }));
        result.verifiedSources = [...(result.verifiedSources || []), ...searchSources].slice(0, 10);
      }

      result.scannedImages = input.imageDatas;
      return result;
    } catch (error: any) {
      console.error("Clinical Audit Error:", error);
      if (error.message?.includes("API key")) {
        throw new Error("Your clinical engine connection is missing or invalid. Please reconnect.");
      }
      throw error;
    }
  }
}
