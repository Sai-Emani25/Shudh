
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, SafetyFlag, ProductCategory } from "../types.ts";

export class GeminiService {
  private extractJson(text: string): string {
    return text.replace(/```json\n?|```/g, "").trim();
  }

  async analyzeIngredients(input: { 
    imageDatas?: string[]; 
    url?: string; 
    productName?: string;
    category: ProductCategory;
  }): Promise<AnalysisResult> {
    if (!process.env.API_KEY || process.env.API_KEY === 'your_gemini_api_key_here' || !process.env.API_KEY.trim()) {
      throw new Error("MISSING_API_KEY");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const getSystemInstruction = (category: ProductCategory) => {
      const baseHeader = `Act as a Senior Clinical Toxicologist and Regulatory Auditor for the "Shudh" health platform. 
      Accuracy is your absolute priority. You must use the googleSearch tool.`;

      const fallbackInstruction = `
      IMPORTANT: If you cannot identify the product from the images or search, return a JSON object with this structure:
      { "error": "NOT_FOUND", "errorMessage": "The product could not be identified with certainty. Try taking a clearer photo of the brand name and ingredient list." }`;

      const searchProtocol = `
      PROTOCOL:
      1. FORMULATION LOOKUP: Use googleSearch to find the COMPLETE, OFFICIAL list of ingredients for the identified product.
      2. REGULATORY CHECK: Check every ingredient against EU (EC No 1223/2009), Canada, and FDA GRAS.
      3. DATABASE CROSS-REFERENCE: Use EWG, OpenFoodFacts, PubChem, DailyMed.`;

      const scoringRubric = `
      SCORING SYSTEM (0-100 Total Risk):
      - 80-100 (RED): BANNED in EU/Canada, IARC Group 1/2A, or known EDCs.
      - 40-79 (YELLOW): Moderate hazard, allergens, or under investigation.
      - 0-39 (GREEN): Clinically clean.`;

      switch(category) {
        case ProductCategory.MEDICINE:
          return `${baseHeader}\n${fallbackInstruction}\n${searchProtocol}\n${scoringRubric}\nMEDICINE FOCUS: Audit INACTIVE ingredients (excipients). Specific Hazards: Talc, TiO2, EU-banned dyes.`;
        case ProductCategory.COSMETICS:
          return `${baseHeader}\n${fallbackInstruction}\n${searchProtocol}\n${scoringRubric}\nCOSMETICS FOCUS: Audit for Formaldehyde, Parabens, PFAS, Phthalates.`;
        default: // FOOD
          return `${baseHeader}\n${fallbackInstruction}\n${searchProtocol}\n${scoringRubric}\nFOOD FOCUS: Audit for UPF Markers, artificial dyes/sweeteners, emulsifiers.`;
      }
    };

    const prompt = `
      AUDIT COMMAND:
      IDENTIFY: ${input.productName || 'Identify from attached images'}
      ACTION: Search formulation, verify regulatory status, output JSON.
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
          temperature: 0.1, 
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
              error: { type: Type.STRING },
              errorMessage: { type: Type.STRING },
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

      const cleanJson = this.extractJson(response.text || "{}");
      const result = JSON.parse(cleanJson) as AnalysisResult;

      if (result.error) {
        return result;
      }

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
      console.error("Gemini Audit Error:", error);
      
      // Handle safety blocks
      if (error.message?.includes("SAFETY")) {
        return {
          error: "SEARCH_FAILED",
          errorMessage: "The clinical audit was blocked by a safety filter. This usually happens with restricted pharmaceutical substances or medical claims.",
          productName: "Blocked Request",
          category: input.category,
          riskScore: 0,
          scoreExplanation: "",
          overallFlag: SafetyFlag.GREEN,
          summary: "",
          longTermEffects: "",
          ingredients: [],
          verifiedSources: []
        };
      }
      
      throw error;
    }
  }
}
