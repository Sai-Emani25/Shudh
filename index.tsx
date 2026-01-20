import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

// --- Types ---
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

interface NutritionalEffect {
  fact: string;
  effect: string;
  impact: 'Positive' | 'Negative' | 'Neutral';
}

interface AnalysisResult {
  productName: string;
  riskScore: number;
  overallFlag: SafetyFlag;
  summary: string;
  longTermEffects: string;
  ingredients: IngredientAnalysis[];
  nutritionalInsights: NutritionalEffect[];
  verifiedSources: { title: string; uri: string; type: 'article' | 'video' | 'research' }[];
}

type LoadingState = 'idle' | 'scanning' | 'searching' | 'analyzing' | 'error' | 'camera';

// --- Constants ---
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

// --- Services ---
class GeminiService {
  private cleanJson(text: string): string {
    return text.replace(/```json\n?|```/g, "").trim();
  }

  async analyzeIngredients(input: { imageDatas?: string[]; url?: string; productName?: string }): Promise<AnalysisResult> {
    const ai = new GoogleGenAI({ apiKey: (process.env as any).API_KEY });

    const systemInstruction = `
      You are "Shudh Lens Pro", a clinical toxicology engine for food safety.
      ONLY output valid JSON. Identify harmful chemicals and additives.
      Focus on clinical long-term toxicity (5-10 years).
      Risk Score (0-100): 0-25 Green, 26-75 Yellow, 76-100 Red.
    `;

    const prompt = `Analyze this product: ${input.productName || 'Content provided in parts'}. Return the JSON analysis.`;

    const parts: any[] = [{ text: prompt }];

    if (input.imageDatas && input.imageDatas.length > 0) {
      input.imageDatas.forEach(data => {
        parts.push({
          inlineData: { mimeType: "image/jpeg", data: data.split(',')[1] || data }
        });
      });
    } else if (input.url) {
      parts.push({ text: `DATA SOURCE (URL): ${input.url}` });
    } else if (input.productName) {
      parts.push({ text: `PRODUCT NAME: ${input.productName}` });
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
      const result = JSON.parse(this.cleanJson(rawText)) as AnalysisResult;

      const groundingMetadata = (response.candidates?.[0] as any)?.groundingMetadata;
      if (groundingMetadata?.groundingChunks) {
        const extraSources = groundingMetadata.groundingChunks
          .filter((c: any) => c.web)
          .map((c: any) => ({
            title: c.web.title,
            uri: c.web.uri,
            type: 'research' as const
          }));
        result.verifiedSources = [...(result.verifiedSources || []), ...extraSources].slice(0, 8);
      }

      return result;
    } catch (error) {
      console.error("Gemini Error:", error);
      throw new Error("Analysis failed. Please check the product or your connection.");
    }
  }
}

