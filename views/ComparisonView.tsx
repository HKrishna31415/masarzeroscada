
import React, { useState, useMemo } from 'react';
import { VRU } from '../types';
import { getMachineData } from '../data/MachineRepository';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Card } from '../components/ui';
import { ArrowRightLeft, Filter, Check, Activity, MapPin } from 'lucide-react';
import { t } from '../utils/i18n';

interface ComparisonViewProps {
    fleet: VRU[];
    lang: 'en' | 'ar' | 'zh' | 'ko';
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({ fleet, lang }) => {
    const [mode, setMode] = useState<'assets' | 'regions'>('assets');
    
    // Asset Mode Selection
    const [selectedIds, setSelectedIds] = useState<string[]>(() => {
        return fleet
            .filter(f => f.status === 'Running')
            .slice(0, 3)
            .map(f => f.id);
    });

    // Region Mode Selection: Added Southern to default view
    const [selectedRegions, setSelectedRegions] = useState<string[]>(['Central', 'Western', 'Southern']);
    const allRegions = useMemo(() => Array.from(new Set(fleet.map(f => f.region))), [fleet]);
    
    const [timeRange, setTimeRange] = useState<'30d' | 'ytd' | 'all'>('30d');
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);

    // Color palette for lines
    const colors = ['#10b981', '#0ea5e9', '#8b5cf6', '#f59e0b', '#f43f5e'];

    // --- Data Processing ---
    const chartData = useMemo(() => {
        const allSeries: Record<string, any>[] = [];
        const dateSet = new Set<string>();
        const dataMap: Record<string, Record<string, number>> = {}; // Key -> Date -> Value

        // SIMULATION TIME ANCHOR: Feb 10, 2026 (Consistent with Activity Feed)
        const anchorDate = new Date('2026-02-10');
        const anchorStr = anchorDate.toISOString().split('T')[0];
        
        const currentYear = anchorDate.getFullYear().toString();

        if (mode === 'assets') {
            if (selectedIds.length === 0) return [];
            selectedIds.forEach(id => {
                const data = getMachineData(id);
                let filteredDaily = data.daily;

                if (timeRange === '30d') {
                    const startDate = new Date(anchorDate);
                    startDate.setDate(startDate.getDate() - 30);
                    const startStr = startDate.toISOString().split('T')[0];
                    filteredDaily = filteredDaily.filter(d => d.date >= startStr && d.date <= anchorStr);
                } else if (timeRange === 'ytd') {
                    filteredDaily = filteredDaily.filter(d => d.date.startsWith(currentYear) && d.date <= anchorStr);
                } else {
                    filteredDaily = filteredDaily.filter(d => d.date <= anchorStr);
                }

                dataMap[id] = {};
                filteredDaily.forEach(d => {
                    dataMap[id][d.date] = d.recoveredLiters;
                    dateSet.add(d.date);
                });
            });
        } else {
            // Region Mode
            if (selectedRegions.length === 0) return [];
            
            selectedRegions.forEach(region => {
                dataMap[region] = {};
                const regionUnits = fleet.filter(f => f.region === region && f.status !== 'Pending_Install');
                
                regionUnits.forEach(unit => {
                    const data = getMachineData(unit.id);
                    let filteredDaily = data.daily;

                    if (timeRange === '30d') {
                        const startDate = new Date(anchorDate);
                        startDate.setDate(startDate.getDate() - 30);
                        const startStr = startDate.toISOString().split('T')[0];
                        filteredDaily = filteredDaily.filter(d => d.date >= startStr && d.date <= anchorStr);
                    } else if (timeRange === 'ytd') {
                        filteredDaily = filteredDaily.filter(d => d.date.startsWith(currentYear) && d.date <= anchorStr);
                    } else {
                        filteredDaily = filteredDaily.filter(d => d.date <= anchorStr);
                    }

                    filteredDaily.forEach(d => {
                        dataMap[region][d.date] = (dataMap[region][d.date] || 0) + d.recoveredLiters;
                        dateSet.add(d.date);
                    });
                });
            });
        }

        // Sort unique dates
        const sortedDates = Array.from(dateSet).sort();

        // Build chart compatible array
        sortedDates.forEach(date => {
            const row: any = { date };
            const keys = mode === 'assets' ? selectedIds : selectedRegions;
            keys.forEach(key => {
                row[key] = dataMap[key]?.[date] || 0;
            });
            allSeries.push(row);
        });

        return allSeries;
    }, [selectedIds, selectedRegions, timeRange, mode, fleet]);

