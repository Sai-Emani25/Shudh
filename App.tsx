
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
  
  const geminiService = useRef(new GeminiService());

  const isUrl = (str: string) => {
    try {
      const u = new URL(str);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch { return false; }
  };

  const handleAnalysis = async (images?: string[], url?: string, productName?: string) => {
    setLoadingState('analyzing');
    setLoadingSubText('Initializing clinical sensors...');
    setError(null);

    const subtexts = [
      'Scanning molecular profiles...', 
      'Consulting toxicological indices...', 
      'Injecting search grounding...', 
      'Verifying long-term health impact...'
    ];
    let subIdx = 0;
    const interval = setInterval(() => {
      subIdx = (subIdx + 1) % subtexts.length;
      setLoadingSubText(subtexts[subIdx]);
    }, 3000);

    try {
      const analysis = await geminiService.current.analyzeIngredients({ 
        imageDatas: images, 
        url, 
        productName 
      });

      if (analysis.error === "NOT_FOOD_OR_BLURRY") {
        setError({ message: "Failed to read label. Please ensure the image is clear and contains ingredients.", type: 'INVALID' });
        setLoadingState('error');
      } else {
        setResult(analysis);
        setLoadingState('idle');
      }
    } catch (err: any) {
      setError({ message: err.message || "An unexpected error occurred during analysis.", type: 'GENERIC' });
      setLoadingState('error');
    } finally {
      clearInterval(interval);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLoadingState('scanning');
      const reader = new FileReader();
      reader.onload = (e) => handleAnalysis([e.target?.result as string]);
      reader.readAsDataURL(file);
    }
  };

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    if (isUrl(nameInput)) handleAnalysis(undefined, nameInput, undefined);
    else handleAnalysis(undefined, undefined, nameInput);
  };

  const reset = () => {
    setResult(null);
    setLoadingState('idle');
    setError(null);
    setNameInput('');
  };

  return (
    <div className="min-h-screen text-slate-900 pb-20">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-emerald-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={reset}>
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
              <i className="fa-solid fa-leaf text-sm"></i>
            </div>
            <span className="text-xl font-extrabold text-emerald-950 tracking-tighter uppercase">{APP_NAME}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
              Clinical Guard Active
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4">
        {!result && loadingState === 'idle' && (
          <div className="pt-20 md:pt-32 flex flex-col items-center text-center">
            <h1 className="text-5xl md:text-8xl font-black text-slate-900 mb-6 tracking-tighter leading-none">
              Is it truly <span className="text-emerald-600">Shudh?</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-500 max-w-xl mx-auto mb-16 font-medium">
              A clinical toxicological audit for your food. Unmask nasty chemicals hidden behind complex names.
            </p>

            <div className="w-full max-w-2xl glass-card rounded-[3rem] p-6 md:p-8 shadow-2xl border-2 border-white">
              <button 
                onClick={() => setLoadingState('camera')}
                className="w-full p-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-3xl shadow-xl flex items-center justify-between transition-all active:scale-[0.98] mb-6 group"
              >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-2xl group-hover:rotate-12 transition-transform">
                    <i className="fa-solid fa-camera"></i>
                  </div>
                  <div className="text-left">
                    <span className="block text-[10px] font-black opacity-60 uppercase tracking-widest mb-1">Deep Analysis</span>
                    <span className="block text-xl font-bold tracking-tight">Scan Ingredient List</span>
                  </div>
                </div>
                <i className="fa-solid fa-chevron-right text-lg opacity-30"></i>
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative bg-slate-50 hover:bg-slate-100 transition-colors p-6 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2">
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <i className="fa-solid fa-upload text-slate-400"></i>
                  <span className="text-[10px] font-black uppercase text-slate-500">Upload Photo</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 flex flex-col gap-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Search Product</span>
                  <form onSubmit={onSearchSubmit} className="flex items-center gap-2">
                    <input 
                      type="text"
                      placeholder="Name or URL..."
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="bg-transparent text-sm font-bold outline-none w-full placeholder:text-slate-300"
                    />
                    <button type="submit" className="text-emerald-600"><i className="fa-solid fa-arrow-right"></i></button>
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
          <div className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-2xl flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
            <div className="relative w-24 h-24 mb-10">
              <div className="absolute inset-0 border-4 border-emerald-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-emerald-600 rounded-full border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-emerald-600 animate-pulse">
                <i className="fa-solid fa-dna text-2xl"></i>
              </div>
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tighter">Clinical Audit in Progress</h2>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] h-4">{loadingSubText}</p>
          </div>
        )}

        {loadingState === 'error' && error && (
          <div className="max-w-lg mx-auto mt-20 px-4 animate-in fade-in zoom-in-95">
            <div className="glass-card rounded-[3rem] border-2 border-rose-50 p-10 text-center shadow-2xl">
              <div className="w-20 h-20 mx-auto mb-6 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-3xl">
                <i className="fa-solid fa-triangle-exclamation"></i>
              </div>
              <h2 className="text-2xl font-black mb-3 text-slate-900">Audit Interrupted</h2>
              <p className="text-slate-500 font-medium mb-10 text-sm leading-relaxed">{error.message}</p>
              <button onClick={reset} className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-bold transition-all active:scale-95 shadow-xl">
                Return to Lab
              </button>
            </div>
          </div>
        )}

        {result && <AnalysisView result={result} onReset={reset} />}
      </main>
    </div>
  );
};

export default App;
