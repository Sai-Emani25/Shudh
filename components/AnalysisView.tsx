import React, { useState } from 'react';
import { AnalysisResult } from '../types.ts';
import { FLAG_COLORS, FLAG_ICONS } from '../constants.tsx';

export const AnalysisView: React.FC<{ result: AnalysisResult; onReset: () => void }> = ({ result, onReset }) => {
  const [shareStatus, setShareStatus] = useState<'idle' | 'success' | 'unsupported'>('idle');

  const handleShare = async () => {
    const shareData = {
      title: `Shudh Analysis: ${result.productName}`,
      text: `I just checked ${result.productName} on Shudh. It has a Toxicity Score of ${result.riskScore}/100. ${result.summary}`,
      url: window.location.href,
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        setShareStatus('success');
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setShareStatus('success');
        setTimeout(() => setShareStatus('idle'), 2000);
      }
    } catch (err) {
      console.warn('Sharing failed', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-10">
        <button onClick={onReset} className="text-slate-500 font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:text-emerald-600 transition-colors">
          <i className="fa-solid fa-arrow-left"></i> New Analysis
        </button>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleShare}
            className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-200 hover:bg-emerald-50 transition-all active:scale-95"
          >
            <i className={`fa-solid ${shareStatus === 'success' ? 'fa-check text-emerald-500' : 'fa-share-nodes text-slate-400'}`}></i>
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
              {shareStatus === 'success' ? 'Copied' : 'Share Report'}
            </span>
          </button>
        </div>
      </div>

      <div className="glass-card rounded-[3rem] p-8 md:p-12 mb-8 shadow-2xl border-white overflow-hidden">
        {result.scannedImages && result.scannedImages.length > 0 && (
          <div className="flex gap-4 mb-10 overflow-x-auto pb-4 scrollbar-hide">
            {result.scannedImages.map((img, i) => (
              <img key={i} src={img} className="h-40 rounded-2xl border-2 border-white shadow-md flex-shrink-0" alt="Captured Label" />
            ))}
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-10 items-start mb-12">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-1 rounded uppercase tracking-tighter">Verified by Search</span>
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Grounding Engine Active</h4>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none mb-6">
              {result.productName}
            </h2>
            <div className="bg-emerald-50/50 border-l-4 border-emerald-500 p-6 rounded-r-2xl mb-6">
              <p className="text-xl font-bold text-slate-700 leading-snug italic">"{result.summary}"</p>
            </div>

            {/* Product Labels Section */}
            {result.productLabels && result.productLabels.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {result.productLabels.map((label, idx) => (
                  <div key={idx} className={`px-4 py-2 rounded-2xl border flex items-center gap-2 shadow-sm ${label.isPositive ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'}`}>
                    <i className={`fa-solid ${label.isPositive ? 'fa-certificate' : 'fa-triangle-exclamation'}`}></i>
                    <div>
                      <span className="text-xs font-black uppercase tracking-tight block leading-none">{label.title}</span>
                      <span className="text-[9px] font-medium opacity-70 block">{label.impact}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="w-full md:w-80 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Toxicity Score</h4>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[9px] font-black text-emerald-600 uppercase">Live Verification</span>
                </div>
              </div>
              <p className="text-4xl font-black tracking-tighter">{result.riskScore}<span className="text-sm text-slate-300 font-bold">/100</span></p>
            </div>
            <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden mb-2">
              <div 
                className={`h-full transition-all duration-1000 ease-out ${result.riskScore < 30 ? 'bg-emerald-500' : result.riskScore < 70 ? 'bg-amber-500' : 'bg-rose-600'}`}
                style={{ width: `${result.riskScore}%` }}
              ></div>
            </div>
            <p className="text-[9px] font-bold text-slate-400 uppercase text-center tracking-tighter">Refined via Google Search Evidence</p>
          </div>
        </div>

        <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <i className="fa-solid fa-microscope text-6xl"></i>
          </div>
          <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-4 flex items-center gap-2">
            <i className="fa-solid fa-dna"></i> Research-Backed Forecast
          </h4>
          <p className="text-sm font-medium leading-relaxed text-slate-300 italic relative z-10">{result.longTermEffects}</p>
        </div>
      </div>

      <div className="space-y-6 mb-12">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-8 flex items-center gap-3">
          <span className="flex-1 h-px bg-slate-100"></span>
          Deep Chemical Analysis (Verified)
          <span className="flex-1 h-px bg-slate-100"></span>
        </h3>
        {result.ingredients.map((ing, i) => (
          <div key={i} className={`p-6 rounded-[2rem] border transition-all hover:shadow-lg ${FLAG_COLORS[ing.flag as keyof typeof FLAG_COLORS] || 'bg-slate-50 border-slate-200'} shadow-sm`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-black text-xl text-slate-900 tracking-tight">{ing.name}</h4>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{ing.category}</span>
              </div>
              <div className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase bg-white/60 backdrop-blur-sm border border-white/50 shadow-sm flex items-center gap-2">
                {(FLAG_ICONS as any)[ing.flag]} {ing.flag}
              </div>
            </div>
            <p className="text-sm font-medium text-slate-800 leading-relaxed mb-6">{ing.description}</p>
            <div className="grid md:grid-cols-2 gap-4">
              {ing.potentialRisks.length > 0 && (
                <div className="bg-rose-500/5 p-4 rounded-2xl border border-rose-500/10">
                  <h5 className="text-[9px] font-black text-rose-700 uppercase tracking-widest mb-2">Toxicity Markers</h5>
                  <ul className="space-y-1">
                    {ing.potentialRisks.map((r, ri) => (
                      <li key={ri} className="text-[11px] font-bold text-rose-900 flex items-start gap-2">
                        <i className="fa-solid fa-circle text-[4px] mt-1.5 opacity-40"></i>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {ing.benefits.length > 0 && (
                <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10">
                  <h5 className="text-[9px] font-black text-emerald-700 uppercase tracking-widest mb-2">Clinical Benefits</h5>
                  <ul className="space-y-1">
                    {ing.benefits.map((b, bi) => (
                      <li key={bi} className="text-[11px] font-bold text-emerald-900 flex items-start gap-2">
                        <i className="fa-solid fa-circle text-[4px] mt-1.5 opacity-40"></i>
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
        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">
            <i className="fa-solid fa-link mr-2"></i> Clinical Evidence & Sources (Grounding Data)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {result.verifiedSources.map((src, idx) => (
              <a 
                key={idx} 
                href={src.uri} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-slate-50 hover:bg-emerald-50 rounded-2xl transition-all group"
              >
                <div className="flex flex-col">
                  <span className="text-xs font-black text-slate-700 group-hover:text-emerald-700 truncate max-w-[250px]">{src.title}</span>
                  <span className="text-[9px] text-slate-400 truncate max-w-[200px]">{src.uri}</span>
                </div>
                <i className="fa-solid fa-arrow-up-right-from-square text-[10px] text-slate-300 group-hover:text-emerald-500"></i>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};