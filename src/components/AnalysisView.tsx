
import React from 'react';
import { AnalysisResult, SafetyFlag, IngredientAnalysis } from '../types.ts';
import { FLAG_COLORS, FLAG_ICONS } from '../constants.tsx';

interface AnalysisViewProps {
  result: AnalysisResult;
  onReset: () => void;
}

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
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Precise Toxicity Score</h4>
          <p className="text-3xl font-black text-slate-900">{score}<span className="text-slate-300 text-lg">/100</span></p>
        </div>
        <div className="text-right">
          <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-wider ${
            score < 30 ? 'bg-emerald-100 text-emerald-700' : 
            score < 70 ? 'bg-amber-100 text-amber-700' : 
            'bg-rose-100 text-rose-700 border border-rose-200'
          }`}>
            {score < 30 ? 'Safe' : score < 70 ? 'Warning' : 'Hazardous'}
          </span>
        </div>
      </div>
      <div className="relative h-4 w-full bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={`absolute top-0 bottom-0 left-0 transition-all duration-1000 ease-out ${getColor()}`} 
          style={{ width: `${score}%` }}
        ></div>
      </div>
      <div className="flex justify-between mt-3 text-[9px] font-black text-slate-300 uppercase tracking-widest">
        <span>Pure</span>
        <span>Neutral</span>
        <span>Toxic</span>
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
