
import React from 'react';
import { AnalysisResult, SafetyFlag, IngredientAnalysis } from '../types.ts';
import { FLAG_COLORS, FLAG_ICONS } from '../constants.tsx';

interface AnalysisViewProps {
  result: AnalysisResult;
  onReset: () => void;
}

const RiskMeter: React.FC<{ score: number }> = ({ score }) => {
  const getPosition = () => `${score}%`;
  const getColor = () => {
    if (score < 30) return 'bg-emerald-500';
    if (score < 70) return 'bg-amber-500';
    return 'bg-rose-600';
  };

  return (
    <div className="mb-10 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Toxicity Risk Meter</h4>
          <p className="text-3xl font-black text-slate-900">{score}<span className="text-slate-300 text-lg">/100</span></p>
        </div>
        <div className="text-right">
          <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-wider ${
            score < 30 ? 'bg-emerald-100 text-emerald-700' : 
            score < 70 ? 'bg-amber-100 text-amber-700' : 
            'bg-rose-100 text-rose-700 border border-rose-200'
          }`}>
            {score < 30 ? 'Safe & Pure' : score < 70 ? 'Moderate Concern' : 'High Toxicity Alert'}
          </span>
        </div>
      </div>
      <div className="relative h-4 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 opacity-20"></div>
        <div 
          className={`absolute top-0 bottom-0 left-0 transition-all duration-1000 ease-out ${getColor()}`} 
          style={{ width: getPosition() }}
        >
          <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/40"></div>
        </div>
      </div>
      <div className="flex justify-between mt-3 text-[9px] font-black text-slate-300 uppercase tracking-widest">
        <span>Pure</span>
        <span>Neutral</span>
        <span>Hazardous</span>
      </div>
    </div>
  );
};

const IngredientCard: React.FC<{ ingredient: IngredientAnalysis }> = ({ ingredient }) => {
  const flagColorClass = FLAG_COLORS[ingredient.flag] || FLAG_COLORS[SafetyFlag.YELLOW];
  
  return (
    <div className={`p-6 rounded-[2rem] border mb-4 transition-all hover:translate-y-[-2px] hover:shadow-lg ${flagColorClass} border-opacity-50`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-black text-xl tracking-tight text-slate-900">{ingredient.name}</h4>
          <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">{ingredient.category}</span>
        </div>
        <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border border-white/50">
          {FLAG_ICONS[ingredient.flag] || FLAG_ICONS[SafetyFlag.YELLOW]}
          {ingredient.flag === SafetyFlag.RED ? 'Clinical Hazard' : ingredient.flag === SafetyFlag.YELLOW ? 'Caution' : 'Safe'}
        </div>
      </div>
      
      <p className="text-sm font-medium mb-6 leading-relaxed text-slate-800/80">{ingredient.description}</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ingredient.benefits && Array.isArray(ingredient.benefits) && ingredient.benefits.length > 0 && (
          <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10">
            <h5 className="text-[9px] font-black text-emerald-700 uppercase mb-3 flex items-center gap-1.5">
              <i className="fa-solid fa-circle-check"></i> Positive Attributes
            </h5>
            <ul className="text-xs space-y-2 text-emerald-900 font-medium">
              {ingredient.benefits.map((b, i) => <li key={i} className="flex gap-2"><span>•</span> {b}</li>)}
            </ul>
          </div>
        )}
        {ingredient.potentialRisks && Array.isArray(ingredient.potentialRisks) && ingredient.potentialRisks.length > 0 && (
          <div className="bg-rose-500/5 p-4 rounded-2xl border border-rose-500/10">
            <h5 className="text-[9px] font-black text-rose-700 uppercase mb-3 flex items-center gap-1.5">
              <i className="fa-solid fa-circle-radiation"></i> Health Risks
            </h5>
            <ul className="text-xs space-y-2 text-rose-900 font-medium">
              {ingredient.potentialRisks.map((r, i) => <li key={i} className="flex gap-2"><span>•</span> {r}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export const AnalysisView: React.FC<AnalysisViewProps> = ({ result, onReset }) => {
  const handleShare = async () => {
    const reportSummary = `Shudh Health Report: ${result.productName}\nRisk Score: ${result.riskScore}/100\nSummary: ${result.summary}\n\nCheck your food purity with Shudh.`;
    const currentUrl = window.location.href;
    const isValidUrl = currentUrl.startsWith('http');
    const shareData: ShareData = {
      title: `Shudh Report: ${result.productName}`,
      text: reportSummary,
    };
    if (isValidUrl) shareData.url = currentUrl;

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        throw new Error();
      }
    } catch (err) {
      try {
        await navigator.clipboard.writeText(reportSummary + (isValidUrl ? `\n\nLink: ${currentUrl}` : ''));
        alert("Report summary copied to clipboard!");
      } catch (clipboardErr) {
        alert("Unable to share at this time.");
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex justify-between items-center mb-10">
        <button 
          onClick={onReset}
          className="group flex items-center gap-2.5 text-slate-400 hover:text-emerald-700 transition-all font-black text-xs uppercase tracking-[0.2em]"
        >
          <i className="fa-solid fa-arrow-left text-[10px] group-hover:-translate-x-1 transition-transform"></i>
          Analyze Another
        </button>
        <button 
          onClick={handleShare}
          className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl hover:bg-emerald-700 transition-all font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-600/20"
        >
          <i className="fa-solid fa-share-nodes"></i>
          Share Report
        </button>
      </div>

      <div className={`rounded-[3.5rem] p-8 md:p-12 mb-10 shadow-2xl shadow-emerald-950/5 relative overflow-hidden bg-white border border-slate-50`}>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div>
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mb-2 block">Verified Product Analysis</span>
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter leading-none text-slate-900">{result.productName}</h2>
            </div>
            <div className={`px-6 py-2.5 rounded-full font-black text-[11px] uppercase tracking-widest shadow-md ${
              result.overallFlag === SafetyFlag.RED ? 'bg-rose-600 text-white animate-pulse' : 
              result.overallFlag === SafetyFlag.YELLOW ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
            }`}>
              {result.overallFlag} STATUS
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-10 items-start">
            <div className="space-y-8">
              <div>
                <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  Toxicological Summary
                </h4>
                <p className="text-xl text-slate-800 leading-snug font-semibold tracking-tight">"{result.summary}"</p>
              </div>
              <div className="p-7 bg-slate-50 rounded-[2.5rem] border border-slate-100/50">
                <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">5-10 Year Health Forecast</h4>
                <p className="text-sm text-slate-600 leading-relaxed italic font-medium">“{result.longTermEffects}”</p>
              </div>
            </div>
            
            <RiskMeter score={result.riskScore} />
          </div>
        </div>
      </div>

      {result.nutritionalInsights && Array.isArray(result.nutritionalInsights) && result.nutritionalInsights.length > 0 && (
        <div className="mb-14 bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-3">
            <i className="fa-solid fa-dna text-emerald-500"></i> Metabolic Impact Data
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {result.nutritionalInsights.map((n, i) => (
              <div key={i} className="flex gap-5 p-5 rounded-3xl bg-slate-50/50 border border-slate-100 items-start hover:bg-white hover:shadow-md transition-all">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                  n.impact === 'Positive' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                  n.impact === 'Negative' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-100 text-slate-500'
                }`}>
                  <i className={`fa-solid ${n.impact === 'Positive' ? 'fa-bolt' : n.impact === 'Negative' ? 'fa-triangle-exclamation' : 'fa-equals'}`}></i>
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900 mb-1">{n.fact}</p>
                  <p className="text-[11px] text-slate-500 font-bold leading-relaxed">{n.effect}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6 px-2 mb-20">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 border-b border-slate-100 pb-6 flex items-center justify-between">
          <span className="flex items-center gap-2"><i className="fa-solid fa-flask-vial"></i> Full Toxicology Panel</span>
          <span className="text-[9px] font-bold text-slate-300 italic">Scientific peer-reviewed data</span>
        </h3>
        {result.ingredients && Array.isArray(result.ingredients) && result.ingredients.map((ing, idx) => (
          <IngredientCard key={idx} ingredient={ing} />
        ))}
      </div>

      {result.verifiedSources && Array.isArray(result.verifiedSources) && result.verifiedSources.length > 0 && (
        <div className="mb-24 bg-slate-900 text-white rounded-[3.5rem] p-12 shadow-2xl">
          <h3 className="text-[10px] font-black uppercase tracking-[0.4em] mb-10 text-emerald-400 flex items-center gap-3">
             <i className="fa-solid fa-microscope"></i> Grounding Sources
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {result.verifiedSources.map((src, idx) => (
              <a 
                key={idx} 
                href={src.uri} 
                target="_blank" 
                rel="noopener noreferrer"
                className="group p-6 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all flex items-start gap-5"
              >
                <div className="w-14 h-14 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                  <i className={`fa-solid ${src.type === 'video' ? 'fa-circle-play' : src.type === 'research' ? 'fa-book-medical' : 'fa-newspaper'} text-xl`}></i>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black leading-tight mb-2 group-hover:text-emerald-400 transition-colors">{src.title}</p>
                  <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-2">
                    {src.type} <div className="w-1 h-1 rounded-full bg-white/20"></div> Peer-Reviewed
                  </span>
                </div>
                <i className="fa-solid fa-external-link text-[10px] opacity-20 group-hover:opacity-100 self-center"></i>
              </a>
            ))}
          </div>
        </div>
      )}
      
      <div className="text-center px-10 border-t border-slate-100 pt-12 pb-24 opacity-40">
        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 leading-loose max-w-2xl mx-auto">
          AI generated summary from live clinical database. Always verify with primary literature. 
          Shudh is an independent toxicology tool and does not receive funding from food manufacturing conglomerates.
        </p>
      </div>
    </div>
  );
};
