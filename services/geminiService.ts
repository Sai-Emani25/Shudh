
import { GoogleGenAI } from "@google/genai";
import { AnalysisResult, SafetyFlag } from "../types.ts";

export class GeminiService {
  private cleanJson(text: string): string {
    return text.replace(/```json\n?|```/g, "").trim();
  }

  async analyzeIngredients(input: { imageDatas?: string[]; url?: string; productName?: string }): Promise<AnalysisResult> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Using Gemini 3 Pro for advanced reasoning and higher accuracy
    const systemInstruction = `
      You are "Shudh Lens Pro", a senior clinical toxicologist and food safety scientist.
      
      SCORING ALGORITHM (STRICT ADHERENCE REQUIRED):
      1. Start with a baseline Risk Score of 0 (Pure).
      2. For EVERY Ultra-Processed Ingredient (UPF), Artificial Dye, or Synthetic Preservative: Add +20 points.
      3. For EVERY "Moderate Concern" ingredient (e.g., Natural Flavors of unknown origin, high sodium): Add +5 points.
      4. For EVERY Carcinogen or Endocrine Disruptor (e.g., BHA, BHT, Red 40, TBHQ): Score is automatically at least 80.
      5. Final Score is capped at 100.
      
      ANALYSIS PROTOCOL:
      - You MUST scan the ENTIRE ingredient list provided in images or via search.
      - Do NOT skip any chemicals.
      - If a product name is provided, use Google Search to find the EXACT ingredient list for that specific region/version.
      - Output ONLY a valid JSON object. No markdown in strings.
    `;

    const prompt = `
      Analyze this product: ${input.productName || 'Content provided in images'}
      
      Perform a component-by-component toxicological assessment.
      
      JSON SCHEMA:
      {
        "productName": "string",
        "riskScore": number,
        "overallFlag": "RED" | "YELLOW" | "GREEN",
        "summary": "Plain text clinical summary",
        "longTermEffects": "Plain text forecast of health impacts (5-10 years)",
        "ingredients": [
          {
            "name": "string",
            "category": "Preservative/Dye/Filler/etc",
            "hazardLevel": "Low" | "Moderate" | "High",
            "description": "Scientific health impact data",
            "potentialRisks": ["specific health risks"],
            "benefits": ["benefits if any"],
            "flag": "RED" | "YELLOW" | "GREEN"
          }
        ],
        "nutritionalInsights": [
          { "fact": "string", "effect": "string", "impact": "Positive" | "Negative" | "Neutral" }
        ],
        "verifiedSources": [
          { "title": "string", "uri": "url", "type": "article" | "video" | "research" }
        ]
      }
    `;

    const parts: any[] = [{ text: prompt }];

    if (input.imageDatas && input.imageDatas.length > 0) {
      input.imageDatas.forEach(data => {
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: data.split(',')[1] || data
          }
        });
      });
    } else if (input.productName) {
      parts.push({ text: `PRODUCT NAME TO RESEARCH AND ANALYZE: ${input.productName}` });
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: [{ role: 'user', parts }],
        config: {
          systemInstruction,
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          temperature: 0.1,
        }
      });

      const rawText = response.text || "{}";
      const result = JSON.parse(this.cleanJson(rawText)) as AnalysisResult;
      
      // Persist scanned images for the report
      result.scannedImages = input.imageDatas;

      const groundingMetadata = (response.candidates?.[0] as any)?.groundingMetadata;
      if (groundingMetadata?.groundingChunks) {
        const extraSources = groundingMetadata.groundingChunks
          .filter((c: any) => c.web)
          .map((c: any) => ({
            title: c.web.title,
            uri: c.web.uri,
            type: 'research'
          }));
        
        result.verifiedSources = [...(result.verifiedSources || []), ...extraSources].slice(0, 8);
      }

      return result;
    } catch (error: any) {
      console.error("Gemini Error:", error);
      throw new Error("Toxicity scan failed. Please check connectivity or label clarity.");
    }
  }
}
