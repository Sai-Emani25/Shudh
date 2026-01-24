
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnalysisResult, LoadingState, ProductCategory, SafetyFlag } from './types.ts';
import { GeminiService } from './services/geminiService.ts';
import { AnalysisView } from './components/AnalysisView.tsx';
import { CameraScanner } from './components/CameraScanner.tsx';
import { APP_NAME, CATEGORY_THEMES } from './constants.tsx';

const App: React.FC = () => {
  const [loadingState, setLoadingState] = useState<LoadingState>('category_selection');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const [loadingSubText, setLoadingSubText] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [error, setError] = useState<{ message: string; type?: string } | null>(null);
  const [autoDownload, setAutoDownload] = useState(false);
  
  const geminiService = useRef(new GeminiService());

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const product = params.get('product');
    const cat = params.get('category') as ProductCategory;
    const vault = params.get('vault');
    
    if (vault) {
      try {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(vault))));
        const restoredResult: AnalysisResult = {
          productName: decoded.n,
          category: decoded.c,
          riskScore: decoded.s,
          scoreExplanation: decoded.ex || "No detailed breakdown available for this legacy audit.",
          overallFlag: decoded.f as SafetyFlag,
          summary: decoded.sm,
          longTermEffects: decoded.lt,
          ingredients: decoded.i.map((ing: any) => ({
            name: ing.n,
            category: ing.c,
            hazardLevel: ing.h,
            description: ing.d,
            potentialRisks: ing.r,
            benefits: ing.b,
            flag: ing.f as SafetyFlag
          })),
          productLabels: decoded.pl,
          verifiedSources: []
        };
        setResult(restoredResult);
        setSelectedCategory(decoded.c);
        setAutoDownload(true);
        setLoadingState('idle');
      } catch (e) {
        console.error("Vault decoding failed", e);
      }
      return;
    }

    if (product && cat && Object.values(ProductCategory).includes(cat)) {
      setSelectedCategory(cat);
      setNameInput(product);
      handleAnalysis(undefined, undefined, product, cat);
    }
  }, []);

  const handleAnalysis = async (images?: string[], url?: string, productName?: string, overrideCategory?: ProductCategory) => {
    const category = overrideCategory || selectedCategory;
    if (!category) return;
    
    setLoadingState('analyzing');
    setLoadingSubText(`Auditing ${category.toLowerCase()}...`);
    setError(null);

    if (productName) {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('product', productName);
      newUrl.searchParams.set('category', category);
      window.history.pushState({}, '', newUrl);
    }

    try {
      const analysis = await geminiService.current.analyzeIngredients({ 
        imageDatas: images, 
        url, 
        productName,
        category
      });

      if (analysis.error === "NOT_FOOD_OR_BLURRY") {
        setError({ message: "Label scanning failed. Please ensure the camera is focused on the ingredient list or drug facts." });
        setLoadingState('error');
      } else {
        setResult(analysis);
        setLoadingState('idle');
      }
    } catch (err: any) {
      setError({ message: "Clinical connection error. Please verify your environment and try again." });
      setLoadingState('error');
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

  const reset = () => {
    setResult(null);
    setLoadingState('category_selection');
    setSelectedCategory(null);
    setError(null);
    setNameInput('');
    setAutoDownload(false);
    const newUrl = new URL(window.location.href);
    newUrl.search = '';
    window.history.pushState({}, '', newUrl);
  };

  const categoryConfigs = {
    [ProductCategory.FOOD]: { 
      icon: 'fa-wheat-awn', 
      label: 'Food & Nutrition', 
      desc: 'Audit additives, neurotoxins, and UPF markers.',
      theme: 'emerald',
      accent: 'bg-emerald-500',
      light: 'bg-emerald-50'
    },
    [ProductCategory.COSMETICS]: { 
      icon: 'fa-sparkles', 
      label: 'Dermal & Beauty', 
      desc: 'Scan for endocrine disruptors and skin toxins.',
      theme: 'rose',
      accent: 'bg-rose-500',
      light: 'bg-rose-50'
    },
    [ProductCategory.MEDICINE]: { 
      icon: 'fa-microscope', 
      label: 'Pharmaceutical', 
      desc: 'Verify excipient purity and clinical side-effects.',
      theme: 'blue',
      accent: 'bg-blue-600',
      light: 'bg-blue-50'
    }
  };

  return (
    <div className="min-h-screen text-slate-900 pb-20">
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-2xl border-b border-slate-100/50 no-print">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer group" onClick={reset}>
            <div className={`w-11 h-11 ${selectedCategory ? `bg-${CATEGORY_THEMES[selectedCategory].primary}` : 'bg-emerald-600'} rounded-2xl flex items-center justify-center text-white shadow-lg transition-all group-hover:rotate-6`}>
              <i className="fa-solid fa-shield-halved text-lg"></i>
            </div>
            <span className="text-2xl font-black tracking-tighter uppercase text-slate-900">{APP_NAME}</span>
          </div>
          
          <div className="flex items-center gap-6">
            {selectedCategory && !result && (
              <button onClick={reset} className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-emerald-600 transition-colors flex items-center gap-2">
                <i className="fa-solid fa-arrow-left"></i> Categories
              </button>
            )}
            <div className="h-8 w-px bg-slate-100 hidden sm:block"></div>
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Active Status</span>
              <span className="text-[11px] font-bold text-slate-400">Clinical AI V3.1</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6">
        {loadingState === 'category_selection' && (
          <div className="pt-24 md:pt-32 text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="mb-6 inline-flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-[0.2em]">Next-Gen Health Auditor</span>
            </div>
            
            <h1 className="text-6xl md:text-9xl font-black mb-6 tracking-tighter leading-[0.85] text-slate-900">
              is it <span className="text-emerald-600">shudh?</span>
            </h1>
            <p className="text-slate-500 font-medium mb-20 text-xl md:text-2xl max-w-2xl mx-auto">
              Real-time clinical audit for hidden toxins in your daily essentials.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {(Object.keys(categoryConfigs) as ProductCategory[]).map((cat) => (
                <button 
                  key={cat}
                  onClick={() => { setSelectedCategory(cat); setLoadingState('idle'); }}
                  className="group relative flex flex-col items-start p-10 md:p-12 bg-white rounded-[3rem] border border-slate-100 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] hover:-translate-y-3 transition-all duration-500 text-left overflow-hidden"
                >
                  <div className={`absolute top-0 right-0 w-48 h-48 -mr-12 -mt-12 rounded-full blur-[80px] opacity-0 group-hover:opacity-40 transition-opacity duration-700 ${categoryConfigs[cat].light}`}></div>
                  
                  <div className={`w-20 h-20 rounded-[1.75rem] mb-10 flex items-center justify-center text-4xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 shadow-sm
                    ${cat === ProductCategory.FOOD ? 'bg-emerald-50 text-emerald-600' : 
                      cat === ProductCategory.COSMETICS ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-blue-600'}`}
                  >
                    <i className={`fa-solid ${categoryConfigs[cat].icon}`}></i>
                  </div>
                  
                  <div className="relative z-10 w-full">
                    <h3 className="text-3xl font-black mb-3 tracking-tight text-slate-900 group-hover:text-black">{categoryConfigs[cat].label}</h3>
                    <p className="text-base text-slate-400 font-medium leading-relaxed mb-10 max-w-[220px]">{categoryConfigs[cat].desc}</p>
                    
                    <div className="flex items-center justify-between w-full pt-6 border-t border-slate-50">
                      <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-300 group-hover:text-slate-900 transition-colors">Select Laboratory</span>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-all transform translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 ${categoryConfigs[cat].accent}`}>
                        <i className="fa-solid fa-chevron-right text-xs"></i>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {!result && loadingState === 'idle' && selectedCategory && (
          <div className="pt-24 flex flex-col items-center animate-in fade-in zoom-in-95 duration-700">
            <div className="w-full max-w-2xl bg-white rounded-[4rem] p-10 md:p-16 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.1)] relative border border-slate-50">
              <div className="mb-14 text-center">
                <div className={`inline-flex items-center gap-3 px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.2em] mb-6 shadow-sm
                  ${CATEGORY_THEMES[selectedCategory].bg} ${CATEGORY_THEMES[selectedCategory].text} border ${CATEGORY_THEMES[selectedCategory].border}`}
                >
                  <i className={`fa-solid ${categoryConfigs[selectedCategory].icon}`}></i>
                  Audit: {categoryConfigs[selectedCategory].label}
                </div>
                <h2 className="text-5xl font-black tracking-tighter text-slate-900 mb-4 leading-tight">Supply Source</h2>
                <p className="text-slate-400 text-lg font-medium">Position ingredients within the frame for a deep bio-audit.</p>
              </div>

              <div className="space-y-6">
                <button 
                  onClick={() => setLoadingState('camera')}
                  className={`w-full p-10 bg-slate-950 hover:bg-black text-white rounded-[3rem] flex items-center justify-between transition-all active:scale-[0.98] shadow-2xl group relative overflow-hidden`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                  <div className="flex items-center gap-8 text-left relative z-10">
                    <div className="w-20 h-20 bg-white/10 rounded-[1.75rem] flex items-center justify-center text-4xl group-hover:scale-110 transition-transform"><i className="fa-solid fa-camera"></i></div>
                    <div>
                      <span className="block text-[11px] font-black opacity-40 uppercase tracking-[0.3em] mb-1.5">Optical Scanner</span>
                      <span className="block text-3xl font-bold tracking-tight">Launch Camera</span>
                    </div>
                  </div>
                  <i className="fa-solid fa-arrow-right opacity-30 text-2xl mr-4 relative z-10 group-hover:translate-x-2 transition-transform"></i>
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="relative bg-slate-50 hover:bg-slate-100 transition-all p-10 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4 group cursor-pointer shadow-sm">
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                    <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      <i className="fa-solid fa-file-arrow-up text-slate-400 text-xl"></i>
                    </div>
                    <span className="text-[12px] font-black uppercase text-slate-500 tracking-[0.1em]">Upload Frame</span>
                  </div>

                  <div className="bg-slate-50 p-10 rounded-[2.5rem] border border-slate-100 flex flex-col justify-center gap-2 group focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all shadow-sm">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mb-2">Web Intelligence</span>
                    <form onSubmit={(e) => { e.preventDefault(); handleAnalysis(undefined, undefined, nameInput); }} className="flex items-center gap-4">
                      <input 
                        type="text"
                        placeholder="Product name..."
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        className="bg-transparent text-xl font-bold outline-none w-full placeholder:text-slate-300"
                      />
                      <button type="submit" className={`w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-${CATEGORY_THEMES[selectedCategory].primary} text-lg hover:scale-110 transition-transform`}><i className="fa-solid fa-magnifying-glass"></i></button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {loadingState === 'camera' && (
          <CameraScanner onCapture={(imgs) => handleAnalysis(imgs)} onClose={() => setLoadingState('idle')} />
        )}

        {(loadingState === 'analyzing' || loadingState === 'scanning') && (
          <div className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-3xl flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500 no-print">
            <div className="w-28 h-28 mb-12 relative">
               <div className="absolute inset-0 border-8 border-slate-100 rounded-full"></div>
               <div className={`absolute inset-0 border-8 ${selectedCategory ? `border-${CATEGORY_THEMES[selectedCategory].primary}` : 'border-emerald-600'} rounded-full border-t-transparent animate-spin`}></div>
               <div className="absolute inset-0 flex items-center justify-center opacity-30">
                 <i className={`fa-solid ${selectedCategory ? categoryConfigs[selectedCategory].icon : 'fa-shield-halved'} text-3xl`}></i>
               </div>
            </div>
            <h2 className="text-5xl font-black mb-4 tracking-tighter uppercase text-slate-900">Conducting Audit</h2>
            <p className="text-slate-400 font-bold uppercase tracking-[0.4em] text-xs max-w-sm leading-relaxed">{loadingSubText}</p>
          </div>
        )}

        {loadingState === 'error' && error && (
          <div className="max-w-xl mx-auto mt-32 text-center animate-in fade-in slide-in-from-bottom-4 duration-500 no-print">
             <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-[2rem] flex items-center justify-center text-4xl mx-auto mb-10 shadow-inner"><i className="fa-solid fa-triangle-exclamation"></i></div>
             <h2 className="text-4xl font-black mb-4 tracking-tight text-slate-900 uppercase leading-none">Audit Terminated</h2>
             <p className="text-slate-500 font-medium mb-16 text-xl px-4">{error.message}</p>
             <button onClick={reset} className="px-16 py-6 bg-slate-950 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs shadow-2xl hover:bg-black active:scale-95 transition-all">Retry Bio-Scan</button>
          </div>
        )}

        {result && <AnalysisView result={result} onReset={reset} autoDownload={autoDownload} />}
      </main>
    </div>
  );
};

export default App;
