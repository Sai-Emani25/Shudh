import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

// --- Types & Constants ---
enum SafetyFlag {
  RED = 'RED',
  YELLOW = 'YELLOW',
  GREEN = 'GREEN'
}

interface IngredientAnalysis {
  name: string;
  category: string;
  hazardLevel: 'Low' | 'Moderate' | 'High' | 'Unknown';
  description: string;
  potentialRisks: string[];
  benefits: string[];
  flag: SafetyFlag;
}

interface AnalysisResult {
  productName: string;
  riskScore: number;
  overallFlag: SafetyFlag;
  summary: string;
  longTermEffects: string;
  ingredients: IngredientAnalysis[];
  verifiedSources: { title: string; uri: string; type: 'article' | 'video' | 'research' }[];
  scannedImages?: string[]; // To display the scanned pictures in the report
}

type LoadingState = 'idle' | 'scanning' | 'analyzing' | 'error' | 'camera';

const APP_NAME = "Shudh";
const FLAG_COLORS = {
  RED: "bg-rose-50 text-rose-700 border-rose-200",
  YELLOW: "bg-amber-50 text-amber-700 border-amber-200",
  GREEN: "bg-emerald-50 text-emerald-700 border-emerald-200"
};

const FLAG_ICONS = {
  RED: <i className="fa-solid fa-skull-crossbones text-rose-500"></i>,
  YELLOW: <i className="fa-solid fa-circle-exclamation text-amber-500"></i>,
  GREEN: <i className="fa-solid fa-leaf text-emerald-500"></i>
};

