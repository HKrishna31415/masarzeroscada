
import React, { useState } from 'react';
import { Wind, Snowflake, CheckCircle } from 'lucide-react';

interface VisualEvaporatorProps { 
    onComplete: () => void; 
}

export const VisualEvaporator: React.FC<VisualEvaporatorProps> = ({ onComplete }) => {
    const [hasCover, setHasCover] = useState(true);
    const [hasIce, setHasIce] = useState(true);
    const [spinCount, setSpinCount] = useState(0);
    const [isClosed, setIsClosed] = useState(false);

    const handleSpin = () => {
        if (!hasIce) setSpinCount(c => c + 1);
    };

    const handleClose = () => {
        setIsClosed(true);
        setTimeout(onComplete, 1000);
    };

    return (
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 flex flex-col items-center relative min-h-[300px]">
            <div className="text-xs text-slate-400 font-mono mb-4 uppercase tracking-widest text-center">
                {hasCover ? "Step 1: Open Evaporator Panel" : hasIce ? "Step 2: Clear Ice Buildup" : spinCount < 3 ? "Step 3: Check Fan Rotation" : !isClosed ? "Step 4: Close Panel" : "Inspection Complete"}
            </div>

            <div className="relative w-64 h-48 bg-slate-800 border-4 border-slate-600 rounded-lg flex items-center justify-center overflow-hidden shadow-inner">
                {/* Fan Graphic */}
                <div 
                    onClick={handleSpin}
                    className={`transition-transform duration-500 ${hasIce ? '' : 'cursor-pointer'} ${spinCount > 0 ? 'duration-150 ease-linear' : ''}`}
                    style={{ transform: `rotate(${spinCount * 120}deg)` }}
                >
                    <div className="relative w-32 h-32 flex items-center justify-center">
                        <div className="absolute w-4 h-32 bg-slate-500 rounded-full"></div>
                        <div className="absolute w-32 h-4 bg-slate-500 rounded-full"></div>
                        <div className="absolute w-20 h-20 bg-slate-400 rounded-full border-4 border-slate-600 z-10 flex items-center justify-center">
                            <Wind className="text-slate-600" size={32} />
                        </div>
                    </div>
                </div>

                {/* Ice Overlay */}
                {hasIce && !hasCover && (
                    <div 
                        onClick={() => setHasIce(false)}
                        className="absolute inset-0 bg-white/20 backdrop-blur-[2px] flex items-center justify-center cursor-pointer group z-20"
                    >
                        <div className="absolute top-4 right-4 text-blue-200 animate-bounce"><Snowflake size={24} /></div>
                        <div className="absolute bottom-4 left-4 text-blue-200 animate-bounce delay-100"><Snowflake size={32} /></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full flex items-center justify-center">
                            <div className="bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg transition-transform group-hover:scale-110">
                                CLICK TO DEFROST
                            </div>
                        </div>
                    </div>
                )}

                {/* Cover */}
                {hasCover && (
                    <div 
                        onClick={() => setHasCover(false)}
                        className="absolute inset-0 bg-slate-700 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-600 transition-colors z-30"
                    >
                        <div className="w-full h-full grid grid-cols-6 gap-1 p-2">
                            {Array.from({length: 24}).map((_, i) => (
                                <div key={i} className="bg-slate-900/30 rounded-sm"></div>
                            ))}
                        </div>
                        <div className="absolute bg-slate-800 px-3 py-1 rounded text-[10px] font-bold text-slate-300 border border-slate-500">
                            CLICK TO OPEN
                        </div>
                    </div>
                )}

                {isClosed && (
                    <div className="absolute inset-0 bg-emerald-500/20 z-40 flex items-center justify-center animate-in fade-in zoom-in">
                        <CheckCircle size={64} className="text-emerald-500 drop-shadow-lg" />
                    </div>
                )}
            </div>

            <div className="mt-6 h-12 flex items-center justify-center w-full">
                {!hasCover && !hasIce && spinCount < 3 && (
                    <div className="text-sm text-emerald-400 font-bold animate-pulse text-center">Click fan to spin ({spinCount}/3)</div>
                )}
                {spinCount >= 3 && !isClosed && (
                    <button onClick={handleClose} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-colors">
                        Reinstall Panel
                    </button>
                )}
            </div>
        </div>
    );
};