    // Comparison Stats Summary
    const stats = useMemo(() => {
        const keys = mode === 'assets' ? selectedIds : selectedRegions;
        
        return keys.map(key => {
            const rawData = chartData.map(row => row[key] || 0);
            const total = rawData.reduce((a, b) => a + b, 0);
            const avg = rawData.length > 0 ? Math.round(total / rawData.length) : 0;
            const max = Math.max(...rawData, 0);
            
            let name = key;
            let sub = '-';
            
            if (mode === 'assets') {
                const unit = fleet.find(f => f.id === key);
                name = unit?.name || key;
                sub = unit?.city || '-';
            } else {
                name = `${key} Region`;
                sub = `${fleet.filter(f => f.region === key && f.status === 'Running').length} Active Units`;
            }

            return {
                id: key,
                name,
                sub,
                total,
                avg,
                max
            };
        }).sort((a, b) => b.total - a.total); // Sort by performance
    }, [chartData, selectedIds, selectedRegions, mode, fleet]);

    // Performance Opt: Disable animation if too many points or lines
    const enableAnim = useMemo(() => {
        return chartData.length < 50 && (mode === 'assets' ? selectedIds.length <= 3 : selectedRegions.length <= 3);
    }, [chartData.length, selectedIds.length, selectedRegions.length, mode]);

