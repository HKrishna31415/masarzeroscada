import React from 'react';

interface VisualMCBProps { 
    label: string; 
    code: string; 
    status: 'TRIPPED' | 'NORMAL' | 'OFF'; 
    isTarget: boolean; 
    onReset: () => void; 
}

export const VisualMCB: React.FC<VisualMCBProps> = ({ label, code, status, isTarget, onReset }) => {
    const isTripped = status === 'TRIPPED' || status === 'OFF';
    
    return (
        <div className={`relative w-20 md:w-24 bg-slate-100 dark:bg-slate-700 border-2 rounded-lg flex flex-col items-center p-2 shadow-xl transition-all duration-500 ${isTarget ? 'border-rose-500 ring-2 ring-rose-500/50 scale-105 z-10' : 'border-slate-300 dark:border-slate-600 opacity-80'}`}>
            {/* Top Terminals */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-2">
                <div className="w-2 h-4 bg-slate-400 rounded-sm border border-slate-500"></div>
                <div className="w-2 h-4 bg-slate-400 rounded-sm border border-slate-500"></div>
            </div>

            {/* Brand/Code */}
            <div className="w-full text-center mb-4">
                <div className="text-[10px] font-bold text-slate-500">{code}</div>
                <div className="text-[6px] text-slate-400 uppercase tracking-widest">Breaker</div>
            </div>

            {/* Switch Mechanism */}
            <div className="relative w-12 h-20 bg-slate-200 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-600 mb-2 flex justify-center items-center shadow-inner">
                {/* Status Window */}
                <div className={`absolute top-2 w-8 h-2 rounded-sm ${isTripped ? 'bg-green-500' : 'bg-red-500'} transition-colors duration-300`}></div>
                <div className="absolute top-2 w-8 h-2 flex justify-between px-0.5 items-center text-[4px] font-bold text-white/80 pointer-events-none">
                    <span>OFF</span><span>ON</span>
                </div>

                {/* Lever */}
                <button
                    onClick={isTarget ? onReset : undefined}
                    disabled={!isTarget}
                    className={`
                        w-10 h-10 rounded shadow-lg border-b-4 transition-all duration-500 flex items-center justify-center z-10
                        ${isTripped 
                            ? 'translate-y-4 bg-slate-800 border-slate-950' 
                            : '-translate-y-4 bg-slate-700 border-slate-900'}
                        ${isTarget && isTripped ? 'cursor-pointer hover:bg-slate-700 animate-pulse ring-2 ring-rose-400' : 'cursor-default'}
                    `}
                >
                   <div className="w-6 h-1 bg-slate-600 rounded-full opacity-50"></div>
                </button>
                
                {/* Track */}
                <div className="absolute w-2 h-16 bg-black/20 rounded-full"></div>
            </div>

            {/* Bottom Specs */}
            <div className="text-[8px] font-mono text-slate-500 text-center w-full border-t border-slate-300 dark:border-slate-600 pt-1">
                C16
                <div className="text-[6px]">230/400V~</div>
            </div>
            
            {/* Bottom Terminals */}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                <div className="w-2 h-4 bg-slate-400 rounded-sm border border-slate-500"></div>
                <div className="w-2 h-4 bg-slate-400 rounded-sm border border-slate-500"></div>
            </div>

            <div className="mt-2 text-[8px] text-slate-500 dark:text-slate-400 font-bold text-center uppercase tracking-tighter w-full truncate">{label}</div>
        </div>
    );
};
