
import * as React from 'react';
import { VRU, DailyRecord } from '../types';
import { Card, Badge } from '../components/ui';
import { Search, Server, Activity, MapPin, Building2, LayoutGrid, List, ArrowUpRight, Gauge, Clock, AlertTriangle, Droplet, Download, CheckSquare, Square, ChevronLeft, ChevronRight, Briefcase } from 'lucide-react';
import { getMachineData } from '../data/MachineRepository';
import { t } from '../utils/i18n';
import { exportToCSV } from '../utils/csvExport';
import { ResponsiveContainer, LineChart, Line } from 'recharts';

interface MachinesViewProps {
    fleet: VRU[];
    onSelectMachine: (id: string) => void;
    initialStatus?: string;
    lang: 'en' | 'ar' | 'zh' | 'ko';
}

// Memoized Sparkline to prevent re-render thrashing on list update
const Sparkline = React.memo(({ data }: { data: number[] }) => {
    const chartData = data.map((v, i) => ({ i, v }));
    return (
        <div className="h-8 w-24">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                    <Line type="monotone" dataKey="v" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
});

export const MachinesView: React.FC<MachinesViewProps> = ({ fleet, onSelectMachine, initialStatus, lang }) => {
    const [searchTerm, setSearchTerm] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState(initialStatus || 'All');
    const [regionFilter, setRegionFilter] = React.useState('All');
    const [cityFilter, setCityFilter] = React.useState('All');
    const [viewMode, setViewMode] = React.useState<'list' | 'grid'>('grid'); 
    
    // Pagination State
    const [currentPage, setCurrentPage] = React.useState(1);
    const itemsPerPage = 24;

    // Bulk Selection State
    const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

    React.useEffect(() => {
        if (initialStatus) setStatusFilter(initialStatus);
    }, [initialStatus]);

    // Reset page when filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, regionFilter, cityFilter]);

    const regions = React.useMemo(() => ['All', ...Array.from(new Set(fleet.map(f => f.region))).sort()], [fleet]);
    const cities = React.useMemo(() => {
        const filteredByRegion = regionFilter === 'All' ? fleet : fleet.filter(f => f.region === regionFilter);
        return ['All', ...Array.from(new Set(filteredByRegion.map(f => f.city))).sort()];
    }, [fleet, regionFilter]);

    const filteredFleet = React.useMemo(() => fleet.filter(v => {
        if (v.status === 'Pending_Install') return false;
        const statusMatch = statusFilter === 'All' ? true : v.status === statusFilter;
        return (
            statusMatch &&
            (regionFilter === 'All' || v.region === regionFilter) &&
            (cityFilter === 'All' || v.city === cityFilter) &&
            (v.name.toLowerCase().includes(searchTerm.toLowerCase()) || v.id.toLowerCase().includes(searchTerm.toLowerCase()) || v.city.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }), [fleet, statusFilter, regionFilter, cityFilter, searchTerm]);

    // Apply Pagination
    const paginatedFleet = React.useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredFleet.slice(start, start + itemsPerPage);
    }, [filteredFleet, currentPage]);

    const totalPages = Math.ceil(filteredFleet.length / itemsPerPage);

    // Optimize: Calculate stats ONLY for visible items on the current page
    const fleetStats = React.useMemo(() => {
        const statsMap = new Map<string, { rate: string, total: number, today: number, yesterday: number, change: number, uptime: string, spark: number[] }>();
        const currentYear = new Date().getFullYear().toString();
        
        // Use consistent ISO date strings for comparison
        const todayStr = new Date().toISOString().split('T')[0];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        paginatedFleet.forEach(vru => {
            const data = getMachineData(vru.id);
            const dailyData = data.daily;
            
            // STRICT DATE MATCHING
            const todayRecord = dailyData.find(d => d.date === todayStr);
            const yesterdayRecord = dailyData.find(d => d.date === yesterdayStr);

            const todayRecovery = todayRecord ? todayRecord.recoveredLiters : 0;
            const yesterdayRecovery = yesterdayRecord ? yesterdayRecord.recoveredLiters : 0;
            
            // Calculate percentage change
            let change = 0;
            if (yesterdayRecovery > 0) {
                change = ((todayRecovery - yesterdayRecovery) / yesterdayRecovery) * 100;
            } else if (todayRecovery > 0) {
                change = 100; // From 0 to something is 100% gain effectively
            } else if (yesterdayRecovery === 0 && todayRecovery === 0) {
                change = 0;
            }
            
            // Only need last 7 days for sparkline, no need to filter everything
            const spark = dailyData.slice(-7).map(d => d.recoveredLiters);

            const yearRecords = dailyData.filter(d => d.date.startsWith(currentYear));
            let rate = "0.00";
            let totalRecovered = 0;

            if (yearRecords.length > 0) {
                totalRecovered = yearRecords.reduce((acc, curr) => acc + curr.recoveredLiters, 0);
                const dailySales = vru.stationDetails?.dailySalesLiters || 50000;
                const totalPotential = dailySales * yearRecords.length;
                rate = totalPotential > 0 ? ((totalRecovered / totalPotential) * 100).toFixed(2) : "0.00";
            }

            // Quick Uptime approximation
            const records = dailyData;
            let offlineDays = 0;
            // Only check last 30 days for uptime calculation to speed up
            const recentRecords = records.slice(-30);
            for (let i = 1; i < recentRecords.length; i++) {
                if (recentRecords[i].recoveredLiters === 0 && recentRecords[i-1].recoveredLiters === 0) {
                    offlineDays++;
                }
            }
            const uptime = recentRecords.length > 0 ? Math.max(0, ((recentRecords.length - offlineDays) / recentRecords.length) * 100).toFixed(1) : "100.0";

            statsMap.set(vru.id, { rate, total: totalRecovered, today: todayRecovery, yesterday: yesterdayRecovery, change, uptime, spark });
        });
        return statsMap;
    }, [paginatedFleet]);

    const handleExport = () => {
        // Export ALL filtered items, not just paginated
        const unitsToExport = selectedIds.size > 0 
            ? filteredFleet.filter(u => selectedIds.has(u.id))
            : filteredFleet;

        const todayStr = new Date().toISOString().split('T')[0];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        const dataToExport = unitsToExport.map(v => {
            // For export we might need to fetch data on demand if it wasn't rendered
            const data = getMachineData(v.id);
            const todayRecord = data.daily.find(d => d.date === todayStr);
            const yesterdayRecord = data.daily.find(d => d.date === yesterdayStr);
            
            return {
                ID: v.id,
                Name: v.name,
                Client: v.owner, 
                Region: v.region,
                City: v.city,
                Status: v.status,
                'Today Recovery (L)': todayRecord ? todayRecord.recoveredLiters : 0,
                'Yesterday Recovery (L)': yesterdayRecord ? yesterdayRecord.recoveredLiters : 0,
                'Total Recovery (L)': v.totalRecoveredAmount,
            };
        });
        exportToCSV(dataToExport, `Fleet_Export_${todayStr}`);
    };

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleAll = () => {
        if (selectedIds.size === filteredFleet.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(filteredFleet.map(f => f.id)));
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12">
            {/* Controls */}
            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Server className="text-scada-accent" /> {t('fleetRegistry', lang)}
                        <span className="text-sm font-normal text-slate-500">({filteredFleet.length} units)</span>
                    </h1>
                    <div className="flex gap-2">
                        <button onClick={handleExport} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-bold shadow-sm">
                            <Download size={16} /> {selectedIds.size > 0 ? `Export (${selectedIds.size})` : t('export', lang)}
                        </button>
                        <div className="flex bg-white dark:bg-scada-800 p-1 rounded-lg border border-slate-200 dark:border-scada-700">
                            <button onClick={() => setViewMode('grid')} className={`p-2 rounded transition-all ${viewMode === 'grid' ? 'bg-slate-100 dark:bg-scada-700 text-scada-accent shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`} title={t('grid', lang)}><LayoutGrid size={20} /></button>
                            <button onClick={() => setViewMode('list')} className={`p-2 rounded transition-all ${viewMode === 'list' ? 'bg-slate-100 dark:bg-scada-700 text-scada-accent shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`} title={t('list', lang)}><List size={20} /></button>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-scada-800 p-4 rounded-xl border border-slate-200 dark:border-scada-700 flex flex-col xl:flex-row gap-4 shadow-sm transition-colors">
                    <div className="relative flex-1 min-w-[300px]">
                        <Search className={`absolute top-2.5 text-slate-500 dark:text-slate-500 ${lang === 'ar' ? 'right-3' : 'left-3'}`} size={16} />
                        <input type="text" placeholder={t('searchPlaceholder', lang)} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`w-full bg-slate-50 dark:bg-scada-900 border border-slate-200 dark:border-scada-600 rounded-lg py-2 text-sm text-slate-900 dark:text-white focus:border-scada-accent outline-none placeholder:text-slate-500 transition-colors ${lang === 'ar' ? 'pr-9 pl-4' : 'pl-9 pr-4'}`} />
                    </div>
                    <div className="flex gap-4 flex-wrap">
                        <div className="relative w-40 flex-grow"><MapPin className={`absolute top-2.5 text-slate-500 dark:text-slate-500 ${lang === 'ar' ? 'right-3' : 'left-3'}`} size={16} /><select value={regionFilter} onChange={(e) => { setRegionFilter(e.target.value); setCityFilter('All'); }} className={`w-full bg-slate-50 dark:bg-scada-900 border border-slate-200 dark:border-scada-600 rounded-lg py-2 text-sm text-slate-700 dark:text-white focus:border-scada-accent outline-none appearance-none cursor-pointer hover:border-slate-300 dark:hover:border-scada-500 transition-colors ${lang === 'ar' ? 'pr-9 pl-4' : 'pl-9 pr-8'}`}>{regions.map(r => <option key={r} value={r}>{r === 'All' ? t('all', lang) : r}</option>)}</select></div>
                        <div className="relative w-40 flex-grow"><Building2 className={`absolute top-2.5 text-slate-500 dark:text-slate-500 ${lang === 'ar' ? 'right-3' : 'left-3'}`} size={16} /><select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className={`w-full bg-slate-50 dark:bg-scada-900 border border-slate-200 dark:border-scada-600 rounded-lg py-2 text-sm text-slate-700 dark:text-white focus:border-scada-accent outline-none appearance-none cursor-pointer transition-colors ${lang === 'ar' ? 'pr-9 pl-4' : 'pl-9 pr-8'}`}>{cities.map(c => <option key={c} value={c}>{c === 'All' ? t('all', lang) : c}</option>)}</select></div>
                        <div className="relative w-48 flex-grow"><Activity className={`absolute top-2.5 text-slate-500 dark:text-slate-500 ${lang === 'ar' ? 'right-3' : 'left-3'}`} size={16} /><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`w-full bg-slate-50 dark:bg-scada-900 border border-slate-200 dark:border-scada-600 rounded-lg py-2 text-sm text-slate-700 dark:text-white focus:border-scada-accent outline-none appearance-none cursor-pointer transition-colors ${lang === 'ar' ? 'pr-9 pl-4' : 'pl-9 pr-8'}`}><option value="All">{t('all', lang)}</option><option value="Running">{t('running', lang)}</option><option value="Stopped">{t('stopped', lang)}</option><option value="Offline">{t('offline', lang)}</option><option value="Maintenance">{t('maintenance', lang)}</option></select></div>
                    </div>
                </div>
            </div>

            {/* View Content */}
            {viewMode === 'list' ? (
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-scada-900 text-xs text-slate-600 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-scada-700">
                                <tr>
                                    <th className="px-4 py-3 w-10">
                                        <button onClick={toggleAll} className="text-slate-400 hover:text-slate-600">
                                            {selectedIds.size === filteredFleet.length && filteredFleet.length > 0 ? <CheckSquare size={16}/> : <Square size={16}/>}
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 font-semibold">{t('machineId', lang)}</th>
                                    <th className="px-4 py-3 font-semibold">Account</th>
                                    <th className="px-4 py-3 font-semibold">{t('name', lang)}</th>
                                    <th className="px-4 py-3 font-semibold">{t('location', lang)}</th>
                                    <th className="px-4 py-3 font-semibold">{t('status', lang)}</th>
                                    <th className="px-4 py-3 text-right font-semibold">Trend (7d)</th>
                                    <th className="px-4 py-3 text-right font-semibold">{t('today', lang)}</th>
                                    <th className="px-4 py-3 text-right font-semibold">{t('total', lang)}</th>
                                    <th className="px-4 py-3 text-right font-semibold">{t('recRate', lang)}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-scada-700">
                                {paginatedFleet.map(v => {
                                    const stats = fleetStats.get(v.id) || { today: 0, yesterday: 0, change: 0, total: 0, rate: "0.00", uptime: "0.0", spark: [] };
                                    const isSelected = selectedIds.has(v.id);
                                    return (
                                        <tr key={v.id} onClick={() => onSelectMachine(v.id)} className={`hover:bg-slate-50 dark:hover:bg-scada-700/50 cursor-pointer transition-colors group ${isSelected ? 'bg-blue-50/50 dark:bg-scada-700/80' : 'bg-white dark:bg-scada-800'}`}>
                                            <td className="px-4 py-3 text-center" onClick={(e) => { e.stopPropagation(); toggleSelect(v.id); }}>
                                                {isSelected ? <CheckSquare size={16} className="text-scada-accent"/> : <Square size={16} className="text-slate-300"/>}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-scada-accent font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{v.id}</td>
                                            <td className="px-4 py-3">
                                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${v.owner === 'GECO' ? 'bg-blue-100 text-blue-700 border-blue-200' : v.owner === 'Bapco' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-teal-100 text-teal-700 border-teal-200'}`}>
                                                    {v.owner}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{v.name}</td>
                                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{v.city}, {v.region}</td>
                                            <td className="px-4 py-3">
                                                <Badge variant={v.status === 'Running' ? 'success' : v.status === 'Stopped' ? 'neutral' : v.status === 'Maintenance' ? 'warning' : 'neutral'}>
                                                    {t(v.status.toLowerCase() as any, lang)}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-right"><Sparkline data={stats.spark} /></td>
                                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-800 dark:text-white">{v.status === 'Running' ? `${stats.today.toLocaleString()} L` : '-'}</td>
                                            <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-500">{v.totalRecoveredAmount.toLocaleString()} L</td>
                                            <td className="px-4 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">{v.status === 'Running' ? `${stats.rate}%` : '-'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {paginatedFleet.map(v => {
                        const stats = fleetStats.get(v.id) || { today: 0, yesterday: 0, change: 0, total: 0, rate: "0.00", uptime: "0.0", spark: [] };
                        const hasActiveAlerts = v.alerts.filter(a => !a.acknowledged).length > 0;
                        const statusColor = v.status === 'Running' ? 'bg-emerald-500' : v.status === 'Maintenance' ? 'bg-amber-500' : v.status === 'Stopped' ? 'bg-slate-500' : 'bg-slate-300';
                        
                        return (
                            <div key={v.id} onClick={() => onSelectMachine(v.id)} className="bg-white dark:bg-scada-800 border border-slate-200 dark:border-scada-700 rounded-2xl p-5 hover:shadow-lg hover:border-scada-accent/50 dark:hover:border-scada-accent/50 transition-all duration-300 cursor-pointer group flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className={`w-3 h-3 rounded-full mt-1.5 ${hasActiveAlerts ? 'bg-rose-500 animate-pulse' : statusColor}`}></div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${v.owner === 'GECO' ? 'bg-blue-100 text-blue-700 border-blue-200' : v.owner === 'Bapco' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-teal-100 text-teal-700 border-teal-200'}`}>{v.owner}</span>
                                            <Badge variant={v.status === 'Running' ? 'success' : v.status === 'Stopped' ? 'neutral' : v.status === 'Maintenance' ? 'warning' : 'neutral'}>{t(v.status.toLowerCase() as any, lang)}</Badge>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-slate-800 dark:text-white text-lg leading-tight mb-1 group-hover:text-scada-accent transition-colors">{v.name}</h3>
                                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 mb-4"><span className="font-mono bg-slate-100 dark:bg-scada-900 px-1.5 rounded text-[10px]">{v.id}</span><span>•</span><MapPin size={12} /> {v.city}</div>
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div className="bg-slate-50 dark:bg-scada-900/50 p-2 rounded-lg border border-slate-100 dark:border-scada-700/50">
                                            <div className="flex justify-between items-start">
                                                <div className="text-[10px] text-slate-500 uppercase font-bold mb-0.5">{t('today', lang)}</div>
                                                {v.status === 'Running' && (
                                                    <span className={`text-[9px] font-bold ${stats.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                        {stats.change > 0 ? '+' : ''}{Math.round(stats.change)}%
                                                    </span>
                                                )}
                                            </div>
                                            <div className="font-mono font-bold text-slate-800 dark:text-slate-200 text-lg">
                                                {v.status === 'Running' ? `${stats.today.toLocaleString()} L` : '-'}
                                            </div>
                                            {v.status === 'Running' && (
                                                <div className="text-[9px] text-slate-400 mt-1 flex justify-between border-t border-slate-200 dark:border-scada-700 pt-1">
                                                    <span>{t('yesterday', lang)}:</span>
                                                    <span className="font-mono">{stats.yesterday.toLocaleString()}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="bg-slate-50 dark:bg-scada-900/50 p-2 rounded-lg border border-slate-100 dark:border-scada-700/50 flex flex-col justify-between">
                                            <div>
                                                <div className="text-[10px] text-slate-500 uppercase font-bold mb-0.5">{t('total', lang)}</div>
                                                <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-lg">{v.totalRecoveredAmount.toLocaleString()} L</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="border-t border-slate-100 dark:border-scada-700/50 pt-3 flex justify-between items-center text-xs"><div className="flex items-center gap-1 text-slate-500 dark:text-slate-400"><Clock size={12} /> {t('lastSignal', lang)}: 2m</div><div className="flex items-center gap-1 text-scada-accent font-bold group-hover:translate-x-1 transition-transform">{t('viewDashboard', lang)} <ArrowUpRight size={12} /></div></div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 pt-4 border-t border-slate-200 dark:border-scada-700">
                    <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg bg-slate-100 dark:bg-scada-800 text-slate-600 dark:text-slate-300 disabled:opacity-50 hover:bg-slate-200 dark:hover:bg-scada-700 transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg bg-slate-100 dark:bg-scada-800 text-slate-600 dark:text-slate-300 disabled:opacity-50 hover:bg-slate-200 dark:hover:bg-scada-700 transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}
        </div>
    );
};
