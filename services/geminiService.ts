
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, SafetyFlag, ProductCategory } from "../types.ts";

export class GeminiService {
  async analyzeIngredients(input: { 
    imageDatas?: string[]; 
    url?: string; 
    productName?: string;
    category: ProductCategory;
  }): Promise<AnalysisResult> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const getSystemInstruction = (category: ProductCategory) => {
      const base = `You are the "Shudh Global Health Auditor". Your objective is to perform a clinical toxicological audit. To ensure 100% consistency and prevent hallucination, you MUST follow this strict additive scoring rubric:
      
      SCORING RUBRIC (Base Score 0, Max 100):
      - Presence of Confirmed Carcinogen (IARC Group 1/2A): +40 points
      - Confirmed Endocrine Disruptor (EDC): +30 points
      - Known Neurotoxin: +25 points
      - High Hazard Preservative (BHA/BHT/Parabens): +20 points
      - Artificial Dye/Synthetic Fragrance: +10 points
      - Moderate Allergen/Irritant: +5 points
      
      REQUIRED SEARCH STEPS:
      1. Search for "[Ingredient Name] safety profile" on EWG Skin Deep, FDA, or PubChem.
      2. If multiple sources conflict, prioritize clinical research over consumer blogs.
      3. Do NOT invent risks; if an ingredient is "Generally Recognized as Safe" (GRAS), its score impact is 0.`;
      
      switch(category) {
        case ProductCategory.COSMETICS:
          return `${base}
          CATEGORY FOCUS: Cosmetics & Personal Care. Focus on D4/D5 Siloxanes, PFAS, and Phthalates. Ensure you look up concentrations where available.`;
        case ProductCategory.MEDICINE:
          return `${base}
          CATEGORY FOCUS: Pharmaceuticals. Distinguish clearly between the "Active Ingredient" (necessary) and "Excipients" (fillers). Toxic fillers like Talc (if asbestos-linked) or Titanium Dioxide (E171) should be flagged.`;
        default: // FOOD
          return `${base}
          CATEGORY FOCUS: Food & Beverages. Focus on ultra-processed markers (UPF), emulsifiers (Polysorbate 80), and specific additives like Red 40 or High Fructose Corn Syrup.`;
      }
    };

    const prompt = `
      Audit Command: Conduct a toxicological clinical audit.
      Category: ${input.category}
      Target: ${input.productName || 'Optical Scanned Material'}
      
      Provide a highly accurate "riskScore" using the additive rubric. 
      In "scoreExplanation", detail exactly which ingredients added how many points to the total.
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
          systemInstruction: getSystemInstruction(input.category),
          tools: [{ googleSearch: {} }],
          temperature: 0, // Force lowest variance
          seed: 42,      // Ensure deterministic output for identical inputs
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              productName: { type: Type.STRING },
              riskScore: { type: Type.NUMBER },
              scoreExplanation: { type: Type.STRING, description: "Detailed breakdown of the math used to reach the score" },
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
              error: { type: Type.STRING, enum: ["NOT_FOOD_OR_BLURRY", "SEARCH_FAILED"] }
            },
            required: ["productName", "riskScore", "scoreExplanation", "overallFlag", "summary", "longTermEffects", "ingredients"]
          }
        }
      });

      const result = JSON.parse(response.text) as AnalysisResult;
      result.category = input.category;
      
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
      console.error("Clinical Audit Error:", error);
      throw error;
    }
  }
}
