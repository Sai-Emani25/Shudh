
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, SafetyFlag } from "../types.ts";

export class GeminiService {
  /**
   * Performs an advanced toxicological audit of food ingredients.
   * Utilizes Gemini 3 Pro with Search Grounding to identify hidden chemicals,
   * ultra-processed additives, and potential health disruptors.
   */
  async analyzeIngredients(input: { imageDatas?: string[]; url?: string; productName?: string }): Promise<AnalysisResult> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const systemInstruction = `
      You are the "Shudh Clinical Toxicologist". Your mission is to identify "nasty chemicals" in food products that pose health risks even in small doses.
      
      CRITICAL FOCUS AREAS:
      1. Endocrine Disruptors (e.g., BPA, Phthalates in packaging, certain preservatives).
      2. Carcinogens & Mutagens (e.g., Artificial dyes like Red 40, Yellow 5, Potassium Bromate).
      3. Neurotoxins & Gut-Disruptors (e.g., Carrageenan, MSG, Aspartame, HFCS).
      4. Ultra-Processed Markers (e.g., Maltodextrin, Emulsifiers).

      MANDATORY: Use 'googleSearch' to verify the specific product and its latest reported ingredient list.
      
      RULES:
      - If the scan is blurry or not a food item, set error to "NOT_FOOD_OR_BLURRY".
      - Provide a "Risk Score" from 0 (Pure) to 100 (Toxic). 
      - Scoring Logic: 80+ for banned/restricted additives; 50-79 for chronic health disruptors; <50 for general processing.
      - Extract specific Product Labels (e.g., "Bioengineered Ingredients", "Contains Phthalates").
    `;

    const prompt = `
      Audit Task: Analyze this product for toxic chemicals.
      Product Name/Context: ${input.productName || 'Scanned Label'}
      Source URL: ${input.url || 'N/A'}
      Please perform a deep-search audit and return a clinical report.
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
        model: "gemini-3-pro-preview",
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
            required: ["productName", "riskScore", "overallFlag", "summary", "longTermEffects", "ingredients"]
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from clinical engine.");
      
      const result = JSON.parse(text) as AnalysisResult;
      
      // Integrate Grounding Sources
      const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
      if (groundingMetadata?.groundingChunks) {
        const searchSources = groundingMetadata.groundingChunks
          .filter((chunk: any) => chunk.web)
          .map((chunk: any) => ({
            title: chunk.web.title,
            uri: chunk.web.uri
          }));
        result.verifiedSources = (result.verifiedSources || []).concat(searchSources);
      }

      result.scannedImages = input.imageDatas;
      return result;
    } catch (error: any) {
      console.error("Clinical Audit Error:", error);
      throw error;
    }
  }
}
