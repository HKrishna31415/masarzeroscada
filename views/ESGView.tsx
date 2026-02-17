
import React, { useMemo, useState } from 'react';
import { Card } from '../components/ui';
import { Zap, TreePine, Car, ArrowRight, Leaf, Droplet, DollarSign, Calculator, Target, TrendingUp, Table, FileText, Download } from 'lucide-react';
import { VRU } from '../types';
import { generateFleet } from '../mockData';
import { t } from '../utils/i18n';
import { exportToCSV } from '../utils/csvExport';
import { ENV_METRICS } from '../utils/constants';

interface ESGViewProps {
    fleet?: VRU[];
    lang: 'en' | 'ar' | 'zh' | 'ko';
}

export const ESGView: React.FC<ESGViewProps> = ({ fleet, lang }) => {
    // If fleet not passed, use generated default
    const activeFleet = fleet || generateFleet();
    const [showMonetization, setShowMonetization] = useState(false);
    const [isRegulatoryMode, setIsRegulatoryMode] = useState(false);
    const [carbonPrice, setCarbonPrice] = useState(25); // Default $25/ton

    // Calculate Real Totals - Directly from activeFleet props which are synced in App.tsx
    const totalRecoveredVol = useMemo(() => {
        return activeFleet.filter(f => f.status !== 'Pending_Install').reduce((acc, curr) => acc + curr.totalRecoveredAmount, 0);
    }, [activeFleet]);

    // Constants from Central Config
    const { CO2_KG_PER_LITER, TREE_ABSORPTION_KG_YEAR, CAR_EMISSION_KG_YEAR } = ENV_METRICS;
    
    // Derived Metrics
    const totalCO2Kg = totalRecoveredVol * CO2_KG_PER_LITER;
    const tonsSaved = totalCO2Kg / 1000;
    const treeEquivalent = Math.floor(totalCO2Kg / TREE_ABSORPTION_KG_YEAR);
    const carsRemoved = Math.floor(totalCO2Kg / CAR_EMISSION_KG_YEAR);
    
    // Monetization Calc
    const potentialRevenue = tonsSaved * carbonPrice;

    // Visualization scales
    const treeScale = 1000; // 1 icon = 1000 trees
    const carScale = 10;    // 1 icon = 10 cars
    
    // Cap icons to avoid DOM overload if numbers get huge
    const treeIconsCount = Math.min(50, Math.ceil(treeEquivalent / treeScale));
    const carIconsCount = Math.min(50, Math.ceil(carsRemoved / carScale));

    const handleExportRegulatory = () => {
        const data = activeFleet.filter(f => f.status !== 'Pending_Install').map(f => ({
            "Unit ID": f.id,
            "Location": f.city,
            "Total Recovery (L)": f.totalRecoveredAmount,
            "CO2 Factor (kg/L)": CO2_KG_PER_LITER,
            "Total CO2 Avoided (kg)": (f.totalRecoveredAmount * CO2_KG_PER_LITER).toFixed(2),
            "Status": f.status
        }));
        exportToCSV(data, 'MasarZero_Regulatory_ESG_Report');
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto pb-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('envImpact', lang)}</h1>
                
                <div className="flex items-center gap-4">
                    {/* Toggle for Regulatory Mode */}
                    <button 
                        onClick={() => setIsRegulatoryMode(!isRegulatoryMode)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                            isRegulatoryMode 
                            ? 'bg-slate-800 text-white border-slate-700 shadow-md' 
                            : 'bg-white dark:bg-scada-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-scada-700 hover:bg-slate-50'
                        }`}
                    >
                        {isRegulatoryMode ? <Zap size={14} /> : <Table size={14} />}
                        {isRegulatoryMode ? 'Switch to Visual Mode' : 'Regulatory Report Mode'}
                    </button>

                    {/* Toggle for Monetization (Only in Visual Mode) */}
                    {!isRegulatoryMode && (
                        <div className="flex items-center gap-3 bg-white dark:bg-scada-800 p-2 rounded-lg border border-slate-200 dark:border-scada-700 shadow-sm">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{t('carbonSim', lang).split(' ')[0]}</span>
                            <button 
                                onClick={() => setShowMonetization(!showMonetization)}
                                className={`relative w-10 h-5 rounded-full transition-colors ${showMonetization ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                            >
                                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${showMonetization ? 'translate-x-5' : ''}`}></div>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Regulatory Table Mode */}
            {isRegulatoryMode ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card title="Government Compliance Report: GHG Emissions Avoided" action={
                        <button onClick={handleExportRegulatory} className="flex items-center gap-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded transition-colors shadow-sm">
                            <Download size={14}/> Export CSV
                        </button>
                    }>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-100 dark:bg-scada-900 text-slate-600 dark:text-slate-400 uppercase text-xs font-bold">
                                    <tr>
                                        <th className="px-4 py-3">Asset ID</th>
                                        <th className="px-4 py-3">Location</th>
                                        <th className="px-4 py-3 text-right">Recovery Vol (L)</th>
                                        <th className="px-4 py-3 text-right">Conv. Factor</th>
                                        <th className="px-4 py-3 text-right">CO2 Avoided (kg)</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-scada-700 font-mono">
                                    {activeFleet.filter(f => f.status !== 'Pending_Install').map((unit, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-scada-700/50">
                                            <td className="px-4 py-2 font-bold text-slate-800 dark:text-white">{unit.id}</td>
                                            <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{unit.city}</td>
                                            <td className="px-4 py-2 text-right">{unit.totalRecoveredAmount.toLocaleString()}</td>
                                            <td className="px-4 py-2 text-right text-slate-500">{CO2_KG_PER_LITER}</td>
                                            <td className="px-4 py-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                                {(unit.totalRecoveredAmount * CO2_KG_PER_LITER).toLocaleString(undefined, {maximumFractionDigits: 1})}
                                            </td>
                                            <td className="px-4 py-2 text-center">
                                                <span className={`inline-block w-2 h-2 rounded-full ${unit.status === 'Running' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="bg-slate-50 dark:bg-scada-900/50 font-bold border-t-2 border-slate-200 dark:border-scada-600">
                                        <td colSpan={2} className="px-4 py-3 text-right text-slate-800 dark:text-white uppercase tracking-wider">Total Aggregated</td>
                                        <td className="px-4 py-3 text-right">{totalRecoveredVol.toLocaleString()}</td>
                                        <td></td>
                                        <td className="px-4 py-3 text-right text-emerald-700 dark:text-emerald-400">{totalCO2Kg.toLocaleString(undefined, {maximumFractionDigits: 1})}</td>
                                        <td></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </Card>
                    <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-500/20 rounded-lg text-xs text-yellow-800 dark:text-yellow-200 flex items-start gap-2">
                        <FileText size={16} className="shrink-0 mt-0.5" />
                        <div>
                            <strong>Regulatory Note:</strong> This report uses the standard combustion emission factor of {CO2_KG_PER_LITER} kg CO2 per liter of gasoline vapor recovered. Data is aggregated from calibrated flow meters at each site. This document is suitable for ISO 14064 reporting preliminaries.
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {/* Monetization Simulator Panel (Conditional) */}
                    {showMonetization && (
                        <div className="bg-emerald-50 dark:bg-gradient-to-r dark:from-emerald-900/50 dark:to-teal-900/50 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-6 animate-in slide-in-from-top-4 shadow-sm">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-100 flex items-center gap-2">
                                        <Calculator size={20} /> {t('carbonSim', lang)}
                                    </h3>
                                    <p className="text-sm text-emerald-700 dark:text-emerald-200/70 mt-1">Estimate potential revenue from trading generated carbon credits.</p>
                                </div>
                                
                                <div className="flex items-center gap-4 bg-white dark:bg-black/20 p-4 rounded-xl border border-emerald-100 dark:border-transparent shadow-sm dark:shadow-none">
                                    <div>
                                        <label className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1">{t('carbonPrice', lang)}</label>
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="range" 
                                                min="1" 
                                                max="100" 
                                                value={carbonPrice} 
                                                onChange={(e) => setCarbonPrice(Number(e.target.value))}
                                                className="w-32 h-2 bg-emerald-200 dark:bg-emerald-900 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                            />
                                            <div className="bg-emerald-500 text-white font-bold px-3 py-1 rounded text-sm w-16 text-center">
                                                ${carbonPrice}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-px h-10 bg-emerald-200 dark:bg-white/10 mx-2"></div>
                                    <div className="text-right">
                                        <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">{t('estRevenue', lang)}</div>
                                        <div className="text-2xl font-black text-emerald-900 dark:text-white">${Math.floor(potentialRevenue).toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Impact Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-auto">
                        
                        {/* Large Green Card with Water Animation */}
                        <div className="relative bg-[#059669] rounded-3xl p-8 md:p-12 flex flex-col justify-center overflow-hidden shadow-lg group min-h-[400px]">
                            
                            {/* Liquid Wave Animation Background */}
                            <div className="absolute inset-0 z-0 opacity-50">
                                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                    <defs>
                                        <linearGradient id="waterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                            <stop offset="0%" stopColor="#34d399" stopOpacity="0.6" />
                                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.9" />
                                        </linearGradient>
                                    </defs>
                                    {/* Back Wave */}
                                    <path d="M0 50 Q 25 40 50 50 T 100 50 V 100 H 0 Z" fill="url(#waterGrad)" opacity="0.5">
                                        <animate attributeName="d" 
                                                values="M0 50 Q 25 45 50 50 T 100 50 V 100 H 0 Z; 
                                                        M0 50 Q 25 55 50 50 T 100 50 V 100 H 0 Z; 
                                                        M0 50 Q 25 45 50 50 T 100 50 V 100 H 0 Z" 
                                                dur="5s" repeatCount="indefinite" />
                                    </path>
                                    {/* Front Wave */}
                                    <path d="M0 55 Q 25 65 50 55 T 100 55 V 100 H 0 Z" fill="url(#waterGrad)">
                                        <animate attributeName="d" 
                                                values="M0 55 Q 25 65 50 55 T 100 55 V 100 H 0 Z; 
                                                        M0 55 Q 25 45 50 55 T 100 55 V 100 H 0 Z; 
                                                        M0 55 Q 25 65 50 55 T 100 55 V 100 H 0 Z" 
                                                dur="4s" repeatCount="indefinite" />
                                    </path>
                                    {/* Rising Level Animation */}
                                    <animateTransform attributeName="transform" type="translate" from="0 100" to="0 0" dur="1.5s" fill="freeze" calcMode="spline" keySplines="0.42 0 0.58 1" />
                                </svg>
                            </div>

                            <div className="relative z-10 space-y-4">
                                <div className="flex items-center gap-2 text-emerald-100 font-bold tracking-wider text-sm uppercase">
                                    <Droplet className="fill-current" size={16} /> {t('emissionsPrevented', lang)}
                                </div>
                                
                                <div className="flex items-baseline gap-3 flex-wrap">
                                    <span className="text-7xl md:text-8xl font-black text-white tracking-tighter drop-shadow-sm">{Math.floor(tonsSaved).toLocaleString()}</span>
                                    <span className="text-2xl md:text-3xl font-medium text-emerald-50 drop-shadow-sm">{t('tonsCo2', lang)}</span>
                                </div>

                                <div className="mt-8 pt-8 border-l-4 border-emerald-400/50 pl-6 max-w-md backdrop-blur-sm rounded-r-xl">
                                    <p className="text-xl text-white font-medium leading-relaxed drop-shadow-md">
                                        Based on recovering {totalRecoveredVol.toLocaleString()} Liters of gasoline vapor (combustion equivalent ~{CO2_KG_PER_LITER} kg CO2/L).
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Right Column Stack */}
                        <div className="flex flex-col gap-6">
                            
                            {/* Tree Card */}
                            <div className="flex-1 bg-white dark:bg-scada-800 rounded-3xl p-8 border border-slate-200 dark:border-scada-700 hover:border-emerald-400 dark:hover:border-scada-600 transition-colors flex flex-col justify-between shadow-sm relative overflow-hidden group">
                                <div className="flex justify-between items-start z-10">
                                    <div>
                                        <div className="text-4xl font-bold text-slate-900 dark:text-white mb-1">{treeEquivalent.toLocaleString()}</div>
                                        <div className="text-lg font-bold text-slate-600 dark:text-slate-300">{t('treeEquiv', lang)}</div>
                                        <div className="text-xs text-slate-500 mt-1">1 Icon = {treeScale.toLocaleString()} Trees</div>
                                    </div>
                                    <div className="w-12 h-12 bg-emerald-100 dark:bg-[#1e3a2f] rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                        <TreePine size={24} />
                                    </div>
                                </div>
                                
                                {/* Vector Grid */}
                                <div className="flex flex-wrap content-end gap-2 mt-6 relative z-10">
                                    {Array.from({ length: treeIconsCount }).map((_, i) => (
                                        <div 
                                            key={i} 
                                            className="animate-in zoom-in slide-in-from-bottom-2 duration-500 fill-mode-backwards" 
                                            style={{ animationDelay: `${i * 50}ms` }}
                                        >
                                            <TreePine 
                                                size={28} 
                                                className="text-emerald-500 fill-emerald-100 dark:fill-emerald-500/20 drop-shadow-sm" 
                                                strokeWidth={2.5}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Car Card */}
                            <div className="flex-1 bg-white dark:bg-scada-800 rounded-3xl p-8 border border-slate-200 dark:border-scada-700 hover:border-blue-400 dark:hover:border-scada-600 transition-colors flex flex-col justify-between shadow-sm relative overflow-hidden">
                                <div className="flex justify-between items-start z-10">
                                    <div>
                                        <div className="text-4xl font-bold text-slate-900 dark:text-white mb-1">{carsRemoved.toLocaleString()}</div>
                                        <div className="text-lg font-bold text-slate-600 dark:text-slate-300">{t('carsRemoved', lang)}</div>
                                        <div className="text-xs text-slate-500 mt-1">1 Icon = {carScale} Cars (Annual Avg)</div>
                                    </div>
                                    <div className="w-12 h-12 bg-blue-100 dark:bg-[#1e293b] rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                                        <Car size={24} />
                                    </div>
                                </div>

                                {/* Vector Grid */}
                                <div className="flex flex-wrap content-end gap-2 mt-6 relative z-10">
                                    {Array.from({ length: carIconsCount }).map((_, i) => (
                                        <div 
                                            key={i} 
                                            className="animate-in slide-in-from-right duration-500 fill-mode-backwards" 
                                            style={{ animationDelay: `${i * 50}ms` }}
                                        >
                                            <Car 
                                                size={28} 
                                                className="text-blue-500 fill-blue-100 dark:fill-blue-500/20 drop-shadow-sm" 
                                                strokeWidth={2.5}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Promo Banner */}
                    <div className="relative w-full rounded-3xl overflow-hidden min-h-[300px] flex items-center bg-gradient-to-br from-[#14b8a6] to-[#0f766e] shadow-2xl">
                        {/* Text Content */}
                        <div className="relative z-20 p-10 md:p-16 w-full md:w-2/3 lg:w-1/2">
                            <h2 className="text-4xl md:text-5xl font-black text-white leading-tight mb-6 drop-shadow-md">
                                MasarZero:<br/> {t('esgPromo', lang)}
                            </h2>
                            
                            <div className="flex gap-4 items-start">
                                <div className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center flex-shrink-0 mt-1 bg-white/10 backdrop-blur-sm">
                                    <Leaf size={14} className="text-white" />
                                </div>
                                <div className="text-teal-50 text-sm md:text-base leading-relaxed space-y-4 font-medium max-w-md">
                                    <p>
                                        {t('esgDesc', lang)}
                                    </p>
                                </div>
                                {/* Brackets Decoration */}
                                <div className="hidden md:block absolute top-1/2 right-0 w-32 h-32 border-r border-t border-white/20 rounded-tr-3xl"></div>
                            </div>
                        </div>

                        {/* Vector Illustration Overlay */}
                        <div className="absolute right-0 bottom-0 top-0 w-full md:w-1/2 z-10 flex items-end justify-end pointer-events-none">
                            <svg viewBox="0 0 400 300" className="w-full h-full preserve-3d">
                                <defs>
                                    <linearGradient id="soilGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#8B4513" />
                                        <stop offset="100%" stopColor="#5D2906" />
                                    </linearGradient>
                                    <linearGradient id="leafGradient" x1="0" y1="0" x2="1" y2="1">
                                        <stop offset="0%" stopColor="#4ade80" />
                                        <stop offset="100%" stopColor="#16a34a" />
                                    </linearGradient>
                                </defs>
                                
                                {/* Soil Mound */}
                                <path d="M 250 300 C 250 300, 300 220, 400 240 L 400 300 Z" fill="url(#soilGradient)" opacity="0.9" />
                                <path d="M 0 300 L 400 300 L 400 280 C 300 280, 200 200, 50 250 Z" fill="url(#soilGradient)" />

                                {/* Animated Sapling */}
                                <g transform="translate(150, 260) scale(1.5)">
                                    {/* Stem */}
                                    <path d="M 10 0 Q 15 -40 10 -80" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round">
                                        <animate attributeName="d" values="M 10 0 Q 15 -40 10 -80; M 10 0 Q 5 -40 10 -80; M 10 0 Q 15 -40 10 -80" dur="4s" repeatCount="indefinite" />
                                    </path>
                                    
                                    {/* Left Leaf */}
                                    <path d="M 10 -40 Q -10 -50 0 -70 Q 10 -60 10 -40" fill="url(#leafGradient)" opacity="0.9">
                                        <animateTransform attributeName="transform" type="rotate" values="-5 10 -40; 5 10 -40; -5 10 -40" dur="5s" repeatCount="indefinite" />
                                    </path>

                                    {/* Right Leaf (Higher) */}
                                    <path d="M 10 -60 Q 30 -70 20 -90 Q 10 -80 10 -60" fill="url(#leafGradient)">
                                        <animateTransform attributeName="transform" type="rotate" values="5 10 -60; -10 10 -60; 5 10 -60" dur="6s" repeatCount="indefinite" />
                                    </path>

                                    {/* Top Sprout */}
                                    <path d="M 10 -80 Q 5 -95 10 -100 Q 15 -95 10 -80" fill="#86efac" />
                                </g>

                                {/* Floating Particles/Spores */}
                                <circle cx="200" cy="200" r="2" fill="white" opacity="0.5">
                                    <animate attributeName="cy" from="200" to="150" dur="3s" repeatCount="indefinite" />
                                    <animate attributeName="opacity" values="0.5;0" dur="3s" repeatCount="indefinite" />
                                </circle>
                                <circle cx="220" cy="220" r="1.5" fill="white" opacity="0.4">
                                    <animate attributeName="cy" from="220" to="170" dur="4s" repeatCount="indefinite" />
                                    <animate attributeName="opacity" values="0.4;0" dur="4s" repeatCount="indefinite" />
                                </circle>
                            </svg>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
