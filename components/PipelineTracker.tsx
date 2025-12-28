import React from 'react';
import { Check, AlertCircle, Loader2, X, Terminal, Cpu, Database, Cloud } from 'lucide-react';

interface PipelineStep {
  id: string;
  label: string;
  status: 'waiting' | 'active' | 'complete' | 'error';
  progress?: number;
  detail?: string;
  currentAction?: string;
  errorMsg?: string;
  subLabel?: string;
}

interface PipelineTrackerProps {
  steps: PipelineStep[];
}

export const PipelineTracker: React.FC<PipelineTrackerProps> = ({ steps }) => {
  const totalSteps = steps.length || 5;
  const defaultSteps = steps.length === 0 ? [
    { id: 'upload', label: 'Upload', status: 'waiting' as const },
    { id: 'parse', label: 'Parse', status: 'waiting' as const },
    { id: 'embed', label: 'Embed', status: 'waiting' as const },
    { id: 'store', label: 'Index', status: 'waiting' as const },
    { id: 'ready', label: 'Ready', status: 'waiting' as const }
  ] : steps;
  
  const displaySteps = defaultSteps;
  const activeIndex = displaySteps.findIndex(s => s.status === 'active' || s.status === 'error');
  const errorIndex = displaySteps.findIndex(s => s.status === 'error');
  const hasError = errorIndex !== -1;

  let fillPercentage = 0;
  if (hasError) {
    fillPercentage = (errorIndex / (totalSteps - 1)) * 100;
  } else if (activeIndex === -1) {
    const allComplete = displaySteps.every(s => s.status === 'complete');
    fillPercentage = allComplete ? 100 : 0;
  } else {
    const segmentSize = 100 / (totalSteps - 1);
    const baseFill = activeIndex * segmentSize;
    const activeStep = displaySteps[activeIndex];
    const activeProgressFraction = (activeStep.progress !== undefined ? activeStep.progress : 50) / 100;
    const additionalFill = activeProgressFraction * segmentSize;
    fillPercentage = Math.min(baseFill + additionalFill, 100);
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-2">
      <div className="relative h-12 flex items-center w-full">
        {/* Track */}
        <div className="absolute top-1/2 left-0 w-full h-1.5 bg-slate-200 dark:bg-slate-700 -translate-y-1/2 rounded-full -z-10" />

        {/* Liquid Fill */}
        <div 
          className={`absolute top-1/2 left-0 h-1.5 -translate-y-1/2 rounded-full -z-10 transition-all duration-1000 ease-in-out ${
            hasError ? 'bg-red-400' : 'bg-gradient-to-r from-blue-500 to-cyan-400'
          }`}
          style={{ width: `${fillPercentage}%` }}
        >
          {!hasError && fillPercentage < 100 && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-cyan-400 rounded-full blur-[2px] shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          )}
        </div>

        {/* Nodes */}
        <div className="w-full flex justify-between items-center z-0">
          {displaySteps.map((step, index) => {
            const isFilled = index <= activeIndex || (step.status === 'complete');
            const isActive = step.status === 'active';
            const isError = step.status === 'error';

            return (
              <div key={step.id} className="group relative">
                <div 
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center border-[3px] transition-all duration-500
                    ${isError 
                      ? 'bg-red-500 border-red-100 text-white scale-110 shadow-red-200 shadow-lg' 
                      : isActive 
                        ? 'bg-white dark:bg-[#1a1a1a] border-blue-500 text-blue-500 scale-125 shadow-blue-200 shadow-lg' 
                        : isFilled 
                          ? 'bg-blue-500 border-blue-500 text-white scale-100' 
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-300 dark:text-slate-600'
                    }
                  `}
                >
                  {isError ? <X size={14} strokeWidth={3} /> :
                   isActive ? <Loader2 size={14} className="animate-spin" /> :
                   isFilled ? <Check size={14} strokeWidth={4} /> :
                   <div className="w-2 h-2 rounded-full bg-current" />
                  }
                </div>

                <div className={`
                  absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold tracking-wide uppercase whitespace-nowrap transition-colors
                  ${isActive ? 'text-blue-600 dark:text-blue-400' : isError ? 'text-red-600 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'}
                `}>
                  {step.label}
                </div>

                <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-48 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none translate-y-2 group-hover:translate-y-0 z-20">
                  <div className="bg-slate-800 dark:bg-slate-900 text-white text-xs rounded-lg p-3 shadow-xl relative">
                    <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 dark:bg-slate-900 rotate-45" />
                    <div className="font-bold mb-1">{step.label}</div>
                    <div className="text-slate-300 leading-relaxed">
                      {step.status === 'active' ? (
                        <>
                          <span className="text-blue-300 font-mono block mb-1">{step.currentAction || step.detail}</span>
                          {step.progress !== undefined && (
                            <div className="w-full bg-slate-700 h-1 rounded-full overflow-hidden mt-1">
                              <div className="bg-blue-400 h-full transition-all duration-300" style={{ width: `${step.progress}%` }} />
                            </div>
                          )}
                        </>
                      ) : step.status === 'error' ? (
                        <span className="text-red-300 block">{step.errorMsg || step.detail}</span>
                      ) : (
                        <span className="block">{step.subLabel || step.detail || 'Pending...'}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