// --- Utilities ---
const sanitizeText = (text: string): string => {
  if (!text) return "";
  // Removes markdown bold, italics, headers, and surrounding quotes
  return text
    .replace(/[*_#]/g, '')
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .trim();
};

// --- Gemini Service ---
class GeminiService {
  private cleanJson(text: string): string {
    return text.replace(/```json\n?|```/g, "").trim();
  }

  async analyzeIngredients(input: { imageDatas?: string[]; productName?: string }): Promise<AnalysisResult> {
    const ai = new GoogleGenAI({ apiKey: (process.env as any).API_KEY || '' });

    const systemInstruction = `
      You are "Shudh Lens Pro", a clinical toxicology engine for food safety.
      ONLY output a valid JSON object. Identify harmful chemicals, additives, and ultra-processed ingredients.
      Focus on clinical long-term toxicity (5-10 years) health impacts.
      Risk Score (0-100): 0-25 Green (Safe), 26-75 Yellow (Caution), 76-100 Red (Hazardous).
      IMPORTANT: Do NOT use any markdown characters like ** or ## in your response strings.
    `;

    const prompt = `Analyze this food product: ${input.productName || 'Contents from the provided images'}. 
    Provide a detailed toxicology report in JSON format following this schema:
    {
      "productName": "string",
      "riskScore": number,
      "overallFlag": "RED" | "YELLOW" | "GREEN",
      "summary": "Toxicological summary (plain text, no markdown)",
      "longTermEffects": "Clinical forecast (plain text, no markdown)",
      "ingredients": [{ 
        "name": "string", 
        "category": "string", 
        "hazardLevel": "Low" | "Moderate" | "High", 
        "description": "Scientific profile (plain text)", 
        "potentialRisks": ["risk strings"], 
        "benefits": ["benefit strings"], 
        "flag": "RED" | "YELLOW" | "GREEN" 
      }]
    }`;

    const parts: any[] = [{ text: prompt }];

    if (input.imageDatas && input.imageDatas.length > 0) {
      input.imageDatas.forEach(data => {
        parts.push({
          inlineData: { mimeType: "image/jpeg", data: data.split(',')[1] || data }
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
      const rawData = JSON.parse(this.cleanJson(rawText));

      const result: AnalysisResult = {
        productName: sanitizeText(rawData.productName || "Product Analysis"),
        riskScore: rawData.riskScore || 0,
        overallFlag: rawData.overallFlag || SafetyFlag.GREEN,
        summary: sanitizeText(rawData.summary || ""),
        longTermEffects: sanitizeText(rawData.longTermEffects || ""),
        ingredients: (rawData.ingredients || []).map((ing: any) => ({
          ...ing,
          name: sanitizeText(ing.name),
          description: sanitizeText(ing.description),
          potentialRisks: (ing.potentialRisks || []).map(sanitizeText),
          benefits: (ing.benefits || []).map(sanitizeText)
        })),
        verifiedSources: [],
        scannedImages: input.imageDatas
      };

      const groundingMetadata = (response.candidates?.[0] as any)?.groundingMetadata;
      if (groundingMetadata?.groundingChunks) {
        result.verifiedSources = groundingMetadata.groundingChunks
          .filter((c: any) => c.web)
          .map((c: any) => ({
            title: c.web.title,
            uri: c.web.uri,
            type: 'research'
          })).slice(0, 5);
      }

      return result;
    } catch (error) {
      console.error("Gemini Error:", error);
      throw new Error("Unable to complete analysis. Please check your connection.");
    }
  }
}

// --- UI Components ---
const RiskMeter: React.FC<{ score: number }> = ({ score }) => {
  const getColor = () => {
    if (score < 30) return 'bg-emerald-500';
    if (score < 70) return 'bg-amber-500';
    return 'bg-rose-600';
  };

  return (
    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 w-full mb-6">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Toxicity Risk</h4>
          <p className="text-3xl font-black text-slate-900">{score}<span className="text-slate-300 text-lg">/100</span></p>
        </div>
        <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-wider ${
          score < 30 ? 'bg-emerald-100 text-emerald-700' : score < 70 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
        }`}>
          {score < 30 ? 'Pure' : score < 70 ? 'Warning' : 'Hazardous'}
        </span>
      </div>
      <div className="relative h-4 w-full bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={`absolute top-0 bottom-0 left-0 transition-all duration-1000 ${getColor()}`} 
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
};

const CameraScanner: React.FC<{ onCapture: (images: string[]) => void; onClose: () => void }> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 } },
          audio: false
        });
        setStream(mediaStream);
        if (videoRef.current) videoRef.current.srcObject = mediaStream;
      } catch (err) {
        alert("Camera error.");
        onClose();
      }
    }
    startCamera();
    return () => stream?.getTracks().forEach(t => t.stop());
  }, []);

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current && images.length < 3) {
      const canvas = canvasRef.current;
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        setImages([...images, canvas.toDataURL('image/jpeg', 0.8)]);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col h-[100dvh]">
      <div className="p-4 flex justify-between items-center text-white z-10 safe-top">
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full">
          <i className="fa-solid fa-xmark"></i>
        </button>
        <span className="font-black uppercase tracking-widest text-emerald-400 text-xs">Capturing label {images.length}/3</span>
        <div className="w-10"></div>
      </div>
      <video ref={videoRef} autoPlay playsInline className="flex-1 object-cover" />
      <div className="p-6 bg-black/95 flex flex-col items-center gap-6 safe-bottom">
        <div className="flex gap-3">
          {images.map((img, i) => (
            <img key={i} src={img} className="w-14 h-14 rounded-lg border border-white/20 object-cover" />
          ))}
        </div>
        <button onClick={takePhoto} disabled={images.length >= 3} className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center disabled:opacity-30">
          <div className="w-12 h-12 bg-white rounded-full"></div>
        </button>
        <button onClick={() => onCapture(images)} disabled={images.length === 0} className="w-full max-w-xs py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest">
          Analyze Label
        </button>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

const AnalysisView: React.FC<{ result: AnalysisResult; onReset: () => void }> = ({ result, onReset }) => {
  const handleShare = async () => {
    const text = `Shudh Analysis: ${result.productName}\nRisk Score: ${result.riskScore}/100\n${result.summary}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Shudh Report', text, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(text);
        alert("Report copied!");
      }
    } catch (e) { console.error(e); }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 md:py-10 animate-in fade-in slide-in-from-bottom-8">
      <div className="flex justify-between items-center mb-6 px-2">
        <button onClick={onReset} className="text-slate-500 font-black text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-2">
          <i className="fa-solid fa-arrow-left"></i> New Scan
        </button>
        <button onClick={handleShare} className="bg-emerald-600 text-white px-5 py-2 rounded-full font-black text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700">
          <i className="fa-solid fa-share-nodes"></i> Share Report
        </button>
      </div>

      <div className="glass-card rounded-[2.5rem] md:rounded-[3rem] p-6 md:p-12 mb-8 shadow-2xl border border-white">
        {result.scannedImages && result.scannedImages.length > 0 && (
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            {result.scannedImages.map((img, idx) => (
              <img key={idx} src={img} className="h-32 rounded-2xl border border-slate-200 shadow-sm" alt="Scanned Label" />
            ))}
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-10">
          <div className="flex-1 w-full">
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 block">Clinical Safety Panel</span>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-6 break-words">{result.productName}</h2>
            <div className="relative pl-6 border-l-4 border-emerald-500">
              <p className="text-lg md:text-xl font-bold text-slate-700 leading-relaxed italic">"{result.summary}"</p>
            </div>
          </div>
          <div className="w-full md:w-80">
            <RiskMeter score={result.riskScore} />
          </div>
        </div>

        <div className="p-6 md:p-8 bg-slate-900 text-white rounded-[2rem] md:rounded-[2.5rem] shadow-xl">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-3 flex items-center gap-2">
            <i className="fa-solid fa-hourglass-half"></i> Long-Term Health Impact Forecast
          </h4>
          <p className="text-sm md:text-base font-medium leading-relaxed text-slate-300 italic">"{result.longTermEffects}"</p>
        </div>
      </div>

      <div className="grid gap-6 mb-16 px-1">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-3 flex items-center gap-2">
           <i className="fa-solid fa-flask-vial"></i> Toxicity Analysis by Ingredient
        </h3>
        {result.ingredients.map((ing, i) => (
          <div key={i} className={`p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border ${FLAG_COLORS[ing.flag]} shadow-sm transition-transform hover:-translate-y-1`}>
            <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
              <h4 className="text-lg md:text-xl font-black tracking-tight text-slate-900">{ing.name}</h4>
              <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-white/60 border border-white/40 flex items-center gap-1.5">
                {FLAG_ICONS[ing.flag]} {ing.flag}
              </span>
            </div>
            <p className="text-sm font-medium leading-relaxed mb-6 opacity-90 text-slate-800">{ing.description}</p>
            <div className="grid md:grid-cols-2 gap-4">
              {ing.potentialRisks.length > 0 && (
                <div className="bg-rose-500/10 p-4 rounded-xl border border-rose-500/10">
                  <h5 className="text-[8px] font-black text-rose-700 uppercase mb-2">Health Risks & Toxicity</h5>
                  <ul className="text-[11px] space-y-1 text-rose-900 font-bold">
                    {ing.potentialRisks.map((r, ri) => <li key={ri}>• {r}</li>)}
                  </ul>
                </div>
              )}
              {ing.benefits.length > 0 && (
                <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/10">
                  <h5 className="text-[8px] font-black text-emerald-700 uppercase mb-2">Clinical Benefits</h5>
                  <ul className="text-[11px] space-y-1 text-emerald-900 font-bold">
                    {ing.benefits.map((b, bi) => <li key={bi}>• {b}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {result.verifiedSources.length > 0 && (
        <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl mx-1 mb-20">
          <h3 className="text-[9px] font-black uppercase tracking-[0.4em] mb-8 text-emerald-400">Research & Peer-Reviewed Sources</h3>
          <div className="grid gap-3">
            {result.verifiedSources.map((src, si) => (
              <a key={si} href={src.uri} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors">
                <span className="text-xs font-black tracking-tight truncate max-w-[250px]">{src.title}</span>
                <i className="fa-solid fa-external-link text-[10px] opacity-30"></i>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- App Entry ---
const App: React.FC = () => {
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const gemini = useRef(new GeminiService());

  const handleAnalysis = async (images?: string[], name?: string) => {
    setLoadingState('analyzing');
    setError(null);
    try {
      const analysis = await gemini.current.analyzeIngredients({ imageDatas: images, productName: name });
      setResult(analysis);
      setLoadingState('idle');
    } catch (err: any) {
      setError(err.message);
      setLoadingState('error');
    }
  };

  const reset = () => {
    setResult(null);
    setLoadingState('idle');
    setError(null);
    setNameInput('');
  };

  return (
    <div className="min-h-screen px-4 pb-20 safe-bottom">
      <header className="max-w-6xl mx-auto h-16 md:h-24 flex items-center justify-between">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={reset}>
          <div className="w-9 h-9 md:w-11 md:h-11 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <i className="fa-solid fa-leaf text-base md:text-xl"></i>
          </div>
          <span className="text-xl md:text-2xl font-black text-emerald-950 uppercase tracking-tighter">{APP_NAME}</span>
        </div>
        <div className="px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-100 hidden sm:block">
          AI Clinical Engine
        </div>
      </header>

      {!result && loadingState === 'idle' && (
        <div className="max-w-2xl mx-auto pt-8 md:pt-16 text-center px-2">
          <h1 className="text-5xl md:text-8xl font-black text-slate-900 mb-6 tracking-tighter leading-[0.9]">
            Is it <span className="text-emerald-600">Pure?</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-500 mb-10 md:mb-14 font-medium">Identify hidden chemical toxins in your food.</p>
          
          <div className="glass-card rounded-[2.5rem] md:rounded-[3.5rem] p-5 md:p-6 shadow-2xl space-y-4">
            <button 
              onClick={() => setLoadingState('camera')}
              className="w-full p-6 md:p-8 bg-emerald-600 text-white rounded-[2rem] md:rounded-[2.5rem] flex items-center justify-between hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 active:scale-95 transition-all"
            >
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-white/20 rounded-xl flex items-center justify-center text-xl md:text-2xl">
                  <i className="fa-solid fa-camera"></i>
                </div>
                <div className="text-left">
                  <span className="block text-[9px] font-black uppercase tracking-widest opacity-60">Label Scanner</span>
                  <span className="block text-xl md:text-2xl font-black tracking-tight text-white">Scan Ingredients</span>
                </div>
              </div>
              <i className="fa-solid fa-chevron-right opacity-30 text-lg"></i>
            </button>

            <form 
              onSubmit={(e) => { e.preventDefault(); if(nameInput.trim()) handleAnalysis(undefined, nameInput); }}
              className="relative"
            >
              <input 
                type="text" 
                placeholder="Type product name (e.g. Lay's Chips)..."
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full p-5 pl-12 rounded-[1.8rem] bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 focus:bg-white outline-none font-bold text-base transition-all text-slate-900 placeholder:text-slate-400"
              />
              <i className="fa-solid fa-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-600 font-black text-[10px] uppercase tracking-widest px-4 py-2 hover:bg-emerald-50 rounded-xl transition-colors">
                Analyze
              </button>
            </form>
          </div>
        </div>
      )}

      {loadingState === 'camera' && (
        <CameraScanner onCapture={(imgs) => handleAnalysis(imgs)} onClose={() => setLoadingState('idle')} />
      )}
      
      {loadingState === 'analyzing' && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-2xl flex flex-col items-center justify-center z-[300] p-10 text-center">
          <div className="w-16 h-16 md:w-24 md:h-24 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-8"></div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-3 tracking-tight">Accessing Clinical Databases</h2>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px] md:text-[10px]">Comparing ingredients with peer-reviewed toxicology research</p>
        </div>
      )}

      {loadingState === 'error' && (
        <div className="max-w-md mx-auto mt-16 p-10 bg-rose-50 rounded-[2.5rem] border border-rose-100 text-center">
          <h2 className="text-2xl font-black text-rose-900 mb-2">Error</h2>
          <p className="text-rose-700/70 mb-8 font-medium text-sm">{error}</p>
          <button onClick={reset} className="w-full py-4 bg-rose-600 text-white rounded-xl font-black uppercase tracking-widest transition-all hover:bg-rose-700">Try Again</button>
        </div>
      )}

      {result && <AnalysisView result={result} onReset={reset} />}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);