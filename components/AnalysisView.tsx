import React, { useState } from 'react';
import { AnalysisResult } from '../types.ts';
import { FLAG_COLORS, FLAG_ICONS } from '../constants.tsx';

export const AnalysisView: React.FC<{ result: AnalysisResult; onReset: () => void }> = ({ result, onReset }) => {
  const [shareStatus, setShareStatus] = useState<'idle' | 'success'>('idle');

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareStatus('success');
      setTimeout(() => setShareStatus('idle'), 2000);
    } catch (err) {
      console.warn('Share failed', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center mb-10 no-print">
        <button onClick={onReset} className="text-slate-500 font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:text-emerald-600 transition-colors">
          <i className="fa-solid fa-arrow-left"></i> New Analysis
        </button>
        
        <div className="flex gap-2">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-200 transition-all active:scale-95"
          >
            <i className="fa-solid fa-file-pdf text-rose-500"></i>
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Save Report</span>
          </button>
          
          <button 
            onClick={handleShare}
            className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-200 transition-all active:scale-95"
          >
            <i className={`fa-solid ${shareStatus === 'success' ? 'fa-check text-emerald-500' : 'fa-share-nodes text-slate-400'}`}></i>
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
              {shareStatus === 'success' ? 'Link Copied' : 'Share Link'}
            </span>
          </button>
        </div>
      </div>

      <div className="glass-card rounded-[3rem] p-8 md:p-12 mb-8 shadow-2xl border-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <i className="fa-solid fa-shield-halved text-8xl"></i>
        </div>

        {result.scannedImages && result.scannedImages.length > 0 && (
          <div className="flex gap-4 mb-10 overflow-x-auto pb-4 scrollbar-hide">
            {result.scannedImages.map((img, i) => (
              <img key={i} src={img} className="h-40 rounded-2xl border-2 border-white shadow-md flex-shrink-0 object-cover" alt="Clinical Scan" />
            ))}
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-10 items-start mb-12 relative z-10">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-emerald-600 text-white text-[9px] font-black px-2 py-1 rounded uppercase tracking-tighter">Clinical Verification</span>
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Search Grounding Evidence: Verified</h4>
            </div>
            <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter leading-none mb-6">
              {result.productName}
            </h2>
            <div className="bg-emerald-50/40 border-l-4 border-emerald-500 p-6 rounded-r-2xl mb-8">
              <p className="text-xl font-bold text-slate-700 leading-snug italic">"{result.summary}"</p>
            </div>

            {/* Product Labels Section - Search Grounded */}
            {result.productLabels && result.productLabels.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Clinical Identifiers</h4>
                <div className="flex flex-wrap gap-3">
                  {result.productLabels.map((label, idx) => (
                    <div key={idx} className={`px-4 py-3 rounded-2xl border flex items-center gap-3 shadow-sm ${label.isPositive ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'}`}>
                      <i className={`fa-solid ${label.isPositive ? 'fa-certificate' : 'fa-triangle-exclamation'} text-lg`}></i>
                      <div>
                        <span className="text-xs font-black uppercase tracking-tight block leading-none mb-1">{label.title}</span>
                        <span className="text-[10px] font-medium opacity-80 block max-w-xs">{label.impact}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="w-full md:w-80 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Toxicity Rating</h4>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter">Active Audit</span>
                </div>
              </div>
              <p className="text-5xl font-black tracking-tighter">{result.riskScore}<span className="text-sm text-slate-300 font-bold">/100</span></p>
            </div>
            <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden mb-3">
              <div 
                className={`h-full transition-all duration-1000 ease-out ${result.riskScore < 30 ? 'bg-emerald-500' : result.riskScore < 70 ? 'bg-amber-500' : 'bg-rose-600'}`}
                style={{ width: `${result.riskScore}%` }}
              ></div>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase text-center tracking-tighter">Verified Clinical Search Profile</p>
            
            {/* Clinical Key / Legend Added here */}
            <div className="mt-8 pt-6 border-t border-slate-50 space-y-3">
               <h5 className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Clinical Audit Key</h5>
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                 <span className="text-[10px] font-bold text-slate-600">RED: High Hazard / Carcinogen</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                 <span className="text-[10px] font-bold text-slate-600">YELLOW: Moderate Hazard / Disruptor</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                 <span className="text-[10px] font-bold text-slate-600">GREEN: Safe / Clinically Pure</span>
               </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <i className="fa-solid fa-dna text-7xl"></i>
          </div>
          <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-6 flex items-center gap-2">
            <i className="fa-solid fa-microscope"></i> Clinical Bio-Forecast
          </h4>
          <p className="text-lg font-medium leading-relaxed text-slate-300 italic relative z-10">{result.longTermEffects}</p>
        </div>
      </div>

      <div className="space-y-6 mb-16">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-10 flex items-center gap-4">
          <span className="flex-1 h-px bg-slate-100"></span>
          Chemical Deep-Audit
          <span className="flex-1 h-px bg-slate-100"></span>
        </h3>
        {result.ingredients.map((ing, i) => (
          <div key={i} className={`p-8 rounded-[2.5rem] border transition-all hover:translate-y-[-4px] ${FLAG_COLORS[ing.flag as keyof typeof FLAG_COLORS]} shadow-sm`}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="font-black text-2xl text-slate-900 tracking-tight">{ing.name}</h4>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{ing.category}</span>
              </div>
              <div className="px-4 py-2 rounded-full text-[10px] font-black uppercase bg-white/70 backdrop-blur-sm border border-white/50 shadow-sm flex items-center gap-2">
                {(FLAG_ICONS as any)[ing.flag]} {ing.flag}
              </div>
            </div>
            <p className="text-base font-medium text-slate-800 leading-relaxed mb-8">{ing.description}</p>
            <div className="grid md:grid-cols-2 gap-6">
              {ing.potentialRisks.length > 0 && (
                <div className="bg-white/40 p-5 rounded-3xl border border-rose-200/50">
                  <h5 className="text-[10px] font-black text-rose-700 uppercase tracking-widest mb-3">Clinical Risks</h5>
                  <ul className="space-y-2">
                    {ing.potentialRisks.map((r, ri) => (
                      <li key={ri} className="text-xs font-bold text-rose-900 flex items-start gap-2">
                        <i className="fa-solid fa-circle text-[4px] mt-2 opacity-40"></i>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {ing.benefits.length > 0 && (
                <div className="bg-white/40 p-5 rounded-3xl border border-emerald-200/50">
                  <h5 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-3">Clinical Benefits</h5>
                  <ul className="space-y-2">
                    {ing.benefits.map((b, bi) => (
                      <li key={bi} className="text-xs font-bold text-emerald-900 flex items-start gap-2">
                        <i className="fa-solid fa-circle text-[4px] mt-2 opacity-40"></i>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {result.verifiedSources && result.verifiedSources.length > 0 && (
        <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-xl mb-10">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-8 flex items-center gap-3">
            <i className="fa-solid fa-link text-emerald-500"></i> Clinical Evidence Profile
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.verifiedSources.map((src, idx) => (
              <a 
                key={idx} 
                href={src.uri} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-between p-5 bg-slate-50 hover:bg-emerald-50 rounded-2xl transition-all group border border-transparent hover:border-emerald-100"
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black text-slate-700 group-hover:text-emerald-700 truncate">{src.title}</span>
                  <span className="text-[10px] text-slate-400 truncate mt-0.5">{new URL(src.uri).hostname}</span>
                </div>
                <i className="fa-solid fa-arrow-up-right-from-square text-[11px] text-slate-300 group-hover:text-emerald-500 ml-4 flex-shrink-0"></i>
              </a>
            ))}
          </div>
        </div>
      )}
      
      <div className="text-center pb-20 no-print">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Generated via Shudh Clinical Guardian</p>
      </div>
    </div>
  );
};