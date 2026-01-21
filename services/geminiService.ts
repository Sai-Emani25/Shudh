import { GoogleGenAI } from "@google/genai";
import { AnalysisResult } from "../types.ts";

export class GeminiService {
  private cleanJson(text: string): string {
    // Grounding responses often include markdown or citations outside the JSON
    // This regex finds the first { and last } and extracts everything between.
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      return text.substring(start, end + 1);
    }
    return text.trim();
  }

  async analyzeIngredients(input: { imageDatas?: string[]; url?: string; productName?: string }): Promise<AnalysisResult> {
    const ai = new GoogleGenAI({ apiKey: (process.env as any).API_KEY });

    // When using Google Search, the model performs better without strict responseMimeType
    // especially if it needs to ground citations. We'll extract the JSON manually.
    const systemInstruction = `
      You are "Shudh Clinical Auditor", an expert clinical toxicologist.
      
      MANDATORY: Use 'googleSearch' to verify the product: ${input.productName || 'the item in the images'}.
      
      RULES:
      1. Cross-reference visual data with search results. Search is the source of truth.
      2. Detect Product Labels (Organic, Bioengineered, Non-GMO, etc.) and explain health impacts.
      3. Use 'googleSearch' to find full ingredient lists if images are incomplete.
      4. If the product is not food, return standard error JSON format.
      
      SCORING:
      - 0-100 Toxicity Scale.
      - 90+ for Carcinogens or Banned substances.
      - 70+ for High-Fructose Corn Syrup, BHA, TBHQ, or Red 40.
      
      You MUST return your answer strictly as a JSON object inside your response.
    `;

    const prompt = `
      Action: Perform toxicological audit of ${input.productName || 'scanned images'}.
      Target URL: ${input.url || 'None'}
      
      Provide a detailed clinical report in the following JSON format:
      {
        "productName": "string",
        "riskScore": number,
        "overallFlag": "RED" | "YELLOW" | "GREEN",
        "summary": "Brief verdict.",
        "longTermEffects": "Health forecast.",
        "ingredients": [
          {
            "name": "string",
            "category": "string",
            "hazardLevel": "Low" | "Moderate" | "High",
            "description": "Chemical profile.",
            "potentialRisks": ["Risk1"],
            "benefits": ["Benefit1"],
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
        contents: [{ role: 'user', parts }],
        config: {
          systemInstruction,
          tools: [{ googleSearch: {} }],
          // Not setting responseMimeType: "application/json" here to allow search grounding to work seamlessly
          temperature: 0.1,
        }
      });

      const rawText = response.text || "{}";
      const cleanedJsonStr = this.cleanJson(rawText);
      
      let result: AnalysisResult;
      try {
        result = JSON.parse(cleanedJsonStr) as AnalysisResult;
      } catch (parseError) {
        console.error("JSON Parsing failed. Raw text:", rawText);
        throw new Error("Analysis received, but data was malformed. Please try again.");
      }
      
      // Extract grounding metadata for transparency
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
    } catch (error: any) {
      console.error("Gemini Audit Error:", error);
      throw new Error(error.message || "Clinical audit failed. Check your connection.");
    }
  }
}