
import React, { useState } from 'react';
import { Settings, X, CheckCircle } from 'lucide-react';

interface VisualOilPumpProps { 
    onComplete: () => void; 
}

export const VisualOilPump: React.FC<VisualOilPumpProps> = ({ onComplete }) => {
    const [screws, setScrews] = useState([true, true, true, true]);
    const [isOpen, setIsOpen] = useState(false);
    const [isCleaned, setIsCleaned] = useState(false);
    const [spinCount, setSpinCount] = useState(0);
    const [isClosed, setIsClosed] = useState(false);

    const handleScrewClick = (idx: number) => {
        const newScrews = [...screws];
        newScrews[idx] = false;
        setScrews(newScrews);
        if (newScrews.every(s => !s)) {
            setTimeout(() => setIsOpen(true), 500);
        }
    };

    const handleSpin = () => {
        if (!isCleaned) return;
        setSpinCount(c => c + 1);
    };

    const handleClose = () => {
        setIsClosed(true);
        setTimeout(onComplete, 1000);
    };

    return (
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 flex flex-col items-center relative min-h-[300px]">
            <div className="text-xs text-slate-400 font-mono mb-4 uppercase tracking-widest text-center">
                {!isOpen ? "Step 1: Remove Housing Screws" : !isCleaned ? "Step 2: Clean Debris" : spinCount < 3 ? "Step 3: Manually Spin Impeller" : !isClosed ? "Step 4: Close Unit" : "Maintenance Complete"}
            </div>

            <div className={`relative w-40 h-40 md:w-48 md:h-48 bg-slate-800 rounded-full border-4 border-slate-600 flex items-center justify-center transition-all duration-500 ${isOpen ? 'scale-90' : ''}`}>
                <div 
                    onClick={handleSpin}
                    className={`w-28 h-28 md:w-32 md:h-32 rounded-full border-4 border-slate-500 border-dashed flex items-center justify-center transition-transform duration-700 ${isOpen ? 'opacity-100' : 'opacity-0'} ${spinCount > 0 ? 'cursor-pointer hover:scale-105' : ''}`}
                    style={{ transform: `rotate(${spinCount * 120}deg)` }}
                >
                    <Settings size={64} className={`text-slate-400 ${spinCount > 0 ? 'text-emerald-500' : ''}`} />
                </div>

                {isOpen && !isCleaned && (
                    <button 
                        onClick={() => setIsCleaned(true)}
                        className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center group cursor-pointer z-20"
                    >
                        <div className="bg-rose-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-bounce group-hover:scale-110 transition-transform">
                            CLICK TO CLEAN
                        </div>
                    </button>
                )}

                {!isOpen && !isClosed && (
                    <div className="absolute inset-0 bg-slate-700 rounded-full flex items-center justify-center z-10 shadow-inner">
                        <div className="text-slate-500 font-bold text-lg">PUMP HOUSING</div>
                    </div>
                )}
                
                {!isOpen && screws.map((present, idx) => present && (
                    <button 
                        key={idx}
                        onClick={() => handleScrewClick(idx)}
                        className={`absolute w-6 h-6 bg-slate-300 rounded-full border-2 border-slate-400 flex items-center justify-center shadow-lg hover:bg-white transition-colors z-20 cursor-pointer`}
                        style={{
                            top: idx < 2 ? '10%' : 'auto',
                            bottom: idx >= 2 ? '10%' : 'auto',
                            left: idx % 2 === 0 ? '10%' : 'auto',
                            right: idx % 2 !== 0 ? '10%' : 'auto',
                        }}
                    >
                        <X size={12} className="text-slate-500" />
                    </button>
                ))}

                {isClosed && (
                    <div className="absolute inset-0 bg-emerald-500/20 rounded-full z-30 flex items-center justify-center animate-in fade-in zoom-in">
                        <CheckCircle size={48} className="text-emerald-500" />
                    </div>
                )}
            </div>

            <div className="mt-6 h-12 flex items-center justify-center w-full">
                {isOpen && isCleaned && spinCount < 3 && (
                    <div className="text-sm text-emerald-400 font-bold animate-pulse text-center">Click impeller to spin ({spinCount}/3)</div>
                )}
                {spinCount >= 3 && !isClosed && (
                    <button onClick={handleClose} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-colors">
                        Reassemble Pump
                    </button>
                )}
            </div>
        </div>
    );
};
