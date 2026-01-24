
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, SafetyFlag, ProductCategory } from "../types.ts";

export class GeminiService {
  private extractJson(text: string): string {
    // Remove markdown code blocks if present
    return text.replace(/```json\n?|```/g, "").trim();
  }

  async analyzeIngredients(input: { 
    imageDatas?: string[]; 
    url?: string; 
    productName?: string;
    category: ProductCategory;
  }): Promise<AnalysisResult> {
    if (!process.env.API_KEY || process.env.API_KEY === 'your_gemini_api_key_here') {
      throw new Error("MISSING_API_KEY");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const getSystemInstruction = (category: ProductCategory) => {
      // Streamlined base for maximum speed across all modalities
      const base = `Act as the "Shudh Clinical Auditor". Mode: High-Speed Binary Fact-Check.
      
      CORE AUDIT PROTOCOL:
      1. ID: Extract Brand/Product from image/context.
      2. SEARCH: If scan is partial, use googleSearch to find full ingredient specs immediately.
      3. GROUND: Verify safety against IARC, EWG, PubChem, and FDA/EU databases. 
      4. IGNORE: All label claims (Natural/Safe/Clean). Focus ONLY on molecular toxicity.
      
      CATEGORY SPECIFICS:
      - FOOD: Flag UPF markers, artificial dyes, synthetic sweeteners.
      - COSMETICS: Flag Endocrine Disruptors, PFAS, synthetic fragrance, Parabens.
      - MEDICINE: Flag Active vs Inactive hazards, Talc, TiO2, synthetic colorants.
      
      SCORING (0-100):
      - Carcinogen: +40 | EDC: +30 | Neurotoxin: +25 | Banned in EU: +20 | Artificial Dye: +10.`;
      
      return base;
    };

    const prompt = `
      AUDIT TASK:
      1. Analyze frames/text: ${input.productName || 'Identify from images'}.
      2. Supplement missing clinical data via Google Search.
      3. Output JSON according to schema.
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
        model: "gemini-3-flash-preview",
        contents: { parts },
        config: {
          systemInstruction: getSystemInstruction(input.category),
          tools: [{ googleSearch: {} }],
          temperature: 0, // Deterministic = Faster
          topP: 0.1,      // Focus search path
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              productName: { type: Type.STRING },
              riskScore: { type: Type.NUMBER },
              scoreExplanation: { type: Type.STRING },
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
              }
            },
            required: ["productName", "riskScore", "scoreExplanation", "overallFlag", "summary", "longTermEffects", "ingredients"]
          }
        }
      });

      const cleanJson = this.extractJson(response.text || "");
      const result = JSON.parse(cleanJson) as AnalysisResult;
      result.category = input.category;
      
      result.verifiedSources = [];
      const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
      if (groundingMetadata?.groundingChunks) {
        result.verifiedSources = groundingMetadata.groundingChunks
          .filter((chunk: any) => chunk.web)
          .map((chunk: any) => ({
            title: chunk.web.title,
            uri: chunk.web.uri
          }));
      }

      result.scannedImages = input.imageDatas;
      return result;
    } catch (error: any) {
      console.error("Gemini Audit Detailed Error:", error);
      throw error;
    }
  }
}
