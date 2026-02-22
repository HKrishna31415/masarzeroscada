import React, { useState } from 'react';
import { Badge } from '../ui';
import { Cable, Zap, Wrench, ArrowUp, ArrowDown } from 'lucide-react';

interface VisualOWSProbeProps {
    onComplete: () => void;
}

export const VisualOWSProbe: React.FC<VisualOWSProbeProps> = ({ onComplete }) => {
    const [wiresConnected, setWiresConnected] = useState<string[]>([]);
    const [phase, setPhase] = useState<'unscrew' | 'remove' | 'replace' | 'wire'>('unscrew');
    const [bolts, setBolts] = useState([true, true, true, true, true, true]); // 6 bolts
    const [canRemove, setCanRemove] = useState(false);

    const wires = [
        { id: 'brown', color: 'bg-amber-700', label: '+24V' },
        { id: 'blue', color: 'bg-blue-600', label: '0V' },
        { id: 'black', color: 'bg-slate-900', label: 'Signal' }
    ];

    const handleBoltClick = (index: number) => {
        if (phase !== 'unscrew') return;
        const newBolts = [...bolts];
        newBolts[index] = false;
        setBolts(newBolts);
        
        if (newBolts.every(b => !b)) {
            setTimeout(() => {
                setPhase('remove');
                // Add a small delay before enabling removal to prevent accidental clicks
                setTimeout(() => setCanRemove(true), 500);
            }, 500);
        }
    };

    const handleRemove = () => {
        if (!canRemove) return;
        setPhase('replace');
    };

    const handleReplace = () => {
        setPhase('wire');
    };

    const connectWire = (id: string) => {
        if (phase !== 'wire') return;
        if (!wiresConnected.includes(id)) {
            const newWires = [...wiresConnected, id];
            setWiresConnected(newWires);
            if (newWires.length === 3) {
                setTimeout(onComplete, 1000);
            }
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-scada-900/50 rounded-xl border border-slate-200 dark:border-scada-700">
            <div className="relative w-64 h-96 bg-slate-100 dark:bg-slate-800/50 rounded-lg border-2 border-slate-300 dark:border-slate-600 p-4 overflow-hidden">
                {/* Tank Outline */}
                <div className="absolute inset-x-8 bottom-0 top-24 border-2 border-slate-400 dark:border-slate-500 border-t-0 rounded-b-lg opacity-50"></div>
                
                {/* Probe Assembly */}
                <div className={`absolute left-1/2 -translate-x-1/2 w-32 flex flex-col items-center z-10 transition-all duration-1000 
                    ${phase === 'replace' ? '-translate-y-full opacity-0' : 
                      'top-12'}
                    ${phase === 'remove' && canRemove ? 'cursor-pointer hover:scale-105' : ''}`}
                     style={{ 
                         transform: phase === 'replace' ? 'translate(-50%, -200%)' : 
                                    'translate(-50%, 0)'
                     }}
                     onClick={phase === 'remove' ? handleRemove : undefined}
                >
                    {/* Top Cap / Connector */}
                    <div className="w-16 h-12 bg-slate-700 rounded-t-lg relative flex justify-center items-center shadow-md">
                        <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center">
                           <div className="flex gap-2">
                                <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></div>
                                <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse delay-75"></div>
                           </div>
                        </div>
                    </div>
                    
                    {/* Flange */}
                    <div className="w-32 h-4 bg-slate-300 rounded-full border border-slate-400 shadow-sm flex justify-around items-center px-4 relative z-20">
                        {bolts.map((isActive, i) => (
                            <div 
                                key={i} 
                                onClick={(e) => { e.stopPropagation(); handleBoltClick(i); }}
                                className={`w-2 h-2 rounded-full transition-all duration-300 ${isActive ? 'bg-slate-700 cursor-pointer hover:bg-slate-900 hover:scale-150 animate-pulse ring-2 ring-slate-400 ring-offset-1' : 'bg-transparent border border-slate-400'}`}
                                title={isActive ? "Unscrew Bolt" : "Removed"}
                            ></div>
                        ))}
                    </div>

                    {/* Probes */}
                    <div className="flex justify-center gap-6 mt-0 relative z-0">
                        <div className="w-3 h-64 bg-slate-200 dark:bg-slate-400 rounded-b-full shadow-inner border-x border-slate-300">
                             <div className="absolute bottom-0 w-4 h-8 bg-slate-800 rounded-sm -translate-x-0.5"></div>
                        </div>
                        <div className="w-3 h-64 bg-slate-200 dark:bg-slate-400 rounded-b-full shadow-inner border-x border-slate-300">
                            <div className="absolute bottom-0 w-4 h-8 bg-slate-800 rounded-sm -translate-x-0.5"></div>
                        </div>
                    </div>
                </div>

                {/* New Probe Animation for Replace Phase */}
                <div className={`absolute left-1/2 -translate-x-1/2 w-32 flex flex-col items-center z-10 transition-all duration-1000 
                    ${phase === 'replace' ? 'top-12 opacity-100' : 'top-12 opacity-0 pointer-events-none'}`}
                     style={{ 
                         transform: phase === 'replace' ? 'translate(-50%, 0)' : 'translate(-50%, -200%)'
                     }}
                     onClick={phase === 'replace' ? handleReplace : undefined}
                >
                     {/* Top Cap / Connector */}
                     <div className="w-16 h-12 bg-emerald-700 rounded-t-lg relative flex justify-center items-center shadow-md cursor-pointer animate-pulse">
                        <div className="w-10 h-10 rounded-full bg-emerald-800 border-2 border-emerald-600 flex items-center justify-center">
                           <div className="flex gap-2">
                                <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                                <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                           </div>
                        </div>
                        {/* Wires coming out top - Added to new probe */}
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex gap-4">
                            {wires.map(wire => (
                                <div 
                                    key={wire.id}
                                    className={`w-1 h-16 ${wire.color} transition-all duration-500 ${phase === 'wire' && wiresConnected.includes(wire.id) ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}
                                ></div>
                            ))}
                        </div>
                    </div>
                    {/* Flange */}
                    <div className="w-32 h-4 bg-emerald-300 rounded-full border border-emerald-400 shadow-sm flex justify-around items-center px-4 relative z-20">
                         {[1,2,3,4,5,6].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-600"></div>)}
                    </div>
                    {/* Probes */}
                    <div className="flex justify-center gap-6 mt-0 relative z-0">
                        <div className="w-3 h-64 bg-emerald-100 dark:bg-emerald-800/50 rounded-b-full shadow-inner border-x border-emerald-200">
                             <div className="absolute bottom-0 w-4 h-8 bg-emerald-800 rounded-sm -translate-x-0.5"></div>
                        </div>
                        <div className="w-3 h-64 bg-emerald-100 dark:bg-emerald-800/50 rounded-b-full shadow-inner border-x border-emerald-200">
                            <div className="absolute bottom-0 w-4 h-8 bg-emerald-800 rounded-sm -translate-x-0.5"></div>
                        </div>
                    </div>
                </div>

                {/* Water Level Animation */}
                <div className="absolute inset-x-8 bottom-0 h-32 bg-blue-500/20 animate-pulse rounded-b-lg"></div>
                
                {/* Instructions Overlay */}
                <div className="absolute top-4 inset-x-4 text-center pointer-events-none">
                    {phase === 'unscrew' && <Badge variant="warning">Click bolts to unscrew</Badge>}
                    {phase === 'remove' && <Badge variant="warning">Click probe to remove</Badge>}
                    {phase === 'replace' && <Badge variant="warning">Click new probe to install</Badge>}
                    {phase === 'wire' && <Badge variant="neutral">Connect wires</Badge>}
                </div>
            </div>

            {phase === 'wire' ? (
                <div className="mt-8 grid grid-cols-3 gap-4 w-full max-w-xs animate-in fade-in slide-in-from-bottom-4">
                    {wires.map(wire => (
                        <button
                            key={wire.id}
                            onClick={() => connectWire(wire.id)}
                            disabled={wiresConnected.includes(wire.id)}
                            className={`p-3 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${
                                wiresConnected.includes(wire.id)
                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 opacity-50'
                                    : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-scada-accent text-slate-600'
                            }`}
                        >
                            <div className={`w-4 h-4 rounded-full ${wire.color}`}></div>
                            <span className="text-xs font-bold">{wire.label}</span>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="mt-8 h-20 flex items-center justify-center text-slate-400 text-sm italic">
                    {phase === 'unscrew' && <div className="flex flex-col items-center gap-2"><Wrench className="animate-bounce" /> Unscrew all 6 bolts</div>}
                    {phase === 'remove' && <div className="flex flex-col items-center gap-2"><ArrowUp className="animate-bounce" /> Lift old sensor out</div>}
                    {phase === 'replace' && <div className="flex flex-col items-center gap-2"><ArrowDown className="animate-bounce" /> Insert new sensor</div>}
                </div>
            )}
            
            <div className="mt-4 text-center">
                {phase === 'wire' && (
                    <Badge variant={wiresConnected.length === 3 ? 'success' : 'neutral'}>
                        {wiresConnected.length}/3 Wires Connected
                    </Badge>
                )}
            </div>
        </div>
    );
};
