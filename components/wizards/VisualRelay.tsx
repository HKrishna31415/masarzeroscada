
import React from 'react';

interface VisualRelayProps { 
    label: string; 
    code: string; 
    status: 'TRIPPED' | 'NORMAL' | 'OFF'; 
    isTarget: boolean; 
    onReset: () => void; 
}

export const VisualRelay: React.FC<VisualRelayProps> = ({ label, code, status, isTarget, onReset }) => {
    return (
        <div className={`relative w-20 md:w-24 bg-slate-800 border-2 rounded-lg flex flex-col items-center p-2 shadow-xl transition-all duration-500 ${isTarget ? 'border-rose-500 ring-2 ring-rose-500/50 scale-105 z-10' : 'border-slate-600 opacity-80'}`}>
            <div className="flex gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-slate-400 border border-slate-600"></div>
                <div className="w-2 h-2 rounded-full bg-slate-400 border border-slate-600"></div>
                <div className="w-2 h-2 rounded-full bg-slate-400 border border-slate-600"></div>
            </div>
            <div className="w-full bg-slate-300 text-slate-900 font-bold text-center text-xs py-0.5 rounded-sm mb-2 shadow-inner">{code}</div>
            <div className="w-12 h-8 bg-slate-900 border border-slate-600 mb-2 flex items-center justify-center rounded overflow-hidden relative">
                <div className={`w-6 h-2 rounded-sm ${status === 'TRIPPED' ? 'bg-amber-500 animate-pulse' : status === 'NORMAL' ? 'bg-emerald-500' : 'bg-slate-700'}`}></div>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.2)_1px,transparent_1px)] bg-[size:100%_4px]"></div>
            </div>
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-slate-600 bg-slate-700 mb-2 flex items-center justify-center relative">
                <div className="absolute w-0.5 h-3 bg-white top-1 origin-bottom transform rotate-12"></div>
                <span className="text-[6px] text-slate-400 absolute top-6">AMPS</span>
            </div>
            <div className="flex gap-2 w-full justify-center">
                <button 
                    onClick={isTarget ? onReset : undefined}
                    className={`w-6 h-8 rounded-sm flex items-center justify-center shadow-md transition-all active:scale-95 ${isTarget && status === 'TRIPPED' ? 'bg-blue-600 hover:bg-blue-500 cursor-pointer animate-bounce' : 'bg-blue-800 cursor-default'}`}
                    title="Reset"
                >
                    <span className="text-[6px] text-white font-bold transform -rotate-90">RST</span>
                </button>
                <div className="w-6 h-8 bg-red-700 rounded-sm flex items-center justify-center shadow-md border-b-2 border-red-900">
                    <span className="text-[6px] text-white font-bold transform -rotate-90">STOP</span>
                </div>
            </div>
            <div className="mt-2 text-[8px] text-slate-400 font-mono text-center uppercase tracking-tighter w-full truncate">{label}</div>
        </div>
    );
};
