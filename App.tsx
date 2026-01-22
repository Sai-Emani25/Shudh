import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnalysisResult, LoadingState } from './types.ts';
import { GeminiService } from './services/geminiService.ts';
import { AnalysisView } from './components/AnalysisView.tsx';
import { CameraScanner } from './components/CameraScanner.tsx';
import { APP_NAME } from './constants.tsx';

const App: React.FC = () => {
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [loadingSubText, setLoadingSubText] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [error, setError] = useState<{ message: string; type?: 'INVALID' | 'GENERIC' | 'AUTH' } | null>(null);
  const [shareStatus, setShareStatus] = useState(false);
  
  const lastRequestTime = useRef<number>(0);
  const geminiService = useRef(new GeminiService());

  const isUrl = (str: string) => {
    try {
      const u = new URL(str);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const updateHistory = useCallback((params: Record<string, string | null>) => {
    if (typeof window === 'undefined') return;
    try {
      const newUrl = new URL(window.location.href);
      Object.entries(params).forEach(([key, value]) => {
        if (value) newUrl.searchParams.set(key, value);
        else newUrl.searchParams.delete(key);
      });
      window.history.pushState({}, '', newUrl.toString());
    } catch (e) {
      console.warn('History sync failed:', e);
    }
  }, []);

  // Handle auto-analysis when shared links are opened
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('check') || params.get('q');
    const urlParam = params.get('url');
    
    if ((query || urlParam) && loadingState === 'idle' && !result) {
      if (urlParam && isUrl(urlParam)) {
        setNameInput(urlParam);
        handleAnalysis(undefined, urlParam, undefined);
      } else if (query) {
        setNameInput(query);
        handleAnalysis(undefined, undefined, query);
      }
    }
  }, []);

  const handleShare = async () => {
    const shareData = {
      title: APP_NAME,
      text: result 
        ? `View the clinical toxicological report for ${result.productName}.`
        : 'Scan your food for hidden chemicals with Shudh.',
      url: window.location.href, 
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        setShareStatus(true);
        setTimeout(() => setShareStatus(false), 2000);
      }
    } catch (err) {
      console.warn('Share failed', err);
    }
  };

  const handleAnalysis = async (images?: string[], url?: string, productName?: string) => {
    const now = Date.now();
    if (now - lastRequestTime.current < 2000) return;
    
    lastRequestTime.current = now;
    setLoadingState('analyzing');
    setLoadingSubText('Connecting to clinical databases...');
    setError(null);

    const subtexts = [
      'Initializing Pro-Sensors...', 
      'Calibrating Reasoning Engine...', 
      'Injecting Search Grounding...', 
      'Parsing Toxicology Indices...'
    ];
    let subIdx = 0;
    const interval = setInterval(() => {
      subIdx = (subIdx + 1) % subtexts.length;
      setLoadingSubText(subtexts[subIdx]);
    }, 2500);

    updateHistory({ url: url || null, check: productName || null });
    
    try {
      const analysis = await geminiService.current.analyzeIngredients({ 
        imageDatas: images, 
        url, 
        productName 
      });

      if (analysis.error === "NOT_FOOD_OR_BLURRY") {
        setError({ 
          message: analysis.errorMessage || "Audit failed to identify a valid food product. Please scan again.", 
          type: 'INVALID' 
        });
        setLoadingState('error');
      } else {
        setResult(analysis);
        setLoadingState('idle');
      }
    } catch (err: any) {
      console.error("Analysis Error:", err);
      if (err.message?.includes("API key") || err.message?.includes("not found")) {
        setError({ 
          message: "Clinical Engine disconnected. Please ensure your API_KEY is correctly set in your environment variables.", 
          type: 'AUTH' 
        });
      } else {
        setError({ 
          message: err.message || "An unexpected error occurred during the clinical audit.", 
          type: 'GENERIC' 
        });
      }
      setLoadingState('error');
    } finally {
      clearInterval(interval);
    }
  };

  const processImageFile = useCallback(async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setError({ message: 'File too large. Max 5MB.', type: 'GENERIC' });
      setLoadingState('error');
      return;
    }
    setLoadingState('scanning');
    const reader = new FileReader();
    reader.onload = (e) => handleAnalysis([e.target?.result as string]);
    reader.readAsDataURL(file);
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processImageFile(file);
  };

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = nameInput.trim();
    if (!val) return;
    if (isUrl(val)) handleAnalysis(undefined, val, undefined);
    else handleAnalysis(undefined, undefined, val);
  };

  const reset = () => {
    setResult(null);
    setLoadingState('idle');
    setError(null);
    setNameInput('');
    updateHistory({ url: null, check: null });
  };

  return (
    <div className="min-h-screen text-slate-900 pb-20">
      <header className="sticky top-0 z-50 bg-white/60 backdrop-blur-xl border-b border-emerald-50/50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={reset}>
            <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
              <i className="fa-solid fa-leaf text-lg"></i>
            </div>
            <span className="text-2xl font-black text-emerald-950 uppercase tracking-tighter">{APP_NAME}</span>
          </div>
          <div className="flex items-center gap-2">
             <button 
              onClick={handleShare}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all active:scale-95"
            >
              <i className={`fa-solid ${shareStatus ? 'fa-check text-emerald-500' : 'fa-share-nodes'}`}></i>
            </button>
            <div className="hidden md:flex bg-emerald-100/50 text-emerald-700 px-4 py-1.5 rounded-full text-[11px] font-black items-center gap-2 uppercase tracking-wider">
               Clinical Guard: Online
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4">
        {!result && loadingState === 'idle' && (
          <div className="pt-16 md:pt-24 flex flex-col items-center text-center">
            <h1 className="text-6xl md:text-8xl font-black text-slate-900 mb-6 tracking-tighter leading-[0.9]">
              Is it <span className="text-emerald-600">Shudh?</span>
            </h1>
            <p className="text-xl text-slate-500 max-w-xl mx-auto mb-16 font-medium px-4">
              Search-grounded clinical audit for toxic food ingredients.
            </p>

            <div className="w-full max-w-2xl glass-card rounded-[3.5rem] p-6 md:p-10 shadow-2xl border-2 border-emerald-50">
              <button 
                onClick={() => setLoadingState('camera')}
                className="w-full p-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[2.5rem] shadow-xl flex items-center justify-between transition-all active:scale-[0.98] mb-6"
              >
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">
                    <i className="fa-solid fa-camera-retro"></i>
                  </div>
                  <div className="text-left">
                    <span className="block text-sm font-bold opacity-60 uppercase tracking-widest mb-1">Deep Scan</span>
                    <span className="block text-2xl font-black tracking-tight">Scan Labels</span>
                  </div>
                </div>
                <i className="fa-solid fa-chevron-right text-xl opacity-30"></i>
              </button>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="relative group bg-slate-50 hover:bg-emerald-50 transition-colors p-8 rounded-[2rem] border-2 border-slate-100/50 flex flex-col items-center justify-center gap-3 overflow-hidden">
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                  <i className="fa-solid fa-cloud-arrow-up text-2xl text-slate-400"></i>
                  <span className="text-xs font-black uppercase tracking-widest text-slate-500">Upload Data</span>
                </div>

                <div className={`transition-all duration-300 p-6 rounded-[2rem] border-2 flex flex-col gap-3 relative ${isUrl(nameInput) ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100/50'}`}>
                   <div className="flex items-center justify-between text-slate-400">
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-magnifying-glass text-xs"></i>
                      <span className="text-[10px] font-black uppercase tracking-widest">Search Product</span>
                    </div>
                  </div>
                  <form onSubmit={onSearchSubmit}>
                    <input 
                      type="text"
                      placeholder="Product or URL..."
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="bg-transparent text-sm font-bold outline-none w-full placeholder:text-slate-300"
                    />
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {loadingState === 'camera' && (
          <CameraScanner 
            onCapture={(imgs) => handleAnalysis(imgs)} 
            onClose={() => setLoadingState('idle')} 
          />
        )}

        {(loadingState === 'analyzing' || loadingState === 'scanning') && (
          <div className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-2xl flex flex-col items-center justify-center p-8 text-center">
            <div className="w-24 h-24 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-8"></div>
            <h2 className="text-3xl font-black text-slate-900 mb-2">Clinical Deep-Audit</h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] animate-pulse h-4">{loadingSubText}</p>
          </div>
        )}

        {loadingState === 'error' && error && (
          <div className="max-w-xl mx-auto mt-20 px-4 animate-in fade-in zoom-in-95">
            <div className="glass-card rounded-[4rem] border-2 border-slate-100 p-12 text-center shadow-2xl">
              <div className={`w-24 h-24 mx-auto mb-8 rounded-full flex items-center justify-center text-4xl shadow-inner ${error.type === 'AUTH' ? 'bg-amber-50 text-amber-500' : 'bg-rose-50 text-rose-500'}`}>
                <i className={`fa-solid ${error.type === 'AUTH' ? 'fa-key' : 'fa-triangle-exclamation'}`}></i>
              </div>
              <h2 className="text-3xl font-black mb-4 text-slate-900">{error.type === 'AUTH' ? 'Clinical Auth Error' : 'Audit Interrupted'}</h2>
              <p className="text-slate-500 font-medium mb-12 leading-relaxed">{error.message}</p>
              <div className="grid gap-3">
                <button onClick={reset} className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-3xl font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition-all active:scale-95">
                  Try Again
                </button>
                {error.type === 'AUTH' && (
                  <a 
                    href="https://ai.google.dev/gemini-api/docs/billing" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 underline"
                  >
                    Setup API Environment Settings
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {result && <AnalysisView result={result} onReset={reset} />}
      </main>
    </div>
  );
};

export default App;