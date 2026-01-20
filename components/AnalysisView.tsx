
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
          <span className={`text-xs font-black px-3 py-1 rounded-full uppercase ${score < 30 ? 'bg-emerald-100 text-emerald-700' : score < 70 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
            {score < 30 ? 'Safe & Pure' : score < 70 ? 'Proceed with Caution' : 'Dangerous to Health'}
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
      <div className="flex justify-between mt-2 text-[10px] font-bold text-slate-300 uppercase tracking-tighter">
        <span>Healthy</span>
        <span>Neutral</span>
        <span>Hazardous</span>
      </div>
    </div>
  );
};

const IngredientCard: React.FC<{ ingredient: IngredientAnalysis }> = ({ ingredient }) => {
  const flagColorClass = FLAG_COLORS[ingredient.flag] || FLAG_COLORS[SafetyFlag.YELLOW];
  
  return (
    <div className={`p-6 rounded-[2rem] border mb-4 transition-all hover:shadow-md ${flagColorClass} border-opacity-50`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-black text-xl tracking-tight">{ingredient.name}</h4>
          <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest">{ingredient.category}</span>
        </div>
        <div className="flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider">
          {FLAG_ICONS[ingredient.flag] || FLAG_ICONS[SafetyFlag.YELLOW]}
          {ingredient.flag === SafetyFlag.RED ? 'Harmful' : ingredient.flag === SafetyFlag.YELLOW ? 'Caution' : 'Purity'}
        </div>
      </div>
      
      <p className="text-sm font-medium mb-5 leading-relaxed opacity-90">{ingredient.description}</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ingredient.benefits && Array.isArray(ingredient.benefits) && ingredient.benefits.length > 0 && (
          <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10">
            <h5 className="text-[10px] font-black text-emerald-700 uppercase mb-2 flex items-center gap-1">
              <i className="fa-solid fa-plus-circle"></i> Benefits
            </h5>
            <ul className="text-xs space-y-1 text-emerald-800 font-medium">
              {ingredient.benefits.map((b, i) => <li key={i}>• {b}</li>)}
            </ul>
          </div>
        )}
        {ingredient.potentialRisks && Array.isArray(ingredient.potentialRisks) && ingredient.potentialRisks.length > 0 && (
          <div className="bg-rose-500/5 p-4 rounded-2xl border border-rose-500/10">
            <h5 className="text-[10px] font-black text-rose-700 uppercase mb-2 flex items-center gap-1">
              <i className="fa-solid fa-minus-circle"></i> Risks
            </h5>
            <ul className="text-xs space-y-1 text-rose-800 font-medium">
              {ingredient.potentialRisks.map((r, i) => <li key={i}>• {r}</li>)}
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
      <div className="flex justify-between items-center mb-8">
        <button 
          onClick={onReset}
          className="flex items-center gap-2.5 text-slate-400 hover:text-emerald-700 transition-all font-black text-sm uppercase tracking-widest"
        >
          <i className="fa-solid fa-chevron-left text-xs"></i>
          New Purity Scan
        </button>
        <button 
          onClick={handleShare}
          className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-5 py-2.5 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all font-black text-xs uppercase tracking-widest"
        >
          <i className="fa-solid fa-share-nodes"></i>
          Share Report
        </button>
      </div>

      <div className={`rounded-[3.5rem] p-8 md:p-12 mb-8 shadow-2xl shadow-emerald-950/5 relative overflow-hidden bg-white border border-slate-50`}>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter leading-none text-slate-900">{result.productName}</h2>
            <div className={`px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest shadow-sm ${
              result.overallFlag === SafetyFlag.RED ? 'bg-rose-600 text-white' : 
              result.overallFlag === SafetyFlag.YELLOW ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
            }`}>
              {result.overallFlag} RATING
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <div className="space-y-6">
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Immediate Impact</h4>
                <p className="text-lg text-slate-700 leading-relaxed font-medium">"{result.summary}"</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Long-Term Health Forecast</h4>
                <p className="text-sm text-slate-600 leading-relaxed italic">{result.longTermEffects}</p>
              </div>
            </div>
            
            <RiskMeter score={result.riskScore} />
          </div>
        </div>
      </div>

      {result.nutritionalInsights && Array.isArray(result.nutritionalInsights) && result.nutritionalInsights.length > 0 && (
        <div className="mb-12 bg-white rounded-[2.5rem] p-8 border border-slate-50 shadow-sm">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <i className="fa-solid fa-chart-pie text-emerald-500"></i> Nutritional Dynamics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.nutritionalInsights.map((n, i) => (
              <div key={i} className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 items-start">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  n.impact === 'Positive' ? 'bg-emerald-100 text-emerald-600' : 
                  n.impact === 'Negative' ? 'bg-rose-100 text-rose-600' : 'bg-slate-200 text-slate-600'
                }`}>
                  <i className={`fa-solid ${n.impact === 'Positive' ? 'fa-arrow-up' : n.impact === 'Negative' ? 'fa-arrow-down' : 'fa-minus'}`}></i>
                </div>
                <div>
                  <p className="text-sm font-black text-slate-800">{n.fact}</p>
                  <p className="text-xs text-slate-500 font-medium">{n.effect}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4 px-2 mb-16">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 border-b border-slate-100 pb-4 flex items-center justify-between">
          <span>Detailed Ingredient Toxicology</span>
          <span className="text-[10px] font-bold text-slate-300 lowercase italic">Classified by harm vs benefit</span>
        </h3>
        {result.ingredients && Array.isArray(result.ingredients) && result.ingredients.map((ing, idx) => (
          <IngredientCard key={idx} ingredient={ing} />
        ))}
      </div>

      {result.verifiedSources && Array.isArray(result.verifiedSources) && result.verifiedSources.length > 0 && (
        <div className="mb-20 bg-emerald-950 text-white rounded-[3rem] p-10 shadow-2xl shadow-emerald-900/20">
          <h3 className="text-xs font-black uppercase tracking-[0.3em] mb-8 text-emerald-400 flex items-center gap-3">
             <i className="fa-solid fa-graduation-cap"></i> Verified Scientific Resources
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {result.verifiedSources.map((src, idx) => (
              <a 
                key={idx} 
                href={src.uri} 
                target="_blank" 
                rel="noopener noreferrer"
                className="group p-5 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all flex items-start gap-4"
              >
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-emerald-300 group-hover:scale-110 transition-transform">
                  <i className={`fa-solid ${src.type === 'video' ? 'fa-play-circle' : src.type === 'research' ? 'fa-flask' : 'fa-file-lines'}`}></i>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black leading-tight mb-1 group-hover:text-emerald-300 transition-colors">{src.title}</p>
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{src.type} • Official Source</span>
                </div>
                <i className="fa-solid fa-arrow-up-right-from-square text-[10px] opacity-30 group-hover:opacity-100"></i>
              </a>
            ))}
          </div>
        </div>
      )}
      <div className="text-center text-slate-300 text-[10px] font-bold uppercase tracking-widest px-10 border-t border-slate-50 pt-10 pb-20">
        <p>Shudh DeepScan uses generative AI to synthesize clinical research. Always consult a nutritionist for personal medical conditions.</p>
      </div>
    </div>
  );
};