// --- Components ---
const RiskMeter: React.FC<{ score: number }> = ({ score }) => {
  const getColor = () => {
    if (score < 30) return 'bg-emerald-500';
    if (score < 70) return 'bg-amber-500';
    return 'bg-rose-600';
  };

  return (
    <div className="mb-10 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Risk Meter</h4>
          <p className="text-3xl font-black text-slate-900">{score}<span className="text-slate-300 text-lg">/100</span></p>
        </div>
        <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-wider ${
          score < 30 ? 'bg-emerald-100 text-emerald-700' : score < 70 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
        }`}>
          {score < 30 ? 'Safe' : score < 70 ? 'Caution' : 'Hazardous'}
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

const AnalysisView: React.FC<{ result: AnalysisResult; onReset: () => void }> = ({ result, onReset }) => {
  return (
    <div className="max-w-4xl mx-auto py-10 animate-in fade-in slide-in-from-bottom-8">
      <button onClick={onReset} className="mb-8 text-slate-400 hover:text-emerald-700 font-black text-xs uppercase tracking-widest">
        <i className="fa-solid fa-arrow-left mr-2"></i> Scan Another
      </button>

      <div className="glass-card rounded-[3rem] p-8 md:p-12 mb-10 shadow-2xl border border-white">
        <h2 className="text-4xl font-black mb-6 text-slate-900">{result.productName}</h2>
        <div className="grid md:grid-cols-2 gap-10">
          <div className="space-y-6">
            <p className="text-xl font-bold text-slate-700">"{result.summary}"</p>
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
              <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Long Term Health Impact</h4>
              <p className="text-sm italic text-slate-600">"{result.longTermEffects}"</p>
            </div>
          </div>
          <RiskMeter score={result.riskScore} />
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-4">Ingredient Panel</h3>
        {result.ingredients.map((ing, i) => (
          <div key={i} className={`p-6 rounded-3xl border ${FLAG_COLORS[ing.flag]} border-opacity-30`}>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-xl font-black">{ing.name}</h4>
              <span className="text-[10px] font-black uppercase tracking-widest bg-white/50 px-3 py-1 rounded-full border border-white/50">
                {FLAG_ICONS[ing.flag]} {ing.flag}
              </span>
            </div>
            <p className="text-sm leading-relaxed opacity-80">{ing.description}</p>
          </div>
        ))}
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
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
        setStream(mediaStream);
        if (videoRef.current) videoRef.current.srcObject = mediaStream;
      } catch (err) {
        alert("Camera access denied.");
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
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      <div className="p-4 flex justify-between text-white z-10">
        <button onClick={onClose}><i className="fa-solid fa-xmark text-2xl"></i></button>
        <span className="font-black uppercase tracking-widest text-emerald-400">Scan Mode {images.length}/3</span>
        <div className="w-6"></div>
      </div>
      <video ref={videoRef} autoPlay playsInline className="flex-1 object-cover bg-slate-900" />
      <div className="p-6 bg-black flex flex-col items-center gap-6">
        <div className="flex gap-2">
          {images.map((img, i) => (
            <img key={i} src={img} className="w-16 h-16 rounded-lg border border-white/20 object-cover" />
          ))}
        </div>
        <button onClick={takePhoto} disabled={images.length >= 3} className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center disabled:opacity-30">
          <div className="w-16 h-16 bg-white rounded-full"></div>
        </button>
        <button 
          onClick={() => images.length > 0 && onCapture(images)}
          disabled={images.length === 0}
          className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest disabled:opacity-30"
        >
          Analyze Purity
        </button>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

// --- Main App ---
const App: React.FC = () => {
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const gemini = useRef(new GeminiService());

  const handleAnalysis = async (images?: string[], productName?: string) => {
    setLoadingState('analyzing');
    setError(null);
    try {
      const analysis = await gemini.current.analyzeIngredients({ imageDatas: images, productName });
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
    <div className="min-h-screen pb-20 px-4">
      <header className="max-w-6xl mx-auto h-20 flex items-center justify-between mb-10">
        <div className="flex items-center gap-3 cursor-pointer" onClick={reset}>
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <i className="fa-solid fa-leaf"></i>
          </div>
          <span className="text-2xl font-black text-emerald-950 tracking-tighter uppercase">{APP_NAME}</span>
        </div>
      </header>

      {!result && loadingState === 'idle' && (
        <div className="max-w-2xl mx-auto pt-10 text-center">
          <h1 className="text-6xl md:text-8xl font-black text-slate-900 mb-6 tracking-tighter leading-none">
            Is it <span className="text-emerald-600">Pure?</span>
          </h1>
          <p className="text-xl text-slate-500 mb-12">Unmask the chemicals in your food with clinical AI.</p>
          
          <div className="glass-card rounded-[3rem] p-6 shadow-xl space-y-4">
            <button 
              onClick={() => setLoadingState('camera')}
              className="w-full p-8 bg-emerald-600 text-white rounded-[2.5rem] flex items-center justify-between hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20"
            >
              <div className="flex items-center gap-4">
                <i className="fa-solid fa-camera text-3xl"></i>
                <span className="text-2xl font-black">Scan Product Label</span>
              </div>
              <i className="fa-solid fa-chevron-right opacity-50"></i>
            </button>

            <form 
              onSubmit={(e) => { e.preventDefault(); handleAnalysis(undefined, nameInput); }}
              className="relative"
            >
              <input 
                type="text" 
                placeholder="Search product by name..."
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full p-6 pl-14 rounded-[2rem] bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 outline-none font-bold text-lg"
              />
              <i className="fa-solid fa-magnifying-glass absolute left-6 top-1/2 -translate-y-1/2 text-slate-400"></i>
            </form>
          </div>
        </div>
      )}

      {loadingState === 'camera' && <CameraScanner onCapture={(imgs) => handleAnalysis(imgs)} onClose={() => setLoadingState('idle')} />}
      
      {loadingState === 'analyzing' && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-xl flex flex-col items-center justify-center z-[150]">
          <div className="w-20 h-20 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-6"></div>
          <h2 className="text-2xl font-black text-slate-900">Consulting Toxicology Database...</h2>
        </div>
      )}

      {loadingState === 'error' && (
        <div className="max-w-md mx-auto mt-20 p-10 bg-rose-50 rounded-[3rem] border border-rose-100 text-center">
          <i className="fa-solid fa-triangle-exclamation text-4xl text-rose-500 mb-4"></i>
          <h2 className="text-2xl font-black text-rose-900 mb-2">Scan Failed</h2>
          <p className="text-rose-700/70 mb-8">{error}</p>
          <button onClick={reset} className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest">Try Again</button>
        </div>
      )}

      {result && <AnalysisView result={result} onReset={reset} />}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);