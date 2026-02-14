
import React, { useState, useRef } from 'react';
import { AnalysisResult, ProductCategory } from '../types.ts';
import { FLAG_COLORS, CATEGORY_THEMES } from '../constants.tsx';

// Typing for external libraries loaded via CDN
declare const html2canvas: any;
declare const jspdf: any;

interface Task {
  id: number;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  completed: boolean;
}

export const Taskr: React.FC<{ result: AnalysisResult; onClose: () => void }> = ({ result, onClose }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const theme = CATEGORY_THEMES[result.category] || CATEGORY_THEMES.FOOD;

  // Generate tasks based on the analysis result
  const generateTasks = (): Task[] => {
    const tasks: Task[] = [];
    let taskId = 1;

    // Add tasks based on risk score
    if (result.riskScore > 70) {
      tasks.push({
        id: taskId++,
        title: 'Consider Alternative Products',
        description: `This product has a high risk score of ${result.riskScore}/100. Research and identify safer alternatives in the market.`,
        priority: 'high',
        category: 'Product Safety',
        completed: false
      });
    }

    // Add tasks for ingredients with RED flags
    const redFlagIngredients = result.ingredients.filter(ing => ing.flag === 'RED');
    if (redFlagIngredients.length > 0) {
      tasks.push({
        id: taskId++,
        title: 'Review High-Risk Ingredients',
        description: `${redFlagIngredients.length} ingredient(s) flagged as high risk: ${redFlagIngredients.map(i => i.name).join(', ')}. Consult with a healthcare professional about potential risks.`,
        priority: 'high',
        category: 'Health & Safety',
        completed: false
      });
    }

    // Add tasks for ingredients with YELLOW flags
    const yellowFlagIngredients = result.ingredients.filter(ing => ing.flag === 'YELLOW');
    if (yellowFlagIngredients.length > 0) {
      tasks.push({
        id: taskId++,
        title: 'Monitor Moderate-Risk Ingredients',
        description: `${yellowFlagIngredients.length} ingredient(s) require caution: ${yellowFlagIngredients.map(i => i.name).join(', ')}. Track any adverse reactions or symptoms.`,
        priority: 'medium',
        category: 'Health Monitoring',
        completed: false
      });
    }

    // Add task for long-term effects
    if (result.longTermEffects) {
      tasks.push({
        id: taskId++,
        title: 'Understand Long-Term Health Implications',
        description: result.longTermEffects,
        priority: result.riskScore > 70 ? 'high' : 'medium',
        category: 'Long-Term Health',
        completed: false
      });
    }

    // Add a research task
    tasks.push({
      id: taskId++,
      title: 'Research Product Information',
      description: `Learn more about ${result.productName} and compare with similar products in the ${result.category.toLowerCase()} category.`,
      priority: 'low',
      category: 'Research',
      completed: false
    });

    // Add a documentation task
    tasks.push({
      id: taskId++,
      title: 'Document Product Usage',
      description: 'Keep a log of when and how you use this product to track any patterns or reactions over time.',
      priority: 'low',
      category: 'Documentation',
      completed: false
    });

    return tasks;
  };

  const [tasks, setTasks] = useState<Task[]>(generateTasks());

  const toggleTask = (taskId: number) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
  };

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
      pdf.save(`Shudh_Taskr_${result.productName.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('PDF Generation failed', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-rose-500';
      case 'medium':
        return 'bg-amber-500';
      case 'low':
        return 'bg-emerald-500';
      default:
        return 'bg-slate-500';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'fa-circle-exclamation';
      case 'medium':
        return 'fa-circle-info';
      case 'low':
        return 'fa-circle-check';
      default:
        return 'fa-circle';
    }
  };

  const completedTasks = tasks.filter(t => t.completed).length;
  const progressPercentage = (completedTasks / tasks.length) * 100;

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex justify-between items-center mb-10 no-print">
        <button onClick={onClose} className="text-slate-500 font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:text-emerald-600 transition-colors bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
          <i className="fa-solid fa-arrow-left"></i> Back to Analysis
        </button>
        
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
      </div>

      <div ref={reportRef} className="glass-card rounded-[3.5rem] p-8 md:p-14 mb-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border-white relative overflow-hidden">
        <div className={`absolute top-0 right-0 p-12 opacity-5 pointer-events-none`}>
          <i className="fa-solid fa-list-check text-9xl"></i>
        </div>

        <div className="flex flex-col lg:flex-row gap-12 items-start mb-14 relative z-10">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-6">
              <span className={`bg-${theme.primary} text-white text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest shadow-lg shadow-${theme.primary}/20`}>
                {result.category} ACTION PLAN
              </span>
              <div className="h-px flex-1 bg-slate-100"></div>
              <h4 className="text-[10px] font-black uppercase text-blue-500 tracking-widest flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                <i className="fa-solid fa-clipboard-check"></i> Task Manager
              </h4>
            </div>
            
            <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter leading-tight mb-8 break-words">
              Taskr Report: {result.productName}
            </h2>

            <div className={`bg-${theme.bg}/50 border-l-8 border-${theme.primary} p-8 rounded-r-[2.5rem] mb-6 shadow-sm`}>
              <p className="text-2xl font-bold text-slate-700 leading-snug italic">
                "Action-oriented recommendations based on your product audit."
              </p>
            </div>
          </div>
          
          <div className="w-full lg:w-96 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:rotate-12 transition-transform">
              <i className="fa-solid fa-tasks text-7xl"></i>
            </div>
            <div className="relative z-10">
              <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4">Task Progress</h4>
              <div className="flex items-center gap-4 mb-6">
                <span className="text-6xl font-black tracking-tighter">{completedTasks}<span className="text-base text-slate-300 font-bold">/{tasks.length}</span></span>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Completed</span>
                  <span className="text-xs font-medium text-slate-400">{Math.round(progressPercentage)}% Done</span>
                </div>
              </div>
              <div className="h-5 w-full bg-slate-100 rounded-full overflow-hidden mb-5 p-1 border border-slate-50">
                <div 
                  className="h-full rounded-full transition-all duration-500 ease-out shadow-inner bg-emerald-500"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase text-center tracking-widest">Track Your Health Actions</p>
            </div>
          </div>
        </div>

        <div className="space-y-6 mb-16">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-[0.4em] text-slate-400">Action Items</h3>
            <div className="flex gap-3 text-[9px] font-black uppercase tracking-widest">
              <span className="bg-rose-50 text-rose-600 px-3 py-1 rounded-full border border-rose-200">
                {tasks.filter(t => t.priority === 'high').length} High
              </span>
              <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full border border-amber-200">
                {tasks.filter(t => t.priority === 'medium').length} Medium
              </span>
              <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full border border-emerald-200">
                {tasks.filter(t => t.priority === 'low').length} Low
              </span>
            </div>
          </div>
          
          {tasks.map((task) => (
            <div 
              key={task.id} 
              className={`p-8 rounded-[2.5rem] border-2 bg-white shadow-sm transition-all hover:shadow-md cursor-pointer ${
                task.completed ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100'
              }`}
              onClick={() => toggleTask(task.id)}
            >
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 pt-1">
                  <div className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all ${
                    task.completed 
                      ? 'bg-emerald-500 border-emerald-500' 
                      : 'bg-white border-slate-300 hover:border-emerald-400'
                  }`}>
                    {task.completed && <i className="fa-solid fa-check text-white text-sm"></i>}
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <h4 className={`font-black text-2xl tracking-tight mb-2 ${
                        task.completed ? 'text-slate-400 line-through' : 'text-slate-900'
                      }`}>
                        {task.title}
                      </h4>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                          {task.category}
                        </span>
                      </div>
                    </div>
                    <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-white ${getPriorityColor(task.priority)} flex items-center gap-2 shadow-sm flex-shrink-0`}>
                      <i className={`fa-solid ${getPriorityIcon(task.priority)}`}></i>
                      {task.priority}
                    </div>
                  </div>
                  
                  <p className={`text-base font-medium leading-relaxed ${
                    task.completed ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    {task.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-slate-900 text-white p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-125 transition-transform duration-700">
            <i className="fa-solid fa-lightbulb text-8xl"></i>
          </div>
          <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-400 mb-6 flex items-center gap-3">
            <i className="fa-solid fa-circle-info"></i> Pro Tip
          </h4>
          <p className="text-xl font-medium leading-relaxed text-slate-300 italic relative z-10 max-w-3xl">
            Complete high-priority tasks first to address the most critical health and safety concerns. 
            Keep this action plan handy and update it as you make progress on each item.
          </p>
        </div>
      </div>
      
      <div className="text-center pb-20 no-print">
        <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.4em]">
          Taskr Report Generated by Shudh AI Engine
        </p>
      </div>
    </div>
  );
};
