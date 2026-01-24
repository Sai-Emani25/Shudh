
import React, { useState, useRef, useEffect } from 'react';
import { AnalysisResult, ProductCategory } from '../types.ts';
import { FLAG_COLORS, FLAG_ICONS, CATEGORY_THEMES } from '../constants.tsx';

// Typing for external libraries loaded via CDN
declare const html2canvas: any;
declare const jspdf: any;

export const AnalysisView: React.FC<{ result: AnalysisResult; onReset: () => void; autoDownload?: boolean }> = ({ result, onReset, autoDownload }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const reportRef = useRef<HTMLDivElement>(null);
  const theme = CATEGORY_THEMES[result.category] || CATEGORY_THEMES.FOOD;

  const generatePDF = async () => {
    if (!reportRef.current) return;
    setIsGenerating(true);
    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#fafdfb'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Shudh_Audit_${result.productName.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('PDF Generation failed', err);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (autoDownload) {
      const timer = setTimeout(() => {
        generatePDF();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [autoDownload]);

  const handleSharePDFLink = async () => {
    try {
      const essentialData = {
        n: result.productName,
        c: result.category,
        s: result.riskScore,
        ex: result.scoreExplanation,
        f: result.overallFlag,
        sm: result.summary,
        lt: result.longTermEffects,
        i: result.ingredients.map(ing => ({
          n: ing.name,
          c: ing.category,
          h: ing.hazardLevel,
          d: ing.description,
          r: ing.potentialRisks,
          b: ing.benefits,
          f: ing.flag
        })),
        pl: result.productLabels
      };

      const jsonStr = JSON.stringify(essentialData);
      const base64Data = btoa(unescape(encodeURIComponent(jsonStr)));
      
      const url = new URL(window.location.href.split('?')[0]);
      url.searchParams.set('vault', base64Data);
      
      const shareUrl = url.toString();

      if (navigator.share) {
        await navigator.share({
          title: `Shudh PDF Audit: ${result.productName}`,
          text: `Download clinical audit for ${result.productName}`,
          url: shareUrl
        });
        setShareStatus('success');
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setShareStatus('success');
        setTimeout(() => setShareStatus('idle'), 3000);
      }
    } catch (err) {
      console.error('Share failed', err);
      setShareStatus('error');
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex justify-between items-center mb-10 no-print">
        <button onClick={onReset} className="text-slate-500 font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:text-emerald-600 transition-colors bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
          <i className="fa-solid fa-arrow-left"></i> New Audit
        </button>
        
        <div className="flex gap-3">
          <button 
            onClick={generatePDF}
            disabled={isGenerating}
            className="flex items-center gap-2 bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all active:scale-95 disabled:opacity-50"
          >
            <i className={`fa-solid ${isGenerating ? 'fa-spinner fa-spin' : 'fa-file-pdf'} text-rose-500`}></i>
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
              {isGenerating ? 'Generating...' : 'Download PDF'}
            </span>
          </button>
          
          <button 
            onClick={handleSharePDFLink}
            className="flex items-center gap-2 bg-slate-900 px-5 py-3 rounded-2xl shadow-xl shadow-slate-200 hover:bg-black transition-all active:scale-95"
          >
            <i className={`fa-solid ${shareStatus === 'success' ? 'fa-check text-emerald-400' : 'fa-link text-white/50'}`}></i>
            <span className="text-[10px] font-black text-white uppercase tracking-widest">
              {shareStatus === 'success' ? 'Link Copied' : 'Share PDF Link'}
            </span>
          </button>
        </div>
      </div>

      <div ref={reportRef} className="glass-card rounded-[3.5rem] p-8 md:p-14 mb-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border-white relative overflow-hidden">
        <div className={`absolute top-0 right-0 p-12 opacity-5 pointer-events-none`}>
          <i className={`fa-solid ${theme.icon} text-9xl`}></i>
        </div>

        {result.scannedImages && result.scannedImages.length > 0 && (
          <div className="flex gap-4 mb-12 overflow-x-auto pb-4 scrollbar-hide">
            {result.scannedImages.map((img, i) => (
              <img key={i} src={img} crossOrigin="anonymous" className="h-48 w-48 rounded-3xl border-4 border-white shadow-xl flex-shrink-0 object-cover" alt="Audit Evidence" />
            ))}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-12 items-start mb-14 relative z-10">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-6">
              <span className={`bg-${theme.primary} text-white text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest shadow-lg shadow-${theme.primary}/20`}>
                {result.category} AUDIT
              </span>
              <div className="h-px flex-1 bg-slate-100"></div>
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                <i className="fa-solid fa-circle-check text-emerald-500"></i> Grounded Search Verified
              </h4>
            </div>
            
            <h2 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter leading-none mb-8">
              {result.productName}
            </h2>

            <div className={`bg-${theme.bg}/50 border-l-8 border-${theme.primary} p-8 rounded-r-[2.5rem] mb-6 shadow-sm`}>
              <p className="text-2xl font-bold text-slate-700 leading-snug italic">"{result.summary}"</p>
            </div>

            {/* New Reasoning Section */}
            <div className="mb-10 bg-slate-50 border border-slate-100 p-6 rounded-3xl">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-3 flex items-center gap-2">
                <i className="fa-solid fa-calculator text-slate-400"></i> Clinical Reasoning
              </h4>
              <p className="text-sm font-medium text-slate-500 leading-relaxed italic">{result.scoreExplanation}</p>
            </div>

            {result.productLabels && result.productLabels.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em]">Clinical Identifiers</h4>
                <div className="flex flex-wrap gap-4">
                  {result.productLabels.map((label, idx) => (
                    <div key={idx} className={`px-6 py-4 rounded-3xl border flex items-center gap-4 shadow-sm transition-all hover:bg-white hover:shadow-md ${label.isPositive ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800' : 'bg-rose-50/50 border-rose-100 text-rose-800'}`}>
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl ${label.isPositive ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                        <i className={`fa-solid ${label.isPositive ? 'fa-award' : 'fa-biohazard'}`}></i>
                      </div>
                      <div>
                        <span className="text-xs font-black uppercase tracking-tight block leading-none mb-1">{label.title}</span>
                        <span className="text-[11px] font-medium opacity-70 block max-w-sm">{label.impact}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="w-full lg:w-96 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-2xl relative overflow-hidden group">
            <div className={`absolute top-0 right-0 p-6 opacity-5 group-hover:rotate-12 transition-transform`}>
              <i className="fa-solid fa-flask-vial text-7xl"></i>
            </div>
            <div className="flex justify-between items-end mb-6 relative z-10">
              <div>
                <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">Toxicity Rating</h4>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full bg-${result.riskScore < 30 ? 'emerald' : result.riskScore < 70 ? 'amber' : 'rose'}-500 animate-pulse`}></span>
                  <span className={`text-[10px] font-black ${result.riskScore < 30 ? 'text-emerald-600' : result.riskScore < 70 ? 'text-amber-600' : 'text-rose-600'} uppercase tracking-widest`}>Clinical Score</span>
                </div>
              </div>
              <p className="text-6xl font-black tracking-tighter">{result.riskScore}<span className="text-base text-slate-300 font-bold">/100</span></p>
            </div>
            <div className="h-5 w-full bg-slate-100 rounded-full overflow-hidden mb-5 p-1 border border-slate-50">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ease-out shadow-inner ${result.riskScore < 30 ? 'bg-emerald-500' : result.riskScore < 70 ? 'bg-amber-500' : 'bg-rose-600'}`}
                style={{ width: `${result.riskScore}%` }}
              ></div>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase text-center tracking-widest mb-10">Real-time Bio-Hazard Profile</p>
            
            <div className="pt-8 border-t border-slate-50 space-y-4">
               <h5 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-4">Audit Key</h5>
               {[
                 { color: 'rose-500', label: 'High Hazard / Toxic Agent' },
                 { color: 'amber-500', label: 'Moderate Hazard / Caution' },
                 { color: 'emerald-500', label: 'Safe / Clinically Pure' }
               ].map((item, idx) => (
                 <div key={idx} className="flex items-center gap-3">
                   <div className={`w-3 h-3 rounded-full bg-${item.color}`}></div>
                   <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">{item.label}</span>
                 </div>
               ))}
            </div>
          </div>
        </div>

        <div className="bg-slate-900 text-white p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-125 transition-transform duration-700">
            <i className="fa-solid fa-microscope text-8xl"></i>
          </div>
          <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-400 mb-8 flex items-center gap-3">
            <i className="fa-solid fa-dna animate-pulse"></i> Clinical Bio-Forecast
          </h4>
          <p className="text-xl font-medium leading-relaxed text-slate-300 italic relative z-10 max-w-3xl">
            {result.longTermEffects}
          </p>
        </div>

        <div className="mt-16 space-y-10">
          <h3 className="text-xs font-black uppercase tracking-[0.4em] text-slate-400 flex items-center gap-6">
            <span className="flex-1 h-px bg-slate-200"></span>
            Chemical Deep-Audit
            <span className="flex-1 h-px bg-slate-200"></span>
          </h3>
          
          {result.ingredients.map((ing, i) => (
            <div key={i} className={`p-10 rounded-[3rem] border-2 ${FLAG_COLORS[ing.flag as keyof typeof FLAG_COLORS]} border-transparent bg-white/40`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                  <h4 className="font-black text-3xl text-slate-900 tracking-tight">{ing.name}</h4>
                  <span className="text-[11px] font-black uppercase tracking-[0.3em] opacity-50 mt-1 block">{ing.category}</span>
                </div>
                <div className="px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest bg-white/80 backdrop-blur-md border border-white/50 shadow-sm flex items-center gap-3 w-fit">
                  {(FLAG_ICONS as any)[ing.flag]} {ing.flag}
                </div>
              </div>
              <p className="text-lg font-medium text-slate-800 leading-relaxed mb-8">{ing.description}</p>
            </div>
          ))}
        </div>
      </div>
      
      <div className="text-center pb-20 no-print">
        <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.4em]">Audit Powered by Shudh Global Health AI</p>
      </div>
    </div>
  );
};
