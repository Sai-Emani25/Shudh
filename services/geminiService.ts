import { GoogleGenAI } from "@google/genai";
import { AnalysisResult } from "../types.ts";

export class GeminiService {
  private cleanJson(text: string): string {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? jsonMatch[0] : text.trim();
  }

  async analyzeIngredients(input: { imageDatas?: string[]; url?: string; productName?: string }): Promise<AnalysisResult> {
    const ai = new GoogleGenAI({ apiKey: (process.env as any).API_KEY });

    const systemInstruction = `
      You are "Shudh Clinical Auditor", a clinical toxicologist.
      
      CRITICAL: Use 'googleSearch' to verify the product: ${input.productName || 'the item in the images'}.
      
      GROUNDING RULES:
      1. If the OCR from images is low quality or contradicts known ingredient lists found via Google Search, OVERWRITE with search data. Search is the source of truth for manufacturing.
      2. Identify "Product Labels" found either on the packaging or verified via search (e.g., "Non-GMO", "Contains Bioengineered Food Ingredients", "Certified Organic", "FDA Warning", "High-Fructose Warning"). 
      3. For each label, provide its health impact.
      4. If the product is not food, return standard error JSON.
      
      STRICT PENALTY SCORING (0-100):
      - 90+: Presence of Banned or Carcinogenic additives (e.g. Red 3, BHA, Potassium Bromate).
      - +25: Chronic metabolic disruptors (HFCS, Maltodextrin, Carrageenan).
      
      Output ONLY valid JSON.
    `;

    const prompt = `
      Action: Perform toxicological audit of ${input.productName || 'scanned images'}.
      Context URL: ${input.url || 'None'}
      
      Required Output JSON:
      {
        "productName": "string",
        "riskScore": number,
        "overallFlag": "RED" | "YELLOW" | "GREEN",
        "summary": "Verified verdict based on search and visual data.",
        "longTermEffects": "Detailed forecast.",
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
          { "title": "Label Name", "impact": "Health consequence", "isPositive": boolean }
        ],
        "nutritionalInsights": [],
        "verifiedSources": []
      }
    `;

    const parts: any[] = [{ text: prompt }];
    if (input.imageDatas) {
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
      
      const groundingMetadata = (response.candidates?.[0] as any)?.groundingMetadata;
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
    } catch (error) {
      console.error("Analysis Failed:", error);
      throw new Error("Clinical search verification failed. Please try again.");
    }
  }
}