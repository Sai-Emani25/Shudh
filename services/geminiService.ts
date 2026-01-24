
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
      const base = `You are the "Shudh Global Health Auditor". Your objective is to perform a rigorous, clinical fact-check of ingredients.
      
      CRITICAL RULE 1 (Comprehensive Audit): If the provided images are partial, blurry, or missing sections, you MUST use the googleSearch tool to find the FULL, OFFICIAL ingredient list for the identified product. Do not guess; search and supplement missing data.
      
      CRITICAL RULE 2 (Identification): Identify the Brand and EXACT Product Variant from the packaging (e.g., "Doritos Nacho Cheese" vs just "Chips"). The "productName" must be specific.
      
      CRITICAL RULE 3 (Zero Trust): Never trust marketing labels like "All Natural" or "Physician Recommended". If your clinical search finds hazardous chemicals not explicitly mentioned in a positive light on the label, you MUST flag them.
      
      GROUNDING REQUIREMENT: Use googleSearch to:
      1. Cross-reference the identified product with databases like EWG Skin Deep, FDA GRAS, PubChem, and IARC.
      2. If an ingredient is missing from the scan but is standard for that specific product variant, include it in the audit.
      3. Verify if any ingredient is banned or restricted in the EU, Canada, or California (Prop 65).

      PROS & CONS: For EVERY ingredient, provide at least 2 potential health risks (Cons) and its functional purpose (Pros) based on search results.`;
      
      switch(category) {
        case ProductCategory.COSMETICS:
          return `${base}
          CATEGORY FOCUS: Cosmetics. Verify safety for skin types. Search for Parabens, Phthalates, and synthetic fragrances.`;
        case ProductCategory.MEDICINE:
          return `${base}
          CATEGORY FOCUS: Pharmaceuticals. Identify Active Ingredients vs Fillers. Search for Talc, TiO2, and Dye safety.`;
        default: // FOOD
          return `${base}
          CATEGORY FOCUS: Food. Verify Ultra-Processed (UPF) status. Search for artificial dyes (Red 40, etc.), BHA/BHT, and synthetic sweeteners.`;
      }
    };

    const prompt = `
      Clinical Audit Command: 
      1. ANALYZE IMAGES: Identify product and extract visible ingredients.
      2. SUPPLEMENT: Use Google Search to find any ingredients or warning labels typically associated with this specific product that might have been missed in the scan.
      3. VERIFY: Fact-check safety of every chemical.
      4. SCORE: Calculate risk score (0-100) based on clinical toxicity.
      
      Hint (User Input): ${input.productName || 'Identify from images'}
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
        model: "gemini-3-flash-preview", // Flash for low latency
        contents: [{ role: 'user', parts }],
        config: {
          systemInstruction: getSystemInstruction(input.category),
          tools: [{ googleSearch: {} }],
          temperature: 0.1, // Slight temperature for better reasoning
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
      console.error("Audit Failure:", error);
      throw error;
    }
  }
}
