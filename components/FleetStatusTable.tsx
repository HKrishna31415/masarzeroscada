
import React, { useState, useMemo } from 'react';
import { VRU } from '../types';
import { Card, formatDateFriendly } from './ui';
import { Trophy, Medal, Calendar, Clock, BarChart3, Activity, Layers, ChevronDown, ChevronUp, Search, ChevronRight, MapPin } from 'lucide-react';
import { getMachineData } from '../data/MachineRepository';

interface FleetStatusTableProps {
    fleet: VRU[];
    onSelect: (id: string) => void;
}

type TimeRange = 'today' | 'month' | 'year' | 'all';
type PeakMetric = 'day' | 'month' | 'year';

export const FleetStatusTable: React.FC<FleetStatusTableProps> = React.memo(({ fleet, onSelect }) => {
    const [timeRange, setTimeRange] = useState<TimeRange>('all'); 
    const [peakMetric, setPeakMetric] = useState<PeakMetric>('day');
    const [visibleCount, setVisibleCount] = useState(10);
    const [filterText, setFilterText] = useState('');

    // Helper: Get Date Ranges based on "Now"
    const getDateFilter = (dateStr: string) => {
        const now = new Date(); // Or simulation anchor
        const todayStr = now.toISOString().split('T')[0];
        const currentMonthPrefix = todayStr.substring(0, 7); 
        const currentYearPrefix = todayStr.substring(0, 4);

        switch (timeRange) {
            case 'today': return dateStr === todayStr;
            case 'month': return dateStr.startsWith(currentMonthPrefix);
            case 'year': return dateStr.startsWith(currentYearPrefix);
            case 'all': default: return true;
        }
    };

    // Calculate Stats for each unit
    const rankedFleet = useMemo(() => {
        const processed = fleet
            .filter(f => f.status !== 'Pending_Install')
            .map(unit => {
                const details = getMachineData(unit.id);
                let relevantRecords = [];
                let totalVolume = 0;

                // Total Volume Calculation
                if (timeRange === 'all') {
                    // For "All", trust the unit's totalRecoveredAmount property for speed/accuracy
                    // But for Peak calculation, we still need to scan details.daily
                    totalVolume = unit.totalRecoveredAmount;
                    relevantRecords = details.daily; 
                } else if (timeRange === 'today') {
                    const todayStr = new Date().toISOString().split('T')[0];
                    relevantRecords = details.daily.filter(d => d.date === todayStr);
                    totalVolume = relevantRecords.reduce((acc, curr) => acc + curr.recoveredLiters, 0);
                } else {
                    relevantRecords = details.daily.filter(d => getDateFilter(d.date));
                    totalVolume = relevantRecords.reduce((acc, curr) => acc + curr.recoveredLiters, 0);
                }

                // Peak Metric Calculation
                let peakValue = 0;
                let peakLabel = '-';

                if (relevantRecords.length > 0) {
                    if (peakMetric === 'day' || timeRange === 'today') {
                        // Find max daily
                        let maxVal = 0;
                        let maxDate = '';
                        for (const r of relevantRecords) {
                            if (r.recoveredLiters > maxVal) {
                                maxVal = r.recoveredLiters;
                                maxDate = r.date;
                            }
                        }
                        peakValue = maxVal;
                        peakLabel = timeRange === 'today' ? 'Today' : maxDate;
                    } else if (peakMetric === 'month') {
                        const monthlyAgg: Record<string, number> = {};
                        relevantRecords.forEach(r => {
                            const m = r.date.substring(0, 7);
                            monthlyAgg[m] = (monthlyAgg[m] || 0) + r.recoveredLiters;
                        });
                        let maxM = '';
                        let maxV = 0;
                        Object.entries(monthlyAgg).forEach(([m, v]) => { if (v > maxV) { maxV = v; maxM = m; } });
                        peakValue = maxV;
                        peakLabel = maxM;
                    } else if (peakMetric === 'year') {
                        const yearlyAgg: Record<string, number> = {};
                        relevantRecords.forEach(r => {
                            const y = r.date.substring(0, 4);
                            yearlyAgg[y] = (yearlyAgg[y] || 0) + r.recoveredLiters;
                        });
                        let maxY = '';
                        let maxV = 0;
                        Object.entries(yearlyAgg).forEach(([y, v]) => { if (v > maxV) { maxV = v; maxY = y; } });
                        peakValue = maxV;
                        peakLabel = maxY;
                    }
                }

                return {
                    ...unit,
                    computedStats: { totalVolume, peakValue, peakLabel }
                };
            });

        const sorted = processed.sort((a, b) => b.computedStats.totalVolume - a.computedStats.totalVolume);
        
        if (!filterText) return sorted;
        const lowerFilter = filterText.toLowerCase();
        return sorted.filter(u => 
            u.name.toLowerCase().includes(lowerFilter) || 
            u.id.toLowerCase().includes(lowerFilter) ||
            u.city.toLowerCase().includes(lowerFilter)
        );

    }, [fleet, timeRange, peakMetric, filterText]);

    const formatPeakLabel = (label: string) => {
        if (!label || label === '-') return '-';
        if (label === 'Today') return 'Today';
        if (label.length === 10) return formatDateFriendly(label);
        if (label.length === 7) {
            const [y, m] = label.split('-');
            const date = new Date(parseInt(y), parseInt(m)-1);
            return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        }
        return label;
    };

    const getPeakColumnHeader = () => {
        if (timeRange === 'today') return 'Peak Daily (L)';
        switch (peakMetric) {
            case 'day': return 'Best Daily (L)';
            case 'month': return 'Best Month (L)';
            case 'year': return 'Best Year (L)';
            default: return 'Peak (L)';
        }
    };

    const handleTimeRangeChange = (newRange: TimeRange) => {
        setTimeRange(newRange);
        if (newRange === 'today' || newRange === 'month') setPeakMetric('day');
        else if (newRange === 'year' && peakMetric === 'year') setPeakMetric('month');
    };

    const displayFleet = rankedFleet.slice(0, visibleCount);

    return (
        <div className="bg-white dark:bg-scada-800 border border-slate-200 dark:border-scada-700 rounded-3xl overflow-hidden shadow-sm flex flex-col h-full transition-colors">
            {/* Header with Controls */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-scada-700 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-slate-50/50 dark:bg-transparent">
                <div className="flex-1 min-w-[200px]">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide flex items-center gap-2">
                        <Trophy size={16} className="text-amber-500" /> Performance Leaderboard
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Ranking {rankedFleet.length} units based on recovered volume.
                    </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto items-center">
                    <div className="relative w-full sm:w-48">
                        <Search className="absolute left-2.5 top-2 text-slate-400" size={14} />
                        <input 
                            type="text" 
                            placeholder="Filter list..."
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                            className="w-full bg-white dark:bg-scada-900 border border-slate-200 dark:border-scada-600 rounded-lg py-1.5 pl-8 pr-3 text-xs font-medium text-slate-700 dark:text-white focus:border-scada-accent outline-none transition-colors"
                        />
                    </div>

                    <div className="flex gap-3 w-full sm:w-auto justify-end overflow-x-auto pb-1 sm:pb-0">
                        {timeRange !== 'today' && (
                            <div className="flex bg-slate-100 dark:bg-scada-900/50 p-1 rounded-lg border border-slate-200 dark:border-scada-700">
                                <button
                                    onClick={() => setPeakMetric('day')}
                                    className={`px-2 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all ${peakMetric === 'day' ? 'bg-white dark:bg-scada-700 text-scada-accent shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                >
                                    <Activity size={10} /> Daily
                                </button>
                                {(timeRange === 'year' || timeRange === 'all') && (
                                    <button
                                        onClick={() => setPeakMetric('month')}
                                        className={`px-2 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all ${peakMetric === 'month' ? 'bg-white dark:bg-scada-700 text-scada-accent shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                    >
                                        <Calendar size={10} /> Month
                                    </button>
                                )}
                            </div>
                        )}

                        <div className="flex bg-slate-200 dark:bg-scada-900 p-1 rounded-lg flex-shrink-0">
                            {[{ id: 'today', label: 'Today' }, { id: 'month', label: 'Month' }, { id: 'year', label: 'Year' }, { id: 'all', label: 'All' }].map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => handleTimeRangeChange(t.id as TimeRange)}
                                    className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${timeRange === t.id ? 'bg-white dark:bg-scada-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- DESKTOP VIEW (Table) --- */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-scada-900/50 border-b border-slate-200 dark:border-scada-700">
                        <tr>
                            <th className="px-6 py-4 w-16">Rank</th>
                            <th className="px-6 py-4">Machine</th>
                            <th className="px-6 py-4 text-right"><div className="flex items-center justify-end gap-1"><BarChart3 size={12} /> Recovery (L)</div></th>
                            <th className="px-6 py-4 text-right"><div className="flex items-center justify-end gap-1"><Activity size={12} /> {getPeakColumnHeader()}</div></th>
                            <th className="px-6 py-4 text-right"><div className="flex items-center justify-end gap-1"><Calendar size={12} /> Period/Date</div></th>
                            <th className="w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-scada-700">
                        {displayFleet.map((vru, index) => {
                            const rank = index + 1;
                            const { totalVolume, peakValue, peakLabel } = vru.computedStats;
                            return (
                                <tr key={vru.id} className="bg-white dark:bg-scada-800 hover:bg-slate-50 dark:hover:bg-scada-700/50 transition-colors cursor-pointer group" onClick={() => onSelect(vru.id)}>
                                    <td className="px-6 py-4 font-bold text-base">
                                        {rank === 1 && <Trophy size={20} className="text-amber-500 fill-amber-500/20" />}
                                        {rank === 2 && <Medal size={20} className="text-slate-400 fill-slate-400/20" />}
                                        {rank === 3 && <Medal size={20} className="text-amber-700 dark:text-amber-600 fill-amber-700/20" />}
                                        {rank > 3 && <span className="text-slate-500 dark:text-slate-400 ml-1.5 font-mono">{rank}</span>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-scada-accent transition-colors">{vru.name}</div>
                                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">{vru.id} • {vru.city}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right"><span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-base">{totalVolume.toLocaleString()}</span></td>
                                    <td className="px-6 py-4 text-right"><span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{peakValue.toLocaleString()}</span></td>
                                    <td className="px-6 py-4 text-right font-mono text-slate-500 dark:text-slate-400 text-xs">{formatPeakLabel(peakLabel)}</td>
                                    <td className="px-4 text-right"><ChevronRight size={16} className="text-slate-300 dark:text-slate-600 group-hover:text-scada-accent transition-colors" /></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* --- MOBILE VIEW (Card List) --- */}
            <div className="md:hidden flex flex-col divide-y divide-slate-100 dark:divide-scada-700">
                {displayFleet.map((vru, index) => {
                    const rank = index + 1;
                    const { totalVolume, peakValue } = vru.computedStats;
                    return (
                        <div key={vru.id} onClick={() => onSelect(vru.id)} className="p-4 flex items-center gap-4 active:bg-slate-50 dark:active:bg-scada-700/50">
                            <div className="w-8 flex flex-col items-center justify-center shrink-0">
                                {rank === 1 && <Trophy size={20} className="text-amber-500 fill-amber-500/20" />}
                                {rank === 2 && <Medal size={20} className="text-slate-400 fill-slate-400/20" />}
                                {rank === 3 && <Medal size={20} className="text-amber-700 dark:text-amber-600 fill-amber-700/20" />}
                                {rank > 3 && <span className="text-slate-500 dark:text-slate-400 font-mono font-bold">{rank}</span>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-slate-900 dark:text-white truncate">{vru.name}</div>
                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                    <span className={`w-2 h-2 rounded-full ${vru.status === 'Running' ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                                    <span>{vru.city}</span>
                                    <span>•</span>
                                    <span className="font-mono">{vru.id}</span>
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <div className="font-bold text-slate-900 dark:text-white font-mono">{totalVolume.toLocaleString()} <span className="text-[10px] font-sans text-slate-400">L</span></div>
                                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Peak: {peakValue.toLocaleString()}</div>
                            </div>
                            <ChevronRight size={16} className="text-slate-300 dark:text-slate-600" />
                        </div>
                    );
                })}
            </div>

            {rankedFleet.length === 0 && (
                <div className="px-6 py-12 text-center text-slate-500 italic">No data available for the selected period.</div>
            )}

            {/* Footer / Pagination Control */}
            {rankedFleet.length > 10 && (
                <div className="p-3 border-t border-slate-100 dark:border-scada-700 flex justify-center bg-slate-50/50 dark:bg-transparent">
                    <button 
                        onClick={() => setVisibleCount(prev => prev === 10 ? 50 : 10)}
                        className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-scada-accent dark:text-slate-400 dark:hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-scada-700"
                    >
                        {visibleCount === 10 ? (
                            <>Show All ({rankedFleet.length}) <ChevronDown size={14} /></>
                        ) : (
                            <>Show Less <ChevronUp size={14} /></>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
});