    // --- Handlers ---
    const toggleSelection = (key: string) => {
        if (mode === 'assets') {
            if (selectedIds.includes(key)) {
                setSelectedIds(prev => prev.filter(i => i !== key));
            } else {
                if (selectedIds.length >= 5) return;
                setSelectedIds(prev => [...prev, key]);
            }
        } else {
            if (selectedRegions.includes(key)) {
                setSelectedRegions(prev => prev.filter(r => r !== key));
            } else {
                setSelectedRegions(prev => [...prev, key]);
            }
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-8 h-full flex flex-col">
            {/* Header & Controls */}
            <div className="bg-white dark:bg-scada-800 p-4 rounded-xl border border-slate-200 dark:border-scada-700 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <ArrowRightLeft className="text-scada-accent" /> {t('analysis', lang)}
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('techEfficiency', lang)}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    
                    {/* Mode Toggle */}
                    <div className="flex bg-slate-100 dark:bg-scada-900 p-1 rounded-lg border border-slate-200 dark:border-scada-600">
                        <button
                            onClick={() => setMode('assets')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors flex items-center gap-2 ${mode === 'assets' ? 'bg-white dark:bg-scada-700 text-scada-accent shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            <Activity size={14} /> Assets
                        </button>
                        <button
                            onClick={() => setMode('regions')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors flex items-center gap-2 ${mode === 'regions' ? 'bg-white dark:bg-scada-700 text-scada-accent shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            <MapPin size={14} /> {t('region', lang)}
                        </button>
                    </div>

                    <div className="h-6 w-px bg-slate-200 dark:bg-scada-700 mx-1"></div>

                    {/* Time Range */}
                    <div className="flex bg-slate-100 dark:bg-scada-900 p-1 rounded-lg border border-slate-200 dark:border-scada-600">
                        {[{id: '30d', label: '30 Days'}, {id: 'ytd', label: 'YTD'}, {id: 'all', label: 'Lifetime'}].map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => setTimeRange(opt.id as any)}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${timeRange === opt.id ? 'bg-white dark:bg-scada-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {/* Selector */}
                    <div className="relative">
                        <button 
                            onClick={() => setIsSelectorOpen(!isSelectorOpen)}
                            className="flex items-center gap-2 bg-scada-accent hover:bg-sky-400 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-lg shadow-sky-500/20"
                        >
                            <Filter size={14} />
                            {mode === 'assets' ? `Select Units (${selectedIds.length}/5)` : 'Select Regions'}
                        </button>

                        {isSelectorOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsSelectorOpen(false)}></div>
                                <div className={`absolute top-full mt-2 w-72 bg-white dark:bg-scada-800 border border-slate-200 dark:border-scada-600 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[400px] ${lang === 'ar' ? 'left-0' : 'right-0'}`}>
                                    <div className="p-3 bg-slate-50 dark:bg-scada-900 border-b border-slate-200 dark:border-scada-600 flex justify-between items-center">
                                        <span className="text-xs font-bold uppercase text-slate-500">Available {mode === 'assets' ? 'Assets' : 'Regions'}</span>
                                        <button onClick={() => mode === 'assets' ? setSelectedIds([]) : setSelectedRegions([])} className="text-[10px] text-rose-500 hover:underline">Clear All</button>
                                    </div>
                                    <div className="overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                        {mode === 'assets' ? (
                                            fleet.filter(f => f.status !== 'Pending_Install').map(unit => (
                                                <button
                                                    key={unit.id}
                                                    onClick={() => toggleSelection(unit.id)}
                                                    disabled={!selectedIds.includes(unit.id) && selectedIds.length >= 5}
                                                    className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${
                                                        selectedIds.includes(unit.id) 
                                                        ? 'bg-blue-50 dark:bg-scada-700 text-scada-accent font-bold' 
                                                        : 'hover:bg-slate-50 dark:hover:bg-scada-700 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed'
                                                    }`}
                                                >
                                                    <div className="flex flex-col text-left">
                                                        <span>{unit.name}</span>
                                                        <span className="text-[9px] opacity-70">{unit.city}</span>
                                                    </div>
                                                    {selectedIds.includes(unit.id) && <Check size={14} />}
                                                </button>
                                            ))
                                        ) : (
                                            allRegions.map(region => (
                                                <button
                                                    key={region}
                                                    onClick={() => toggleSelection(region)}
                                                    className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${
                                                        selectedRegions.includes(region) 
                                                        ? 'bg-blue-50 dark:bg-scada-700 text-scada-accent font-bold' 
                                                        : 'hover:bg-slate-50 dark:hover:bg-scada-700 text-slate-700 dark:text-slate-300'
                                                    }`}
                                                >
                                                    <span>{region}</span>
                                                    {selectedRegions.includes(region) && <Check size={14} />}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Comparison Chart */}
            <Card className="flex-1 border-slate-200 dark:border-scada-700 bg-white dark:bg-scada-800">
                {(mode === 'assets' && selectedIds.length > 0) || (mode === 'regions' && selectedRegions.length > 0) ? (
                    <div className="h-[400px] w-full flex flex-col">
                        <div className="flex justify-between items-center mb-4 px-2">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Recovered Volume (Liters)</h3>
                            <div className="flex gap-4">
                                {(mode === 'assets' ? selectedIds : selectedRegions).map((key, idx) => {
                                    let name = key;
                                    if (mode === 'assets') name = fleet.find(f => f.id === key)?.name || key;
                                    return (
                                        <div key={key} className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                                            <div className="w-3 h-1 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }}></div>
                                            {name}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-700" />
                                <XAxis 
                                    dataKey="date" 
                                    stroke="#94a3b8" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false} 
                                    tickFormatter={(v) => v.slice(5)} 
                                    minTickGap={30}
                                />
                                <YAxis 
                                    stroke="#94a3b8" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false} 
                                    tickFormatter={(v) => `${v}`}
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: 'var(--tooltip-bg, #0f172a)', 
                                        borderColor: 'var(--tooltip-border, #334155)', 
                                        color: 'var(--tooltip-text, #fff)',
                                        borderRadius: '8px',
                                        fontSize: '12px'
                                    }}
                                    itemStyle={{ padding: 0 }}
                                    labelStyle={{ marginBottom: '4px', color: '#94a3b8' }}
                                />
                                {(mode === 'assets' ? selectedIds : selectedRegions).map((key, idx) => (
                                    <Line 
                                        key={key}
                                        type="monotone" 
                                        dataKey={key} 
                                        stroke={colors[idx % colors.length]} 
                                        strokeWidth={2} 
                                        dot={false}
                                        activeDot={{ r: 5 }}
                                        isAnimationActive={enableAnim}
                                        name={mode === 'assets' ? (fleet.find(f => f.id === key)?.name || key) : key}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-[400px] flex flex-col items-center justify-center text-slate-400">
                        <Activity size={48} className="mb-4 opacity-20" />
                        <p>Select {mode === 'assets' ? 'units' : 'regions'} to start comparison</p>
                    </div>
                )}
            </Card>

            {/* Performance Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 shrink-0">
                {stats.map((stat, idx) => (
                    <div key={stat.id} className="bg-white dark:bg-scada-800 border border-slate-200 dark:border-scada-700 rounded-xl p-4 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: colors[idx % colors.length] }}></div>
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h4 className="font-bold text-slate-900 dark:text-white truncate">{stat.name}</h4>
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider">{stat.sub}</div>
                            </div>
                            {idx === 0 && <div className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200">LEADER</div>}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-slate-50 dark:bg-scada-900/50 p-2 rounded-lg border border-slate-100 dark:border-scada-700/50">
                                <div className="text-[9px] text-slate-400 uppercase mb-0.5">Total Vol</div>
                                <div className="font-bold text-slate-700 dark:text-slate-200">{stat.total.toLocaleString()}</div>
                            </div>
                            <div className="bg-slate-50 dark:bg-scada-900/50 p-2 rounded-lg border border-slate-100 dark:border-scada-700/50">
                                <div className="text-[9px] text-slate-400 uppercase mb-0.5">Peak Day</div>
                                <div className="font-bold text-slate-700 dark:text-slate-200">{stat.max.toLocaleString(undefined, {maximumFractionDigits:0})}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
