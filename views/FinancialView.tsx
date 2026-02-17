
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, ComposedChart, Area, Line, Legend, ReferenceLine } from 'recharts';
import { Card, ProgressBar } from '../components/ui';
import { DollarSign, TrendingUp, BarChart3, Download, Info, HelpCircle, Zap, Banknote, Tag, Activity, ChevronRight, Sliders, RotateCcw, Lock, PieChart, Target, Calculator } from 'lucide-react';
import { FinancialMetric, VRU } from '../types';
import { t } from '../utils/i18n';
import { exportToCSV } from '../utils/csvExport';
import { FINANCIAL_DEFAULTS } from '../utils/constants';

interface FinancialViewProps {
    history: FinancialMetric[];
    fleet: VRU[];
    currency: string;
    onCurrencyChange: (currency: string) => void;
    clientName: string;
    lang: 'en' | 'ar' | 'zh' | 'ko';
}

// Hook for animated numbers
const useCountUp = (end: number, duration: number = 1000) => {
    const [value, setValue] = useState(0);
    useEffect(() => {
        let start = 0;
        if (end === 0) return;
        const frameDuration = 1000 / 60;
        const totalFrames = Math.round(duration / frameDuration);
        const easeOutQuad = (t: number) => t * (2 - t);
        
        let frame = 0;
        const counter = setInterval(() => {
            frame++;
            const progress = easeOutQuad(frame / totalFrames);
            setValue(start + (end - start) * progress);
            
            if (frame === totalFrames) {
                setValue(end);
                clearInterval(counter);
            }
        }, frameDuration);
        return () => clearInterval(counter);
    }, [end, duration]);
    return value;
};

// Isolated component
const AnimatedNumber = React.memo(({ value, format }: { value: number, format: (v: number) => React.ReactNode }) => {
    const current = useCountUp(value, 800);
    return <>{format(current)}</>;
});

const DebouncedSlider = ({ value, min, max, step, onChange, accentColor = 'accent-indigo-500' }: any) => {
    const [localValue, setLocalValue] = useState(value);
    useEffect(() => setLocalValue(value), [value]);
    useEffect(() => {
        const handler = setTimeout(() => { if (localValue !== value) onChange(localValue); }, 300);
        return () => clearTimeout(handler);
    }, [localValue, onChange, value]);
    return (
        <input type="range" min={min} max={max} step={step} value={localValue} onChange={(e) => setLocalValue(parseInt(e.target.value))} className={`w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer ${accentColor}`} />
    );
};

