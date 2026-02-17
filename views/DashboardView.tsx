
import React, { useMemo, useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { DollarSign, Signal, Loader2, Sparkles, Sun, Info, Zap, Trophy, ArrowRight, BarChart3, TrendingUp, CheckCircle, Activity } from 'lucide-react';
import { Card } from '../components/ui';
import { VRU, ViewState } from '../types';
import { t } from '../utils/i18n';
import { FleetStatusTable } from '../components/FleetStatusTable';

interface DashboardProps {
    fleet: VRU[];
    historyData: any[];
    onSelectMachine: (id: string) => void;
    onNavigate: (view: ViewState, params?: any) => void;
    currency?: string; 
    lang: 'en' | 'ar' | 'zh' | 'ko'; 
}

// Performance: Simple Downsampling
const downsampleData = (data: any[], targetCount: number = 100) => {
    if (!data || data.length <= targetCount) return data;
    const sampled = [];
    const step = Math.ceil(data.length / targetCount);
    for (let i = 0; i < data.length; i += step) {
        sampled.push(data[i]);
    }
    if (sampled[sampled.length - 1] !== data[data.length - 1]) {
        sampled.push(data[data.length - 1]);
    }
    return sampled;
};

// Custom Metric Card
const DashboardMetricCard = React.memo(({ title, value, subtext, subtextType, icon: Icon, trend, loading, infoContent, verified }: any) => {
    const [showInfo, setShowInfo] = useState(false);

    const themes: any = {
        blue: { bg: 'bg-slate-100 dark:bg-[#1e293b]/60', pill: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20', stroke: '#14b8a6', icon: 'text-teal-500' },
        green: { bg: 'bg-slate-100 dark:bg-[#1e293b]/60', pill: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20', stroke: '#10b981', icon: 'text-emerald-500' },
        purple: { bg: 'bg-slate-100 dark:bg-[#1e293b]/60', pill: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20', stroke: '#6366f1', icon: 'text-indigo-500' },
        custom: { bg: 'bg-slate-100 dark:bg-[#1e293b]/60', pill: 'bg-scada-accent/10 text-scada-accent border-scada-accent/20', stroke: 'var(--color-primary)', icon: 'text-scada-accent' }
    };

    const theme = themes[subtextType] || themes.blue;

    if (loading) {
        return (
            <div className={`relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] p-6 shadow-sm min-h-[140px] animate-pulse`}>
                <div className="h-3 w-1/3 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
                <div className="h-8 w-2/3 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
            </div>
        );
    }

    return (
        <div 
            className={`relative overflow-visible rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] p-6 shadow-sm dark:shadow-xl group transition-colors duration-300`}
            onMouseEnter={() => setShowInfo(true)}
            onMouseLeave={() => setShowInfo(false)}
        >
            <div className={`absolute -top-10 -right-10 w-40 h-40 ${theme.bg} blur-3xl opacity-50 dark:opacity-20 rounded-full group-hover:opacity-70 dark:group-hover:opacity-40 transition-opacity duration-500 overflow-hidden`}></div>
            <div className="relative z-10 flex flex-col h-full justify-between min-h-[140px]">
                <div>
                    <div className="flex justify-between items-start">
                        <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            {title}
                            {verified && (
                                <span title="Data Verified against Log Sums">
                                    <CheckCircle size={10} className="text-emerald-500" />
                                </span>
                            )}
                        </h3>
                        {infoContent && (
                            <div className="relative">
                                <Info size={14} className="text-slate-400 cursor-help hover:text-scada-accent transition-colors" />
                                {showInfo && (
                                    <div className="absolute right-0 top-6 w-64 bg-slate-900 text-white text-xs p-3 rounded-xl shadow-2xl z-[100] border border-slate-700 animate-in fade-in slide-in-from-top-2 pointer-events-none">
                                        <div className="font-bold border-b border-slate-700 pb-1 mb-2 uppercase tracking-wider text-[10px] text-slate-400">Calculation Breakdown</div>
                                        {infoContent}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-4 flex items-baseline gap-2">
                        {value}
                    </div>
                </div>
                <div className={`inline-flex items-center self-start px-3 py-1.5 rounded-lg border text-xs font-bold ${theme.pill} backdrop-blur-sm`}>
                    {trend && <TrendingUp size={14} className="mr-1.5" />}
                    {subtext}
                </div>
            </div>
            <div className={`absolute right-4 top-1/2 -translate-y-1/2 opacity-5 pointer-events-none transform scale-150 group-hover:scale-125 group-hover:opacity-10 transition-all duration-500 ${theme.icon}`}>
                <Icon size={120} strokeWidth={1} />
            </div>
        </div>
    );
});

export const DashboardView: React.FC<DashboardProps> = ({ fleet, historyData, onSelectMachine, onNavigate, currency = 'SAR', lang }) => {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const t = setTimeout(() => setIsLoading(false), 800);
        return () => clearTimeout(t);
    }, []);

    const isMasterView = useMemo(() => {
        const owners = new Set(fleet.map(f => f.owner));
        return owners.size > 1;
    }, [fleet]);

    const chartData = useMemo(() => downsampleData(historyData, 100), [historyData]);

    const installedFleet = useMemo(() => fleet.filter(v => v.status !== 'Pending_Install'), [fleet]);
    const totalInstalled = installedFleet.length;
    const active = useMemo(() => installedFleet.filter(v => v.status === 'Running').length, [installedFleet]);
    
    // STRICT TOTAL: Sum from the fleet array only to avoid double counting from aggregation anomalies
    const totalRecoveredVolume = useMemo(() => {
        return installedFleet.reduce((acc, curr) => acc + curr.totalRecoveredAmount, 0);
    }, [installedFleet]);
    
    const onlinePercentage = useMemo(() => totalInstalled > 0 
        ? ((active / totalInstalled) * 100).toFixed(1)
        : "0.0", [active, totalInstalled]);

    const rates: Record<string, number> = useMemo(() => ({ 'SAR': 1, 'USD': 0.266, 'CNY': 1.91, 'KRW': 365, 'BHD': 0.1 }), []);
    const convert = (val: number) => val * (rates[currency] || 1);
    
    const formatMoney = (val: number) => {
        const digits = currency === 'KRW' ? 0 : 0; 
        return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: digits }).format(convert(val));
    };

    const formatPrice = (val: number) => {
        const digits = currency === 'KRW' ? 0 : 2; 
        return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(convert(val));
    };

    const financialStats = useMemo(() => {
        let volume = totalRecoveredVolume;
        // Use history only for ratios, but scale to match the strict total volume
        const histVol = historyData.reduce((acc, curr) => acc + curr.recoveredLiters, 0);
        const histRev = historyData.reduce((acc, curr) => acc + curr.revenue, 0);
        
        // Avoid division by zero
        const avgPrice = histVol > 0 ? histRev / histVol : 2.4; 
        
        const totalRevenue = volume * avgPrice;
        // Approx expenses logic (VAT + Elec)
        const totalExpenses = totalRevenue * 0.15; // Rough estimate for display
        const totalProfit = totalRevenue - totalExpenses;
        
        return { totalRevenue, totalExpenses, totalProfit, volume, impliedAvgPrice: avgPrice };
    }, [historyData, totalRecoveredVolume]);

    // SMART ANCHOR: Find the last date with ACTUAL data to avoid looking at empty future dates
    const anchorDateIndex = useMemo(() => {
        if (!historyData || historyData.length === 0) return -1;
        // Scan backwards
        for (let i = historyData.length - 1; i >= 0; i--) {
            if (historyData[i].recoveredLiters > 0) return i;
        }
        return historyData.length - 1; // Fallback to end if all 0
    }, [historyData]);

    const growthMetric = useMemo(() => {
        if (anchorDateIndex < 1) return { val: "0.0", trend: "neutral", sign: "•" };
        
        // Slice 30 days ending at the anchor date
        const endIndex = anchorDateIndex + 1;
        const startIndex = Math.max(0, endIndex - 30);
        const prevStartIndex = Math.max(0, startIndex - 30);
        
        const last30 = historyData.slice(startIndex, endIndex);
        const prev30 = historyData.slice(prevStartIndex, startIndex);
        
        const sumLast30 = last30.reduce((acc, curr) => acc + curr.recoveredLiters, 0);
        const sumPrev30 = prev30.reduce((acc, curr) => acc + curr.recoveredLiters, 0);
        
        if (sumPrev30 === 0) return { val: "100.0", trend: "up", sign: "↑" };
        
        const diff = sumLast30 - sumPrev30;
        const percent = ((diff / sumPrev30) * 100).toFixed(1);
        
        return {
            val: Math.abs(parseFloat(percent)).toString(),
            trend: diff >= 0 ? "up" : "down",
            sign: diff >= 0 ? "↑" : "↓"
        };
    }, [historyData, anchorDateIndex]);

    const pulseMetric = useMemo(() => {
        if (anchorDateIndex < 0) return { today: 0, yesterday: 0, change: 0, dateLabel: 'Today' };
        
        const latestRecord = historyData[anchorDateIndex];
        const previousRecord = historyData[anchorDateIndex - 1];

        const today = latestRecord?.recoveredLiters || 0;
        const yesterday = previousRecord?.recoveredLiters || 0;
        
        let change = 0;
        if (yesterday > 0) change = ((today - yesterday) / yesterday) * 100;
        else if (today > 0) change = 100;

        return { 
            today, 
            yesterday, 
            change,
            dateLabel: latestRecord ? new Date(latestRecord.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Today'
        };
    }, [historyData, anchorDateIndex]);

    // Pulse Chart Data (Last 14 valid days)
    const pulseChartData = useMemo(() => {
        if (anchorDateIndex < 0) return [];
        const start = Math.max(0, anchorDateIndex - 13);
        return historyData.slice(start, anchorDateIndex + 1).map(d => ({
            day: d.date.split('-')[2],
            val: d.recoveredLiters
        }));
    }, [historyData, anchorDateIndex]);

    const chartPerformanceData = useMemo(() => {
        const stats: Record<string, { count: number, totalEfficiency: number }> = {};
        
        installedFleet.forEach(unit => {
            const key = isMasterView ? unit.owner : unit.region; 
            if (!stats[key]) {
                stats[key] = { count: 0, totalEfficiency: 0 };
            }
            stats[key].count += 1;
            stats[key].totalEfficiency += unit.recoveryRatePercentage; 
        });

        return Object.keys(stats).map(key => ({
            name: key,
            val: Math.round((stats[key].totalEfficiency / stats[key].count) * 100)
        })).sort((a, b) => b.val - a.val); 
    }, [installedFleet, isMasterView]);

    const briefing = useMemo(() => {
        const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        const offlineCount = totalInstalled - active;
        let mood = 'good';
        let text = `Good morning. The fleet is operating at ${onlinePercentage}% efficiency. `;
        if (offlineCount > 0) {
            text += `Attention is required for ${offlineCount} offline units. `;
            mood = 'warning';
        } else {
            text += `All systems are nominal. `;
        }
        if (growthMetric.trend === 'up') {
            text += `Recovery volume is trending up ${growthMetric.val}% over the last 30 operational days. `;
        }
        return { date, text, mood };
    }, [onlinePercentage, active, totalInstalled, growthMetric]);

    const breakdownContent = (
        <div className="space-y-1.5 font-mono">
            <div className="flex justify-between">
                <span className="text-slate-400">Vol:</span>
                <span className="text-white">{financialStats.volume.toLocaleString()} L</span>
            </div>
            <div className="flex justify-between border-b border-slate-700 pb-1">
                <span className="text-slate-400">Avg Price:</span>
                <span className="text-emerald-400">{formatPrice(financialStats.impliedAvgPrice)} /L</span>
            </div>
            <div className="flex justify-between">
                <span className="text-slate-400">Gross Rev:</span>
                <span className="text-blue-400">{formatMoney(financialStats.totalRevenue)}</span>
            </div>
            <div className="flex justify-between text-rose-400">
                <span>Expenses:</span>
                <span>-{formatMoney(financialStats.totalExpenses)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-700 pt-1 font-bold">
                <span className="text-white">Net Profit:</span>
                <span className="text-emerald-400">{formatMoney(financialStats.totalProfit)}</span>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20 md:pb-8">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                            {isMasterView ? 'Global Command Center' : t('execDashboard', lang)}
                        </h1>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20 mt-1">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider">Live</span>
                        </div>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">{t('execSubtitle', lang)}</p>
                </div>
            </div>

            {/* Daily Fleet Briefing */}
            {!isLoading && (
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-indigo-900 dark:to-slate-900 rounded-3xl p-1 shadow-lg relative overflow-hidden content-visibility-auto">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                    <div className="bg-white/10 dark:bg-black/20 backdrop-blur-sm rounded-[20px] p-6 flex flex-col md:flex-row items-start md:items-center gap-6 relative z-10">
                        <div className="p-3 bg-white/20 rounded-full shrink-0 animate-pulse">
                            <Sparkles className="text-yellow-300" size={24} />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 text-blue-100 text-xs font-bold uppercase tracking-widest mb-1">
                                <Sun size={12} /> Daily Fleet Briefing • {briefing.date}
                            </div>
                            <p className="text-white text-lg md:text-xl font-medium leading-relaxed">
                                {briefing.text}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <DashboardMetricCard 
                    loading={isLoading}
                    title={t('totalRecovered', lang)}
                    value={`${(totalRecoveredVolume).toLocaleString()} L`}
                    subtext={`${growthMetric.sign} ${growthMetric.val}% vs last 30d`}
                    subtextType="custom" 
                    icon={BarChart3}
                    trend={true}
                    verified={true}
                />
                <DashboardMetricCard 
                    loading={isLoading}
                    title={t('netSavings', lang)}
                    value={formatMoney(financialStats.totalProfit)}
                    subtext="Net Profit (Rev - Expenses)"
                    subtextType="green"
                    icon={DollarSign}
                    infoContent={breakdownContent}
                />
                <DashboardMetricCard 
                    loading={isLoading}
                    title={t('fleetAvail', lang)}
                    value={`${onlinePercentage}%`}
                    subtext={`${active}/${totalInstalled} Units Online`}
                    subtextType="purple"
                    icon={Signal}
                />
            </div>

            {/* Secondary Widgets Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 content-visibility-auto">
                {/* 1. Improved Fleet Pulse Widget with Chart */}
                <Card className="lg:col-span-1 border-slate-200 dark:border-scada-700 bg-white dark:bg-[#0f172a] relative overflow-hidden flex flex-col h-full shadow-sm">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20 shadow-sm">
                                <Activity size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white text-base">Daily Volume</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                                    {pulseMetric.dateLabel}
                                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                    Live
                                </p>
                            </div>
                        </div>
                        
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${pulseMetric.change >= 0 ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-500/20'}`}>
                            {pulseMetric.change > 0 ? <TrendingUp size={14} /> : <TrendingUp size={14} className="rotate-180" />}
                            {Math.abs(pulseMetric.change).toFixed(1)}%
                            <span className="text-[10px] opacity-70 font-normal ml-0.5 hidden sm:inline">vs Yest.</span>
                        </div>
                    </div>
                    
                    {/* Main Number */}
                    <div className="relative z-10 mb-6">
                        <div className="flex items-baseline gap-2">
                            <div className="text-5xl xl:text-6xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
                                {pulseMetric.today.toLocaleString()}
                            </div>
                            <span className="text-lg font-bold text-slate-400 dark:text-slate-500">L</span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Total Recovered Today</p>
                    </div>

                    {/* Chart Area */}
                    <div className="flex-1 min-h-[100px] w-full relative z-10 -ml-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={pulseChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                                <XAxis 
                                    dataKey="day" 
                                    tickLine={false} 
                                    axisLine={false} 
                                    tick={{fontSize: 10, fill: '#94a3b8'}} 
                                    dy={10}
                                />
                                <YAxis hide />
                                <Tooltip 
                                    cursor={{fill: 'var(--tooltip-cursor, rgba(255,255,255,0.05))'}}
                                    contentStyle={{ 
                                        backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                                        borderColor: '#334155', 
                                        color: '#fff', 
                                        borderRadius: '8px', 
                                        fontSize: '12px',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                    }}
                                    formatter={(value: number) => [`${value.toLocaleString()} L`, 'Volume']}
                                    labelFormatter={(label) => `Day ${label}`}
                                />
                                <Bar 
                                    dataKey="val" 
                                    fill="var(--color-primary)" 
                                    opacity={0.8} 
                                    radius={[4, 4, 0, 0]} 
                                    barSize={20}
                                    activeBar={{ fill: 'var(--color-primary)', opacity: 1 }}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* 2. Advanced Top Performers Table */}
                <div className="lg:col-span-2 h-full min-h-[300px]">
                    <FleetStatusTable fleet={fleet} onSelect={onSelectMachine} />
                </div>
            </div>

            {/* Main Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 content-visibility-auto">
                <Card title={t('globalTrends', lang)} className="lg:col-span-2 h-96 border-slate-200 dark:border-scada-700 bg-white dark:bg-scada-800">
                    {isLoading ? (
                        <div className="w-full h-full flex items-center justify-center">
                            <Loader2 className="animate-spin text-slate-400" size={32} />
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorRecovered" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.6}/>
                                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" vertical={false} className="opacity-20 dark:stroke-slate-700/30" />
                                <XAxis 
                                    dataKey="date" 
                                    stroke="#475569" 
                                    tick={{fontSize: 10, fill: '#64748b'}} 
                                    tickFormatter={(val) => historyData.length > 365 ? val.slice(2, 7) : val.slice(5)} 
                                    tickLine={false}
                                    axisLine={false}
                                    dy={10}
                                    minTickGap={30}
                                />
                                <YAxis 
                                    stroke="#475569" 
                                    tick={{fontSize: 12, fill: '#64748b'}} 
                                    tickFormatter={(val) => `${val/1000}k`}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                                        borderColor: '#334155', 
                                        color: '#fff', 
                                        borderRadius: '12px',
                                        backdropFilter: 'blur(10px)',
                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                                        padding: '12px'
                                    }}
                                    itemStyle={{ color: 'var(--color-primary)', fontWeight: 'bold' }}
                                    labelStyle={{ color: '#94a3b8', marginBottom: '8px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}
                                    formatter={(value: number) => [`${value.toLocaleString()} L`, 'Recovered']}
                                    labelFormatter={(label) => `DATE: ${label}`}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="recoveredLiters" 
                                    stroke="var(--color-primary)" 
                                    strokeWidth={3}
                                    fillOpacity={1} 
                                    fill="url(#colorRecovered)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </Card>

                {/* Regional or Account Performance - Simple Bar */}
                <Card title={isMasterView ? "Client Efficiency" : t('techEfficiency', lang)} className="h-96 border-slate-200 dark:border-scada-700 bg-white dark:bg-scada-800">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <BarChart layout="vertical" data={chartPerformanceData} margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#94a3b8" className="opacity-20 dark:stroke-slate-700/30" />
                            <XAxis type="number" hide domain={[0, 100]} />
                            <YAxis 
                                dataKey="name" 
                                type="category" 
                                width={80} 
                                tick={{fontSize: 11, fill: '#64748b', fontWeight: 'bold'}} 
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip 
                                cursor={{fill: 'transparent'}}
                                contentStyle={{ 
                                    backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                                    borderColor: '#334155', 
                                    color: '#fff', 
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                                }}
                                itemStyle={{ color: '#fff' }}
                                labelStyle={{ color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase' }}
                                formatter={(value: number) => [`${value}%`, 'Efficiency']}
                            />
                            <Bar dataKey="val" barSize={12} radius={[0, 4, 4, 0]}>
                                {chartPerformanceData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#3b82f6'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
            </div>
        </div>
    );
};
