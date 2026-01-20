
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnalysisResult, LoadingState } from './types.ts';
import { GeminiService } from './services/geminiService.ts';
import { AnalysisView } from './components/AnalysisView.tsx';
import { CameraScanner } from './components/CameraScanner.tsx';
import { APP_NAME } from './constants.tsx';

const App: React.FC = () => {
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const lastRequestTime = useRef<number>(0);
  const geminiService = useRef(new GeminiService());

  // Deep-linking support
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('check') || params.get('q');
    if (query && loadingState === 'idle' && !result) {
      setNameInput(query);
      handleAnalysis(undefined, undefined, query);
    }
  }, []);

  const handleAnalysis = async (images?: string[], url?: string, productName?: string) => {
    const now = Date.now();
    if (now - lastRequestTime.current < 4000) {
      setError("Please wait a moment between scans.");
      setLoadingState('error');
      return;
    }
    
    lastRequestTime.current = now;
    setLoadingState('analyzing');
    setError(null);

    // Update URL for shareability if searching by name
    if (productName) {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('check', productName);
      window.history.pushState({}, '', newUrl);
    }
    
    try {
      const analysis = await geminiService.current.analyzeIngredients({ 
        imageDatas: images, 
        url, 
        productName 
      });
      setResult(analysis);
      setLoadingState('idle');
    } catch (err: any) {
      setError(err.message);
      setLoadingState('error');
    }
  };

  const processImageFile = useCallback(async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large (max 5MB).');
      setLoadingState('error');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image.');
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

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    handleAnalysis(undefined, urlInput);
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    handleAnalysis(undefined, undefined, nameInput);
  };

  const reset = () => {
    setResult(null);
    setLoadingState('idle');
    setError(null);
    setUrlInput('');
    setNameInput('');
    // Clear query params on reset
    const newUrl = new URL(window.location.href);
    newUrl.search = '';
    window.history.pushState({}, '', newUrl);
  };

  return (
    <div className="min-h-screen text-slate-900 pb-20">
      <header className="sticky top-0 z-50 bg-white/60 backdrop-blur-xl border-b border-emerald-50/50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={reset}>
            <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <i className="fa-solid fa-leaf text-lg"></i>
            </div>
            <span className="text-2xl font-black text-emerald-950 uppercase tracking-tighter">{APP_NAME}</span>
          </div>
          <div className="hidden md:flex bg-emerald-100/50 text-emerald-700 px-4 py-1.5 rounded-full text-[11px] font-black items-center gap-2 uppercase tracking-wider border border-emerald-200/50">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Clinical Guardian Online
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4">
        {!result && loadingState === 'idle' && (
          <div className="pt-16 md:pt-24 flex flex-col items-center">
            {/* Hero Section */}
            <section className="text-center relative mb-16">
              <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/5 blur-[120px] rounded-full -z-10"></div>
              
              <div className="inline-block px-4 py-1.5 bg-emerald-50 rounded-full text-emerald-600 text-[10px] font-black uppercase tracking-[0.3em] mb-8 animate-in slide-in-from-top-4 duration-700 border border-emerald-100">
                Purity Lens Pro
              </div>
              
              <h1 className="text-6xl md:text-8xl font-black text-slate-900 mb-6 tracking-tighter leading-[0.9] animate-in slide-in-from-bottom-8 duration-1000">
                Is it <span className="text-emerald-600">Safe?</span>
              </h1>
              
              <p className="text-xl text-slate-500 max-w-xl mx-auto leading-relaxed animate-in fade-in duration-1000 delay-300">
                Scan labels or search by name to uncover hidden toxins.
              </p>
            </section>

            {/* Unified Action Hub */}
            <section className="w-full max-w-2xl glass-card rounded-[3.5rem] p-4 md:p-10 shadow-[0_30px_100px_rgba(5,150,105,0.1)] border-2 border-emerald-50 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
              <div className="flex flex-col gap-6">
                
                {/* Primary Action: Camera */}
                <button 
                  onClick={() => setLoadingState('camera')}
                  className="group w-full p-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[2.5rem] shadow-2xl shadow-emerald-600/20 flex items-center justify-between transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">
                      <i className="fa-solid fa-camera-retro"></i>
                    </div>
                    <div className="text-left">
                      <span className="block text-sm font-bold text-emerald-200 uppercase tracking-widest mb-1 text-xs">Live Mode</span>
                      <span className="block text-2xl font-black tracking-tight">Open Lens Scanner</span>
                    </div>
                  </div>
                  <i className="fa-solid fa-chevron-right text-xl opacity-30 group-hover:translate-x-1 transition-transform"></i>
                </button>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Secondary Left: Upload */}
                  <div className="relative group bg-slate-50 hover:bg-emerald-50 transition-colors p-8 rounded-[2rem] border-2 border-slate-100/50 flex flex-col items-center justify-center gap-3 overflow-hidden">
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    <i className="fa-solid fa-cloud-arrow-up text-2xl text-slate-400 group-hover:text-emerald-600 transition-colors"></i>
                    <span className="text-xs font-black uppercase tracking-widest text-slate-500 group-hover:text-emerald-700">Upload Label</span>
                  </div>

                  {/* Secondary Right: Name Search */}
                  <div className="relative group bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100/50 focus-within:border-emerald-500/50 transition-all flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-slate-400 group-focus-within:text-emerald-500">
                      <i className="fa-solid fa-magnifying-glass text-xs"></i>
                      <span className="text-[10px] font-black uppercase tracking-widest">Search by Name</span>
                    </div>
                    <form onSubmit={handleNameSubmit} className="flex flex-col gap-2">
                      <input 
                        type="text"
                        placeholder="e.g. Takis Fuego"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        className="bg-transparent text-sm font-bold outline-none placeholder:text-slate-300 w-full"
                      />
                      <button type="submit" className="text-left text-[9px] font-black uppercase tracking-widest text-emerald-600 opacity-0 group-focus-within:opacity-100 transition-opacity">
                        Quick Scan <i className="fa-solid fa-arrow-right ml-1"></i>
                      </button>
                    </form>
                  </div>
                </div>

                {/* Tertiary: URL Input */}
                <form onSubmit={handleUrlSubmit} className="relative group">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                    <i className="fa-solid fa-link"></i>
                  </div>
                  <input 
                    type="url" 
                    placeholder="Paste product URL (Amazon, Walmart, etc)..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="w-full pl-14 pr-32 py-5 rounded-[1.8rem] border-2 border-slate-100 focus:border-emerald-500 focus:bg-white outline-none text-sm font-medium bg-slate-50 transition-all"
                  />
                  <button 
                    type="submit" 
                    className="absolute right-2 top-2 bottom-2 px-6 bg-slate-900 text-white rounded-[1.4rem] font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all"
                  >
                    Scan Link
                  </button>
                </form>

              </div>
            </section>

            {/* Trust Footer */}
            <div className="mt-12 flex items-center gap-8 text-slate-400 opacity-60 animate-in fade-in duration-1000 delay-1000">
              <div className="flex -space-x-3">
                {[1,2,3].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px]">
                    <i className={`fa-solid fa-shield-heart text-emerald-500/50`}></i>
                  </div>
                ))}
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em]">Clinical Research Grounding</p>
            </div>
          </div>
        )}

        {loadingState === 'camera' && (
          <CameraScanner 
            onCapture={(images) => handleAnalysis(images)} 
            onClose={() => setLoadingState('idle')} 
          />
        )}

        {(loadingState === 'analyzing' || loadingState === 'scanning') && (
          <div className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-2xl flex flex-col items-center justify-center p-8">
            <div className="relative mb-12">
              <div className="w-24 h-24 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-emerald-600 text-2xl">
                <i className="fa-solid fa-magnifying-glass-chart animate-pulse"></i>
              </div>
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Consulting Lab Data</h2>
            <div className="space-y-2 text-center">
              <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Comparing scientific journals & official records</p>
              <p className="text-emerald-600 text-sm font-medium animate-pulse">Gemini 3 Pro deep-scan active...</p>
            </div>
          </div>
        )}

        {loadingState === 'error' && (
          <div className="max-w-lg mx-auto text-center py-24 px-10 glass-card rounded-[4rem] border border-rose-100 mt-20">
            <div className="w-20 h-20 bg-rose-100 rounded-[2rem] flex items-center justify-center text-rose-600 mx-auto mb-8">
              <i className="fa-solid fa-circle-exclamation text-3xl"></i>
            </div>
            <h2 className="text-3xl font-black text-rose-900 mb-4 tracking-tight">Scan Interrupted</h2>
            <p className="text-rose-700/70 mb-12 font-medium leading-relaxed">{error}</p>
            <button onClick={reset} className="w-full py-5 bg-rose-600 text-white rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-rose-600/20 hover:bg-rose-700 transition-all">Try Again</button>
          </div>
        )}

        {result && <AnalysisView result={result} onReset={reset} />}
      </main>

      <footer className="mt-32 border-t border-slate-100 py-16 px-4 text-center opacity-40">
        <div className="max-w-4xl mx-auto space-y-4">
          <span className="text-[10px] font-black text-emerald-950 uppercase tracking-tighter">SHUDH LENS PRO</span>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em] max-w-sm mx-auto leading-relaxed">
            Independent Toxicology Engine. Not Medical Advice.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