export const FinancialView: React.FC<FinancialViewProps> = ({ history, fleet, currency, onCurrencyChange, clientName, lang }) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showInfo, setShowInfo] = useState(false);
    const [selectedDateDetails, setSelectedDateDetails] = useState<string | null>(null);

    // Scenario Mode State
    const [isScenarioMode, setIsScenarioMode] = useState(false);
    const [scenarioParams, setScenarioParams] = useState({ priceMod: 0, elecMod: 0, vatMod: 0 });
    
    // Improved Palette
    const PALETTE = { gross: '#3b82f6', net: '#10b981', cost: '#ef4444', subtotal: '#64748b', scenario: '#8b5cf6' };

    // Constants from centralized config
    const BASE_VAT_RATE = FINANCIAL_DEFAULTS.VAT_RATE;
    const BASE_ELEC_RATE_SAR = FINANCIAL_DEFAULTS.ELEC_COST_PER_KW;
    const KWH_PER_L = FINANCIAL_DEFAULTS.KW_PER_LITER;
    const UNIT_CAPEX_USD = 79000; // For Sasco

    const VAT_RATE = isScenarioMode ? Math.max(0, BASE_VAT_RATE + (scenarioParams.vatMod / 100)) : BASE_VAT_RATE;
    const isSasco = clientName.toLowerCase().includes('sasco');
    
    useEffect(() => {
        if (history.length > 0) {
            setStartDate(history[0].date);
            setEndDate(history[history.length - 1].date);
        }
    }, [history]);

    const rates: Record<string, number> = { 'SAR': 1, 'USD': 0.266, 'CNY': 1.91, 'BHD': 0.1, 'KRW': 365 };

    const baseCurrency = useMemo(() => {
        if (clientName.toLowerCase().includes('bapco')) return 'BHD';
        if (clientName.toLowerCase().includes('geco')) return 'USD';
        return 'SAR'; 
    }, [clientName]);

    const convert = useCallback((val: number) => {
        let sarValue = val;
        // Normalize to SAR first
        if (baseCurrency === 'BHD') sarValue = val / 0.1;
        else if (baseCurrency === 'USD') sarValue = val / 0.266;
        
        // Then convert to target currency
        return sarValue * rates[currency];
    }, [baseCurrency, currency, rates]);

    const formatCurrency = (val: number, fractionDigits?: number) => {
        // Force 0 fraction digits for KRW unless explicitly requested otherwise (which usually shouldn't happen for KRW)
        const digits = currency === 'KRW' ? 0 : (fractionDigits !== undefined ? fractionDigits : 0);
        
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: digits,
            maximumFractionDigits: digits
        }).format(val);
    };

    // --- Data Processing ---
    const filteredHistory = useMemo(() => {
        if (!startDate || !endDate) return history;
        return history.filter(h => h.date >= startDate && h.date <= endDate);
    }, [history, startDate, endDate]);

    const ledgerData = useMemo(() => {
        return filteredHistory.map(h => {
            const priceMultiplier = isScenarioMode ? 1 + (scenarioParams.priceMod / 100) : 1;
            const elecMultiplier = isScenarioMode ? 1 + (scenarioParams.elecMod / 100) : 1;

            const actualRevenue = convert(h.revenue) * priceMultiplier;
            const netSales = actualRevenue / (1 + VAT_RATE);
            const vat = actualRevenue - netSales;
            
            // Electricity cost calc needs careful handling of rates
            // BASE_ELEC_RATE_SAR is 0.32 SAR. 
            // We need to convert 0.32 SAR to the view currency.
            const elecRateInView = (BASE_ELEC_RATE_SAR * rates[currency]) * elecMultiplier;
            
            const electricity = h.recoveredLiters * KWH_PER_L * elecRateInView;
            const profit = netSales - electricity;

            return {
                date: h.date,
                volume: h.recoveredLiters,
                grossRevenue: actualRevenue,
                vat: vat,
                netRevenue: netSales,
                electricity: electricity,
                netProfit: profit,
                originalRevenue: convert(h.revenue) 
            };
        });
    }, [filteredHistory, currency, isScenarioMode, scenarioParams, VAT_RATE, baseCurrency, convert, rates, BASE_ELEC_RATE_SAR, KWH_PER_L]);

    const aggregates = useMemo(() => {
        const totalRev = ledgerData.reduce((acc, curr) => acc + curr.grossRevenue, 0);
        const totalVat = ledgerData.reduce((acc, curr) => acc + curr.vat, 0);
        const totalElec = ledgerData.reduce((acc, curr) => acc + curr.electricity, 0);
        const totalProf = ledgerData.reduce((acc, curr) => acc + curr.netProfit, 0);
        let totalVol = ledgerData.reduce((acc, curr) => acc + curr.volume, 0);

        if (history.length > 0 && filteredHistory.length === history.length && fleet.length > 0) {
             const fleetTotal = fleet.reduce((acc, curr) => acc + curr.totalRecoveredAmount, 0);
             totalVol = fleetTotal;
        }

        const totalExp = totalVat + totalElec;

        return { totalRevenue: totalRev, totalExpenses: totalExp, totalProfit: totalProf, totalVolume: totalVol, totalVat, totalElec };
    }, [ledgerData, fleet, history.length, filteredHistory.length]);

    // Breakeven Logic (Sasco)
    const breakevenMetrics = useMemo(() => {
        if (!isSasco) return null;
        const totalUnits = fleet.filter(f => f.status !== 'Pending_Install').length;
        // Capex in viewed currency
        // Base is USD, convert to SAR (3.75), then to viewed currency
        const capexUSD = totalUnits * UNIT_CAPEX_USD;
        const capexInView = (capexUSD * 3.75) * rates[currency]; 
        
        const progress = Math.min(100, (aggregates.totalProfit / capexInView) * 100);
        return { capex: capexInView, progress };
    }, [isSasco, fleet, currency, aggregates.totalProfit, rates, UNIT_CAPEX_USD]);

    // Partner Share Logic (Others)
    const partnerShareMetrics = useMemo(() => {
        if (isSasco) return null;
        // Partner gets 20% of Revenue
        const partnerShare = aggregates.totalRevenue * 0.20;
        return { partnerShare };
    }, [isSasco, aggregates.totalRevenue]);

    const waterfallData = useMemo(() => {
        const gross = aggregates.totalRevenue;
        const vat = aggregates.totalVat;
        const netSales = gross - vat;
        const elec = aggregates.totalElec;
        const profit = netSales - elec;

        return [
            { name: 'Gross Rev', value: gross, fill: PALETTE.gross, type: 'revenue' },
            { name: 'VAT (Tax)', value: -vat, fill: '#93c5fd', type: 'expense' },
            { name: 'Net Sales', value: netSales, fill: '#3b82f6', type: 'subtotal' },
            { name: 'Electricity', value: -elec, fill: '#93c5fd', type: 'expense' },
            { name: 'Net Profit', value: profit, fill: '#06b6d4', type: 'profit' },
        ];
    }, [aggregates, isScenarioMode, PALETTE]);

    const avgPricePerLiter = useMemo(() => {
        // Strict check for standard pricing if Sasco
        if (isSasco) {
            return FINANCIAL_DEFAULTS.PRICE_PER_LITER_SAR * rates[currency]; 
        }
        
        // Calculated average for other scenarios
        const calculatedAvg = aggregates.totalVolume > 0 ? aggregates.totalRevenue / aggregates.totalVolume : 0;
        
        // Sanity Check: If the calculated average is wildly off (> 4 SAR/L), default back to standard base
        // This handles cases where totalVolume might be lagging behind historical data generation in aggregation
        if (currency === 'SAR' && calculatedAvg > 4.0) {
             return FINANCIAL_DEFAULTS.PRICE_PER_LITER_SAR * rates[currency];
        }
        
        return calculatedAvg;
    }, [isSasco, currency, aggregates, baseCurrency, rates]);

    const handleExportLedger = () => {
        if (ledgerData.length === 0) return;
        const dataToExport = ledgerData.map(d => ({
            Date: d.date,
            'Volume (L)': d.volume,
            [`Gross Revenue (${currency})`]: d.grossRevenue.toFixed(currency === 'KRW' ? 0 : 2),
            [`VAT (${currency})`]: d.vat.toFixed(currency === 'KRW' ? 0 : 2),
            [`Net Revenue (${currency})`]: d.netRevenue.toFixed(currency === 'KRW' ? 0 : 2),
            [`Electricity Cost (${currency})`]: d.electricity.toFixed(currency === 'KRW' ? 0 : 2),
            [`Net Profit (${currency})`]: d.netProfit.toFixed(currency === 'KRW' ? 0 : 2)
        }));
        exportToCSV(dataToExport, `Financial_Ledger_${startDate}_to_${endDate}${isScenarioMode ? '_Simulated' : ''}`);
    };

    const handleChartClick = (data: any) => {
        if (data && data.activePayload && data.activePayload.length > 0) {
            setSelectedDateDetails(data.activePayload[0].payload.date);
        }
    };

    const WaterfallTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const isExpense = data.value < 0;
            return (
                <div className="bg-white/95 dark:bg-scada-800/95 border border-slate-200 dark:border-scada-700 p-3 rounded-lg shadow-xl backdrop-blur-sm">
                    <p className="font-bold text-slate-800 dark:text-white mb-1 text-sm">{data.name}</p>
                    <p className={`text-lg font-mono font-black ${isExpense ? 'text-blue-400' : 'text-blue-600 dark:text-blue-400'}`}>
                        {formatCurrency(Math.abs(data.value))} {isExpense ? '(Cost)' : ''}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative pb-10">
            {/* Header & Controls - Mobile Stack */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-200 dark:border-scada-700 pb-6 transition-colors">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {t('financialDash', lang)}
                        <button onClick={() => setShowInfo(true)} className="text-slate-400 hover:text-scada-accent transition-colors">
                            <HelpCircle size={18} />
                        </button>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('financialSub', lang)}</p>
                </div>
                {/* Responsive Controls Container */}
                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 bg-white dark:bg-scada-800 p-2 rounded-lg border border-slate-200 dark:border-scada-700 shadow-sm transition-colors w-full lg:w-auto">
                    {/* Scenario Mode Toggle */}
                    <button
                        onClick={() => {
                            setIsScenarioMode(!isScenarioMode);
                            if (!isScenarioMode) setScenarioParams({ priceMod: 0, elecMod: 0, vatMod: 0 });
                        }}
                        className={`flex justify-center items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-all ${isScenarioMode ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 dark:bg-scada-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}
                    >
                        <Sliders size={14} /> Scenario Planner
                    </button>

                    <div className="hidden sm:block h-6 w-px bg-slate-200 dark:bg-scada-700"></div>

                    {/* Currency Selector */}
                    {/* Note: This is duplicative if header has it, but view specific control is handy */}
                    <div className="relative">
                        <select 
                            value={currency} 
                            onChange={(e) => onCurrencyChange(e.target.value)}
                            className="w-full sm:w-auto bg-slate-50 dark:bg-scada-900 border border-slate-200 dark:border-scada-600 hover:border-scada-accent text-slate-700 dark:text-white text-xs px-3 py-2 rounded outline-none appearance-none cursor-pointer"
                        >
                            <option value="SAR">SAR</option>
                            <option value="USD">USD</option>
                            <option value="CNY">CNY</option>
                            <option value="BHD">BHD</option>
                            <option value="KRW">KRW</option>
                        </select>
                        <ChevronRight size={14} className={`text-slate-500 absolute top-2.5 pointer-events-none transform rotate-90 ${lang === 'ar' ? 'left-3' : 'right-3'}`} />
                    </div>

                    {/* Date Range */}
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-scada-900 border border-slate-200 dark:border-scada-600 rounded px-2 py-1.5 w-full sm:w-auto">
                         <input 
                            type="date" 
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-transparent text-xs text-slate-700 dark:text-white outline-none flex-1 sm:w-24" 
                         />
                         <span className="text-slate-400">-</span>
                         <input 
                            type="date" 
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-transparent text-xs text-slate-700 dark:text-white outline-none flex-1 sm:w-24" 
                         />
                    </div>
                </div>
            </div>

            {/* Scenario Control Panel (Conditional) */}
            {isScenarioMode && (
                <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl p-4 animate-in slide-in-from-top-2">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-indigo-800 dark:text-indigo-300 flex items-center gap-2">
                            <Activity size={16} /> What-If Analysis
                        </h3>
                        <button 
                            onClick={() => setScenarioParams({ priceMod: 0, elecMod: 0, vatMod: 0 })}
                            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                        >
                            <RotateCcw size={12} /> Reset
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
                                <span>Sales Price</span>
                                <span className={`font-mono ${scenarioParams.priceMod > 0 ? 'text-emerald-500' : scenarioParams.priceMod < 0 ? 'text-rose-500' : ''}`}>{scenarioParams.priceMod > 0 ? '+' : ''}{scenarioParams.priceMod}%</span>
                            </div>
                            <DebouncedSlider value={scenarioParams.priceMod} min="-50" max="50" step="5" onChange={(val: number) => setScenarioParams(p => ({...p, priceMod: val}))} accentColor="accent-indigo-500" />
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
                                <span>Electricity</span>
                                <span className={`font-mono ${scenarioParams.elecMod > 0 ? 'text-rose-500' : scenarioParams.elecMod < 0 ? 'text-emerald-500' : ''}`}>{scenarioParams.elecMod > 0 ? '+' : ''}{scenarioParams.elecMod}%</span>
                            </div>
                            <DebouncedSlider value={scenarioParams.elecMod} min="-50" max="100" step="10" onChange={(val: number) => setScenarioParams(p => ({...p, elecMod: val}))} accentColor="accent-rose-500" />
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
                                <span>VAT</span>
                                <span className="font-mono text-slate-700 dark:text-slate-300">{(VAT_RATE * 100).toFixed(0)}%</span>
                            </div>
                            <DebouncedSlider value={scenarioParams.vatMod} min="-5" max="15" step="5" onChange={(val: number) => setScenarioParams(p => ({...p, vatMod: val}))} accentColor="accent-slate-500" />
                        </div>
                    </div>
                </div>
            )}

            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                 {/* KPI Card 1 */}
                 <div className="bg-white dark:bg-scada-800 p-5 rounded-xl border border-slate-200 dark:border-scada-700 shadow-sm relative overflow-hidden group transition-colors">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('totalRecovered', lang)}</span>
                        <div className="p-2 bg-sky-50 dark:bg-sky-500/10 rounded-lg text-sky-500 dark:text-sky-400"><BarChart3 size={18} /></div>
                    </div>
                    <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                        <AnimatedNumber value={aggregates.totalVolume} format={(v) => Math.floor(v).toLocaleString()} /> L
                        {isScenarioMode && <span title="Fixed Volume"><Lock size={14} className="text-slate-300" /></span>}
                    </div>
                 </div>

                 {/* KPI Card 2 */}
                 <div className={`bg-white dark:bg-scada-800 p-5 rounded-xl border border-slate-200 dark:border-scada-700 shadow-sm relative overflow-hidden group transition-colors ${isScenarioMode ? 'ring-2 ring-indigo-500/30' : ''}`}>
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{isScenarioMode ? 'Projected Revenue' : t('totalRevenue', lang)}</span>
                        <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg text-blue-600 dark:text-blue-400"><DollarSign size={18} /></div>
                    </div>
                    <div className={`text-2xl md:text-3xl font-black mb-1 ${isScenarioMode ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'}`}>
                        <AnimatedNumber value={aggregates.totalRevenue} format={formatCurrency} />
                    </div>
                 </div>

                 {/* KPI Card 3 */}
                 <div className="bg-white dark:bg-scada-800 p-5 rounded-xl border border-slate-200 dark:border-scada-700 shadow-sm relative overflow-hidden group transition-colors">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{isScenarioMode ? 'Projected Expenses' : 'Total Expenses'}</span>
                        <div className="p-2 bg-rose-50 dark:bg-rose-500/10 rounded-lg text-rose-600 dark:text-rose-400"><TrendingUp size={18} className="rotate-180" /></div>
                    </div>
                    <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-1">
                        <AnimatedNumber value={aggregates.totalExpenses} format={formatCurrency} />
                    </div>
                 </div>

                 {/* KPI Card 4 */}
                 <div className={`p-5 rounded-xl border shadow-sm relative overflow-hidden group transition-colors bg-white dark:bg-scada-800 border-slate-200 dark:border-scada-700`}>
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{isScenarioMode ? 'Projected Profit' : t('netProfit', lang)}</span>
                        <div className="flex gap-2">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border flex items-center ${
                                aggregates.totalRevenue > 0 && (aggregates.totalProfit / aggregates.totalRevenue) > 0.4 
                                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200' 
                                : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200'
                            }`}>
                                {aggregates.totalRevenue > 0 ? ((aggregates.totalProfit / aggregates.totalRevenue) * 100).toFixed(1) : 0}%
                            </span>
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400"><TrendingUp size={18} /></div>
                        </div>
                    </div>
                    <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-1">
                        <AnimatedNumber value={aggregates.totalProfit} format={formatCurrency} />
                    </div>
                 </div>
            </div>

            {/* Custom Business Model Widget */}
            {isSasco ? (
                // Breakeven Tracker for Sasco (Own Units)
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 dark:from-scada-800 dark:to-slate-900 rounded-xl p-6 border border-slate-700 relative overflow-hidden text-white">
                    <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
                        <div className="flex-1">
                            <h3 className="text-lg font-bold flex items-center gap-2 mb-2"><Target className="text-emerald-400"/> Investment Breakeven Tracker</h3>
                            <p className="text-slate-400 text-sm">CAPEX Recovery based on cumulative net profit. Unit cost base: ${UNIT_CAPEX_USD.toLocaleString()}</p>
                        </div>
                        <div className="flex-1 w-full">
                            <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-2">
                                <span className="text-slate-400">Total CAPEX Recovered</span>
                                <span className={breakevenMetrics!.progress >= 100 ? "text-emerald-400" : "text-blue-400"}>{breakevenMetrics!.progress.toFixed(1)}%</span>
                            </div>
                            <ProgressBar value={breakevenMetrics!.progress} max={100} color={breakevenMetrics!.progress >= 100 ? "bg-emerald-500" : "bg-blue-500"} />
                            <div className="flex justify-between mt-2 text-xs font-mono text-slate-500">
                                <span>$0</span>
                                <span>{formatCurrency(breakevenMetrics!.capex)} (Est. Total)</span>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                // Revenue Share for Leasing Clients
                <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-xl p-6 border border-indigo-500/30 relative overflow-hidden text-white">
                    <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
                        <div className="flex-1">
                            <h3 className="text-lg font-bold flex items-center gap-2 mb-2"><PieChart className="text-indigo-400"/> Partner Revenue Share</h3>
                            <p className="text-slate-400 text-sm">Leasing Model: Client retains 20% of gross revenue.</p>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <div className="text-xs uppercase font-bold text-indigo-300">Your Share (20%)</div>
                                <div className="text-3xl font-black text-white">{formatCurrency(partnerShareMetrics!.partnerShare)}</div>
                            </div>
                            <div className="w-px h-12 bg-white/10"></div>
                            <div className="text-right opacity-60">
                                <div className="text-xs uppercase font-bold text-slate-400">Operator Share (80%)</div>
                                <div className="text-xl font-bold">{formatCurrency(partnerShareMetrics!.partnerShare * 4)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card title={`${isScenarioMode ? 'Projected' : ''} ${t('revenueTrend', lang)} (${currency})`} className="lg:col-span-2 h-[450px] lg:h-[600px]">
                    <div className="h-full w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <ComposedChart data={ledgerData} onClick={handleChartClick} style={{ cursor: 'pointer' }}>
                                <defs>
                                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={isScenarioMode ? PALETTE.scenario : PALETTE.net} stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor={isScenarioMode ? PALETTE.scenario : PALETTE.net} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} className="dark:stroke-slate-700" />
                                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickFormatter={v => v.slice(5)} tickLine={false} axisLine={false} reversed={lang === 'ar'} />
                                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000}k`} orientation={lang === 'ar' ? 'right' : 'left'} />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: 'var(--tooltip-bg, #fff)', 
                                        borderColor: 'var(--tooltip-border, #e2e8f0)', 
                                        borderRadius: '8px', 
                                        color: 'var(--tooltip-text, #0f172a)' 
                                    }} 
                                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                    formatter={(value: number, name: string) => [formatCurrency(value), name === 'grossRevenue' ? 'Gross Rev' : name]}
                                    labelFormatter={(label) => `Date: ${label}`}
                                />
                                <Area type="monotone" dataKey="netProfit" stroke={isScenarioMode ? PALETTE.scenario : PALETTE.net} strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" name="Net Profit" animationDuration={1000} />
                                <Line type="monotone" dataKey="grossRevenue" stroke={PALETTE.gross} strokeWidth={2} dot={false} strokeDasharray="5 5" name="Gross Revenue" animationDuration={1000} />
                                {isScenarioMode && (
                                    <Line type="monotone" dataKey="originalRevenue" stroke="#94a3b8" strokeWidth={1} dot={false} strokeDasharray="2 2" name="Actual Rev (Baseline)" animationDuration={1000} />
                                )}
                                <Legend />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Card 2: Bidirectional Bar Chart (Waterfall Style) - Mobile Optimized with Scrolling */}
                <div className="flex flex-col gap-4 h-auto lg:h-[600px]">
                    <Card title={`${t('cashFlowWaterfall', lang)} (${currency})`} className="flex-1 min-h-[300px] overflow-hidden">
                        <div className="h-full w-full overflow-x-auto overflow-y-hidden">
                            <div className="h-full min-w-[300px]">
                                <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
                                    <BarChart 
                                        layout="vertical"
                                        data={waterfallData} 
                                        margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" className="dark:stroke-slate-700" />
                                        <XAxis type="number" hide />
                                        <YAxis 
                                            dataKey="name" 
                                            type="category" 
                                            width={80} 
                                            stroke="#64748b" 
                                            fontSize={10} 
                                            tickLine={false} 
                                            axisLine={false} 
                                        />
                                        <Tooltip cursor={{fill: 'transparent'}} content={<WaterfallTooltip />} />
                                        <ReferenceLine x={0} stroke="#94a3b8" />
                                        <Bar dataKey="value" radius={[4, 4, 4, 4]} barSize={24} animationDuration={800}>
                                            {waterfallData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </Card>

                    {/* Cost Input Footer */}
                    <div className={`border rounded-xl p-4 shadow-sm transition-colors ${isScenarioMode ? 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-500/20' : 'bg-slate-50 dark:bg-scada-900 border-slate-200 dark:border-scada-700'}`}>
                        <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2 border-b border-slate-200 dark:border-scada-700 pb-2">
                            <Info size={12} /> {isScenarioMode ? 'Scenario Variables' : 'Actual Variables'}
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                            <div className="bg-white dark:bg-scada-800 p-2 rounded-lg border border-slate-200 dark:border-scada-700 flex flex-col justify-between hover:border-emerald-400 transition-colors group">
                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                                    <Tag size={12} className="group-hover:text-emerald-500 transition-colors" />
                                    <span className="text-[9px] uppercase font-bold">Avg Price</span>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <div className="text-sm font-bold text-slate-800 dark:text-white font-mono">
                                            {formatCurrency(avgPricePerLiter * (isScenarioMode ? (1 + scenarioParams.priceMod/100) : 1), 2)}
                                        </div>
                                    </div>
                                    <div className="text-[8px] text-slate-400">Per Liter</div>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-scada-800 p-2 rounded-lg border border-slate-200 dark:border-scada-700 flex flex-col justify-between">
                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                                    <Banknote size={12} />
                                    <span className="text-[9px] uppercase font-bold">VAT</span>
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-slate-800 dark:text-white font-mono">{VAT_RATE * 100}%</div>
                                    <div className="text-[8px] text-slate-400">Inclusive</div>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-scada-800 p-2 rounded-lg border border-slate-200 dark:border-scada-700 flex flex-col justify-between">
                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                                    <Zap size={12} />
                                    <span className="text-[9px] uppercase font-bold">Elec. Rate</span>
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-slate-800 dark:text-white font-mono">
                                        {(convert(BASE_ELEC_RATE_SAR) * (isScenarioMode ? (1 + scenarioParams.elecMod/100) : 1)).toFixed(2)}
                                    </div>
                                    <div className="text-[8px] text-slate-400">Per kWh</div>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-scada-800 p-2 rounded-lg border border-slate-200 dark:border-scada-700 flex flex-col justify-between">
                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                                    <Activity size={12} />
                                    <span className="text-[9px] uppercase font-bold">Eff.</span>
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-slate-800 dark:text-white font-mono">{KWH_PER_L}</div>
                                    <div className="text-[8px] text-slate-400">kWh/L</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Financial Ledger Table */}
            <Card title="Financial Ledger" action={
                <button onClick={handleExportLedger} className="flex items-center gap-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded transition-colors shadow-sm">
                    <Download size={14}/> Export CSV
                </button>
            }>
                <div className="overflow-x-auto max-h-[400px] custom-scrollbar">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-100 dark:bg-scada-900/80 sticky top-0 text-slate-600 dark:text-slate-400 uppercase text-xs font-bold tracking-wider z-10 backdrop-blur-sm">
                            <tr>
                                <th className="px-4 py-3 border-b border-slate-200 dark:border-scada-700">Date</th>
                                <th className="px-4 py-3 border-b border-slate-200 dark:border-scada-700 text-right">Volume (L)</th>
                                <th className="px-4 py-3 border-b border-slate-200 dark:border-scada-700 text-right">Gross Rev.</th>
                                <th className="px-4 py-3 border-b border-slate-200 dark:border-scada-700 text-right text-rose-500">VAT ({(VAT_RATE*100).toFixed(0)}%)</th>
                                <th className="px-4 py-3 border-b border-slate-200 dark:border-scada-700 text-right">Net Rev.</th>
                                <th className="px-4 py-3 border-b border-slate-200 dark:border-scada-700 text-right text-rose-500">Electricity</th>
                                <th className="px-4 py-3 border-b border-slate-200 dark:border-scada-700 text-right font-black">Net Profit</th>
                                <th className="px-4 py-3 border-b border-slate-200 dark:border-scada-700 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-scada-700">
                            {ledgerData.slice().reverse().map((row, idx) => (
                                <tr 
                                    key={idx} 
                                    onClick={() => setSelectedDateDetails(row.date)}
                                    className="hover:bg-blue-50 dark:hover:bg-scada-700/50 transition-colors cursor-pointer group"
                                >
                                    <td className="px-4 py-2 font-mono text-slate-600 dark:text-slate-400 font-bold group-hover:text-blue-600">{row.date}</td>
                                    <td className="px-4 py-2 font-mono text-right text-slate-800 dark:text-slate-300">{row.volume.toLocaleString()}</td>
                                    <td className="px-4 py-2 font-mono text-right text-slate-800 dark:text-slate-300 font-bold">{formatCurrency(row.grossRevenue)}</td>
                                    <td className="px-4 py-2 font-mono text-right text-rose-500">{formatCurrency(row.vat)}</td>
                                    <td className="px-4 py-2 font-mono text-right text-slate-600 dark:text-slate-400">{formatCurrency(row.netRevenue)}</td>
                                    <td className="px-4 py-2 font-mono text-right text-rose-500">{formatCurrency(row.electricity)}</td>
                                    <td className="px-4 py-2 font-mono text-right text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrency(row.netProfit)}</td>
                                    <td className="px-4 py-2 text-right">
                                        <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};
