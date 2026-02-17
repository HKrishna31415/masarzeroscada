import React, { useState, useEffect } from 'react';
import { VRU } from '../types';
import { MapsView } from '../views/MapsView';
import { FleetStatusTable } from './FleetStatusTable';
import { ActivityFeed } from './ActivityFeed';
import { BarChart3, TrendingUp, AlertTriangle, Monitor, X, Clock, MapPin, Globe } from 'lucide-react';
import { t } from '../utils/i18n';

interface KioskModeProps {
    fleet: VRU[];
    onExit: () => void;
    lang: 'en' | 'ar' | 'zh' | 'ko';
}

const KIOSK_SLIDE_DURATION = 15000; // 15 seconds per slide

export const KioskMode: React.FC<KioskModeProps> = ({ fleet, onExit, lang }) => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [progress, setProgress] = useState(0);

    const slides = ['Overview', 'Map', 'Alerts'];

    // Clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Rotation Logic
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % slides.length);
            setProgress(0);
        }, KIOSK_SLIDE_DURATION);

        const progressInterval = setInterval(() => {
            setProgress(prev => Math.min(100, prev + (100 / (KIOSK_SLIDE_DURATION / 100))));
        }, 100);

        return () => {
            clearInterval(interval);
            clearInterval(progressInterval);
        };
    }, [slides.length]);

    // Derived Metrics for Overview
    const activeUnits = fleet.filter(f => f.status === 'Running').length;
    const totalUnits = fleet.filter(f => f.status !== 'Pending_Install').length;
    const totalVolume = fleet.reduce((acc, curr) => acc + curr.totalRecoveredAmount, 0);
    const criticalAlerts = fleet.flatMap(f => f.alerts).filter(a => a.severity === 'Critical' && !a.acknowledged);

    return (
        <div className="fixed inset-0 z-[9999] bg-[#050b14] text-white flex flex-col overflow-hidden font-sans">
            {/* Top Bar */}
            <div className="h-16 bg-[#0f172a]/80 backdrop-blur-md border-b border-white/10 flex justify-between items-center px-8 shrink-0">
                <div className="flex items-center gap-4">
                    <Monitor className="text-emerald-500 animate-pulse" size={24} />
                    <div>
                        <h1 className="text-xl font-black tracking-widest uppercase">MasarZero Command</h1>
                        <div className="text-[10px] text-slate-400 font-mono tracking-widest">LIVE MONITORING // KIOSK MODE</div>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <div className="text-2xl font-bold font-mono leading-none">{currentTime.toLocaleTimeString()}</div>
                        <div className="text-xs text-slate-500 font-bold uppercase">{currentTime.toLocaleDateString()}</div>
                    </div>
                    <button onClick={onExit} className="p-2 hover:bg-white/10 rounded-full transition-colors opacity-50 hover:opacity-100">
                        <X size={24} />
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 relative overflow-hidden">
                
                {/* Slide 0: Executive Overview */}
                {currentSlide === 0 && (
                    <div className="absolute inset-0 p-8 grid grid-cols-3 gap-8 animate-in fade-in duration-700">
                        {/* KPI Column */}
                        <div className="col-span-1 flex flex-col gap-6">
                            <div className="bg-[#1e293b]/50 border border-white/10 rounded-3xl p-8 flex-1 flex flex-col justify-center relative overflow-hidden">
                                <div className="absolute -right-10 -top-10 text-emerald-500/10"><BarChart3 size={200} /></div>
                                <div className="text-sm text-slate-400 uppercase font-bold tracking-widest mb-2">Total Recovered Volume</div>
                                <div className="text-6xl font-black text-white tracking-tighter mb-2">{totalVolume.toLocaleString()} <span className="text-2xl text-emerald-500">L</span></div>
                                <div className="inline-flex items-center gap-2 text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1 rounded-lg self-start">
                                    <TrendingUp size={16} /> +4.2% vs Last Week
                                </div>
                            </div>
                            <div className="bg-[#1e293b]/50 border border-white/10 rounded-3xl p-8 flex-1 flex flex-col justify-center">
                                <div className="text-sm text-slate-400 uppercase font-bold tracking-widest mb-2">Active Fleet Status</div>
                                <div className="text-6xl font-black text-white tracking-tighter mb-2">{activeUnits}<span className="text-2xl text-slate-500">/{totalUnits}</span></div>
                                <div className="w-full bg-slate-800 h-4 rounded-full overflow-hidden">
                                    <div className="bg-blue-500 h-full transition-all duration-1000" style={{ width: `${(activeUnits/totalUnits)*100}%` }}></div>
                                </div>
                            </div>
                        </div>

                        {/* Leaderboard Column */}
                        <div className="col-span-1 bg-[#1e293b]/30 border border-white/10 rounded-3xl p-6 overflow-hidden flex flex-col">
                            <h3 className="text-lg font-bold text-slate-300 uppercase tracking-widest mb-4 border-b border-white/5 pb-2">Top Performing Units</h3>
                            <div className="flex-1 overflow-hidden">
                                <FleetStatusTable fleet={fleet} onSelect={() => {}} />
                            </div>
                        </div>

                        {/* Live Feed Column */}
                        <div className="col-span-1 flex flex-col gap-6">
                            <div className="flex-1 bg-[#1e293b]/30 border border-white/10 rounded-3xl p-6 overflow-hidden">
                                <h3 className="text-lg font-bold text-slate-300 uppercase tracking-widest mb-4 border-b border-white/5 pb-2">Live Activity Stream</h3>
                                <ActivityFeed />
                            </div>
                            {criticalAlerts.length > 0 && (
                                <div className="bg-rose-900/20 border border-rose-500/50 rounded-3xl p-6 animate-pulse">
                                    <div className="flex items-center gap-3 text-rose-500 mb-2">
                                        <AlertTriangle size={32} />
                                        <h3 className="text-2xl font-black uppercase">Critical Attention</h3>
                                    </div>
                                    <div className="text-xl font-bold text-white">{criticalAlerts.length} Active Critical Alerts</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Slide 1: Global Map */}
                {currentSlide === 1 && (
                    <div className="absolute inset-0 animate-in fade-in zoom-in duration-700">
                        <MapsView fleet={fleet} onSelectMachine={() => {}} theme="dark" showPendingUnits={false} lang={lang} />
                        
                        {/* Overlay Stat */}
                        <div className="absolute bottom-8 left-8 bg-black/80 backdrop-blur border border-white/20 p-6 rounded-2xl z-[2000]">
                            <div className="flex items-center gap-3 text-white mb-1">
                                <Globe size={24} className="text-blue-500" />
                                <span className="text-xl font-bold uppercase">Network Status</span>
                            </div>
                            <div className="text-4xl font-mono text-emerald-400">ONLINE</div>
                        </div>
                    </div>
                )}

                {/* Slide 2: Critical Alerts Focus */}
                {currentSlide === 2 && (
                    <div className="absolute inset-0 p-12 flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom duration-700">
                        {criticalAlerts.length > 0 ? (
                            <div className="w-full max-w-5xl space-y-6">
                                <div className="text-center mb-12">
                                    <AlertTriangle size={120} className="text-rose-500 mx-auto mb-6 animate-bounce" />
                                    <h2 className="text-6xl font-black text-white uppercase tracking-tight">System Alert State</h2>
                                    <p className="text-2xl text-rose-400 mt-4 font-mono">ACTION REQUIRED IMMEDIATELY</p>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    {criticalAlerts.slice(0, 4).map((alert, idx) => (
                                        <div key={idx} className="bg-rose-950/50 border-l-8 border-rose-500 p-6 rounded-r-xl flex items-center justify-between">
                                            <div>
                                                <div className="text-2xl font-bold text-white mb-2">{alert.message}</div>
                                                <div className="flex items-center gap-4 text-rose-300 font-mono">
                                                    <span className="flex items-center gap-2"><MapPin size={16}/> {alert.machineName}</span>
                                                    <span className="flex items-center gap-2"><Clock size={16}/> {new Date(alert.timestamp).toLocaleTimeString()}</span>
                                                </div>
                                            </div>
                                            <div className="px-6 py-2 bg-rose-500 text-white font-bold rounded uppercase tracking-wider animate-pulse">
                                                CRITICAL
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center">
                                <div className="w-64 h-64 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border-4 border-emerald-500/30">
                                    <Check size={120} className="text-emerald-500" />
                                </div>
                                <h2 className="text-6xl font-black text-white uppercase tracking-tight">System Nominal</h2>
                                <p className="text-2xl text-emerald-400 mt-4 font-mono">NO ACTIVE CRITICAL ALERTS</p>
                            </div>
                        )}
                    </div>
                )}

            </div>

            {/* Bottom Progress Bar */}
            <div className="h-2 bg-slate-800 w-full relative">
                <div 
                    className="h-full bg-scada-accent shadow-[0_0_10px_#0ea5e9] transition-all duration-100 ease-linear" 
                    style={{ width: `${progress}%` }}
                ></div>
                <div className="absolute -top-10 right-4 flex gap-2">
                    {slides.map((s, i) => (
                        <div 
                            key={s} 
                            className={`px-4 py-1 rounded bg-black/50 border backdrop-blur text-xs font-bold uppercase transition-colors ${i === currentSlide ? 'border-scada-accent text-scada-accent' : 'border-transparent text-slate-600'}`}
                        >
                            {s}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Helper Icon for Check
function Check({ size, className }: { size: number, className: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M20 6 9 17l-5-5" />
        </svg>
    );
}