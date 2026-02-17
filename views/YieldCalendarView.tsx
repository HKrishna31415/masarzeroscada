
import * as React from 'react';
import { VRU } from '../types';
import { Card } from '../components/ui';
import { Calendar as CalendarIcon, Filter, ChevronLeft, ChevronRight, MapPin, Activity, Building2, Check, X, Download, FileText, AlertTriangle, Unplug, TrendingDown, ArrowRight, Info, Thermometer, Banknote } from 'lucide-react';
import { getMachineData, TODAY_CUTOFF } from '../data/MachineRepository';
import { t } from '../utils/i18n';
import { exportToCSV } from '../utils/csvExport';

interface YieldCalendarViewProps {
    fleet: VRU[];
    lang: 'en' | 'ar' | 'zh' | 'ko';
}

export const YieldCalendarView: React.FC<YieldCalendarViewProps> = ({ fleet, lang }) => {
    const [selectedStations, setSelectedStations] = React.useState<string[]>([]);
    const [isMultiSelectOpen, setIsMultiSelectOpen] = React.useState(false);
    const [currentDate, setCurrentDate] = React.useState(new Date('2026-01-01')); 
    const [filterRegion, setFilterRegion] = React.useState('All');
    const [filterCity, setFilterCity] = React.useState('All');
    const [filterStatus, setFilterStatus] = React.useState('All');
    
    // Note system
    const [editingNote, setEditingNote] = React.useState<{date: string, text: string} | null>(null);
    const [notes, setNotes] = React.useState<Record<string, string>>({});

    // Impact Analysis State
    const [showImpactModal, setShowImpactModal] = React.useState(false);

    React.useEffect(() => {
        try {
            const saved = localStorage.getItem('masarzero_notes');
            if (saved) setNotes(JSON.parse(saved));
        } catch (e) { console.error('Error loading notes', e); }
    }, []);

    const saveNote = () => {
        if (!editingNote) return;
        const newNotes = { ...notes, [editingNote.date]: editingNote.text };
        setNotes(newNotes);
        localStorage.setItem('masarzero_notes', JSON.stringify(newNotes));
        setEditingNote(null);
    };

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const regions = React.useMemo(() => ['All', ...Array.from(new Set(fleet.map(v => v.region))).sort()], [fleet]);
    const cities = React.useMemo(() => {
        const filtered = filterRegion === 'All' ? fleet : fleet.filter(v => v.region === filterRegion);
        return ['All', ...Array.from(new Set(filtered.map(v => v.city))).sort()];
    }, [fleet, filterRegion]);
    const statuses = ['All', 'Running', 'Stopped', 'Offline', 'Maintenance', 'Pending_Install'];

    const availableStations = React.useMemo(() => {
        return fleet.filter(v => {
            if (filterRegion !== 'All' && v.region !== filterRegion) return false;
            if (filterCity !== 'All' && v.city !== filterCity) return false;
            if (filterStatus !== 'All' && v.status !== filterStatus) return false;
            return true;
        });
    }, [fleet, filterRegion, filterCity, filterStatus]);

    const handleRegionChange = (val: string) => {
        setFilterRegion(val);
        setFilterCity('All'); 
        setSelectedStations([]); 
    };

    const toggleStationSelection = (id: string) => {
        setSelectedStations(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    };

    const dailyYields = React.useMemo(() => {
        let targetStations = selectedStations.length > 0 
            ? availableStations.filter(s => selectedStations.includes(s.id))
            : availableStations;

        if (selectedStations.length === 0 && filterStatus === 'All') {
            targetStations = targetStations.filter(s => s.status !== 'Pending_Install');
        }

        const yields: Record<number, number> = {};
        const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;

        targetStations.forEach(station => {
            const data = getMachineData(station.id);
            data.daily.forEach(record => {
                if (record.date.startsWith(prefix)) {
                    const day = parseInt(record.date.split('-')[2]);
                    yields[day] = (yields[day] || 0) + record.recoveredLiters;
                }
            });
        });

        return yields;
    }, [availableStations, selectedStations, year, month, filterStatus]);

    // Impact Analysis Calculation
    const impactMetrics = React.useMemo(() => {
        if (!showImpactModal) return null;
        
        const cutoffDate = '2025-07-07';
        let postTotal = 0;
        let preTotal = 0; // Comparison baseline: 2025 Jan 1 to July 7
        let postDaysCount = 0; // Cumulative unit-days
        let preDaysCount = 0;

        // Use currently filtered stations to allow regional impact analysis
        const targetStations = selectedStations.length > 0 
            ? availableStations.filter(s => selectedStations.includes(s.id))
            : availableStations.filter(s => s.status !== 'Pending_Install');

        targetStations.forEach(station => {
            const data = getMachineData(station.id);
            data.daily.forEach(d => {
                // Post-Disconnect
                if (d.date > cutoffDate && d.date <= TODAY_CUTOFF) {
                    postTotal += d.recoveredLiters;
                    postDaysCount++;
                } 
                // Pre-Disconnect Baseline (Same Year)
                else if (d.date >= '2025-01-01' && d.date <= cutoffDate) {
                    preTotal += d.recoveredLiters;
                    preDaysCount++;
                }
            });
        });

        const postAvg = postDaysCount > 0 ? postTotal / postDaysCount : 0;
        const preAvg = preDaysCount > 0 ? preTotal / preDaysCount : 0;
        const drop = preAvg > 0 ? ((postAvg - preAvg) / preAvg) * 100 : 0;

        return { postTotal, preTotal, postAvg, preAvg, drop, unitCount: targetStations.length };
    }, [showImpactModal, availableStations, selectedStations]);

    // Calculate Variance Stats
    const monthStats = React.useMemo(() => {
        const values = Object.values(dailyYields) as number[];
        if (values.length === 0) return { max: 1, avg: 0 };
        const sum = values.reduce((a, b) => a + b, 0);
        return {
            max: Math.max(...values),
            avg: sum / values.length
        };
    }, [dailyYields]);

    const getVarianceColor = (val: number) => {
        if (val === 0) return 'bg-slate-300 dark:bg-slate-700'; // No data / zero
        if (monthStats.avg === 0) return 'bg-scada-accent';
        
        const ratio = val / monthStats.avg;
        if (ratio < 0.8) return 'bg-rose-500'; // Critical underperformance
        if (ratio < 0.95) return 'bg-amber-500'; // Warning
        return 'bg-emerald-500'; // Good
    };

    const getDailyYield = (day: number) => (dailyYields[day] || 0).toLocaleString();

    const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const toggleDropdown = () => setIsMultiSelectOpen(!isMultiSelectOpen);

    const handleExport = () => {
        const dataToExport = Object.entries(dailyYields).map(([day, value]) => ({
            Date: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
            'Total Yield (L)': value
        })).sort((a, b) => a.Date.localeCompare(b.Date));
        exportToCSV(dataToExport, `Yield_${year}_${month + 1}_${selectedStations.length > 0 ? 'Custom' : 'All'}`);
    };

    const openNote = (day: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        setEditingNote({ date: dateStr, text: notes[dateStr] || '' });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10" onClick={() => isMultiSelectOpen && setIsMultiSelectOpen(false)}>
            {/* Impact Analysis Modal */}
            {showImpactModal && impactMetrics && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-white dark:bg-scada-800 rounded-2xl shadow-2xl p-0 w-full max-w-lg border border-slate-200 dark:border-scada-700 overflow-hidden">
                        <div className="bg-amber-500 p-6 flex justify-between items-start">
                            <div className="text-white">
                                <h3 className="font-black text-xl flex items-center gap-2 uppercase tracking-wide">
                                    <Unplug size={24}/> 95 Octane Impact
                                </h3>
                                <p className="text-amber-100 text-sm font-medium mt-1">Post-Disconnection Analysis (Since July 7, 2025)</p>
                            </div>
                            <button onClick={() => setShowImpactModal(false)} className="bg-black/20 hover:bg-black/30 text-white p-1.5 rounded-full transition-colors"><X size={20}/></button>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-scada-900/50 rounded-xl border border-slate-100 dark:border-scada-700/50">
                                <div>
                                    <div className="text-xs text-slate-500 uppercase font-bold mb-1">Total Recovered</div>
                                    <div className="text-xs text-slate-400 font-medium">July 8, 2025 — Today</div>
                                </div>
                                <div className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                                    {impactMetrics.postTotal.toLocaleString()} <span className="text-sm text-slate-400">L</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 border border-slate-200 dark:border-scada-700 rounded-lg">
                                    <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Baseline Avg (Pre-Cut)</div>
                                    <div className="text-lg font-bold text-slate-700 dark:text-slate-300">{Math.round(impactMetrics.preAvg).toLocaleString()} <span className="text-xs font-normal">L/day</span></div>
                                </div>
                                <div className="p-3 border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-900/10 rounded-lg">
                                    <div className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-bold mb-1">Current Avg (Post-Cut)</div>
                                    <div className="text-lg font-bold text-amber-700 dark:text-amber-500">{Math.round(impactMetrics.postAvg).toLocaleString()} <span className="text-xs font-normal">L/day</span></div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 text-rose-500 bg-rose-50 dark:bg-rose-900/10 p-3 rounded-lg border border-rose-100 dark:border-rose-900/30">
                                <TrendingDown size={24} />
                                <div>
                                    <div className="text-sm font-bold uppercase">Volume Impact</div>
                                    <div className="text-xs opacity-80">Daily recovery dropped by <span className="font-bold">{Math.abs(impactMetrics.drop).toFixed(1)}%</span> across {impactMetrics.unitCount} active units.</div>
                                </div>
                            </div>

                            {/* Contextual Disclaimer */}
                            <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100 dark:border-blue-900/30">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <Info size={14} className="text-blue-500" />
                                    <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase">Contextual Factors</span>
                                </div>
                                <p className="text-[10px] text-blue-600 dark:text-blue-300/80 leading-relaxed">
                                    While the disconnection of the 95 Octane pipe is a primary factor, variance in recovery rates may also be influenced by:
                                </p>
                                <ul className="mt-1 space-y-1">
                                    <li className="flex items-center gap-2 text-[10px] text-blue-600 dark:text-blue-300">
                                        <Thermometer size={10} /> Seasonal temperature shifts (Winter vs Summer)
                                    </li>
                                    <li className="flex items-center gap-2 text-[10px] text-blue-600 dark:text-blue-300">
                                        <Banknote size={10} /> Fluctuations in total station sales volume
                                    </li>
                                </ul>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-scada-900 border-t border-slate-100 dark:border-scada-700 text-center">
                            <button onClick={() => setShowImpactModal(false)} className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white font-bold uppercase tracking-wider">Close Report</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Note Modal */}
            {editingNote && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-white dark:bg-scada-800 rounded-xl shadow-2xl p-6 w-full max-w-md border border-slate-200 dark:border-scada-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><FileText size={18}/> Note: {editingNote.date}</h3>
                            <button onClick={() => setEditingNote(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-scada-700 rounded"><X size={18}/></button>
                        </div>
                        <textarea 
                            value={editingNote.text}
                            onChange={(e) => setEditingNote({...editingNote, text: e.target.value})}
                            className="w-full h-32 bg-slate-50 dark:bg-scada-900 border border-slate-200 dark:border-scada-600 rounded-lg p-3 text-sm resize-none focus:border-scada-accent outline-none"
                            placeholder="Enter operational notes here (e.g. 'Power outage', 'Maintenance')..."
                            autoFocus
                        />
                        <div className="flex justify-end mt-4 gap-2">
                            <button onClick={() => setEditingNote(null)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancel</button>
                            <button onClick={saveNote} className="px-4 py-2 bg-scada-accent hover:bg-sky-400 text-white rounded-lg text-sm font-bold shadow-md">Save Note</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header Controls */}
            <div className="bg-white dark:bg-scada-800 p-4 rounded-xl border border-slate-200 dark:border-scada-700 flex flex-col gap-4 shadow-sm transition-colors">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <CalendarIcon className="text-scada-accent" size={24} />
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('yieldCalendar', lang)}</h1>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                        {/* 95 Octane Impact Button */}
                        <button 
                            onClick={() => setShowImpactModal(true)} 
                            className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors text-xs font-bold shadow-sm whitespace-nowrap"
                            title="Calculate total recovered after July 7th, 2025"
                        >
                            <Unplug size={14} /> 95 Octane Impact
                        </button>

                        <button onClick={handleExport} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors text-xs font-bold shadow-sm">
                            <Download size={14} /> {t('export', lang)}
                        </button>
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-scada-900 rounded-lg p-1 border border-slate-200 dark:border-scada-700">
                            <button onClick={handlePrevMonth} className="p-1 hover:bg-white dark:hover:bg-scada-800 rounded hover:shadow-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all">
                                <ChevronLeft size={20} className={lang === 'ar' ? 'rotate-180' : ''} />
                            </button>
                            <span className="w-32 text-center font-mono text-sm font-bold text-slate-700 dark:text-slate-200">{monthNames[month]} {year}</span>
                            <button onClick={handleNextMonth} className="p-1 hover:bg-white dark:hover:bg-scada-800 rounded hover:shadow-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all">
                                <ChevronRight size={20} className={lang === 'ar' ? 'rotate-180' : ''} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Advanced Filtering Bar */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-scada-700" onClick={(e) => e.stopPropagation()}>
                    <div className="relative">
                        <MapPin className={`absolute top-2.5 text-slate-400 dark:text-slate-500 ${lang === 'ar' ? 'right-3' : 'left-3'}`} size={16} />
                        <select value={filterRegion} onChange={(e) => handleRegionChange(e.target.value)} className={`w-full bg-slate-50 dark:bg-scada-900 border border-slate-200 dark:border-scada-600 rounded-lg py-2 text-xs font-medium text-slate-700 dark:text-white focus:border-scada-accent outline-none appearance-none cursor-pointer hover:border-slate-300 dark:hover:border-scada-500 transition-colors ${lang === 'ar' ? 'pr-9 pl-4' : 'pl-9 pr-8'}`}>
                            {regions.map(r => <option key={r} value={r}>{r === 'All' ? t('all', lang) : r}</option>)}
                        </select>
                    </div>
                    <div className="relative">
                        <Building2 className={`absolute top-2.5 text-slate-400 dark:text-slate-500 ${lang === 'ar' ? 'right-3' : 'left-3'}`} size={16} />
                        <select value={filterCity} onChange={(e) => { setFilterCity(e.target.value); setSelectedStations([]); }} className={`w-full bg-slate-50 dark:bg-scada-900 border border-slate-200 dark:border-scada-600 rounded-lg py-2 text-xs font-medium text-slate-700 dark:text-white focus:border-scada-accent outline-none appearance-none cursor-pointer hover:border-slate-300 dark:hover:border-scada-500 transition-colors ${lang === 'ar' ? 'pr-9 pl-4' : 'pl-9 pr-8'}`}>
                            {cities.map(c => <option key={c} value={c}>{c === 'All' ? t('all', lang) : c}</option>)}
                        </select>
                    </div>
                    <div className="relative">
                        <Activity className={`absolute top-2.5 text-slate-400 dark:text-slate-500 ${lang === 'ar' ? 'right-3' : 'left-3'}`} size={16} />
                        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setSelectedStations([]); }} className={`w-full bg-slate-50 dark:bg-scada-900 border border-slate-200 dark:border-scada-600 rounded-lg py-2 text-xs font-medium text-slate-700 dark:text-white focus:border-scada-accent outline-none appearance-none cursor-pointer hover:border-slate-300 dark:hover:border-scada-500 transition-colors ${lang === 'ar' ? 'pr-9 pl-4' : 'pl-9 pr-8'}`}>
                            {statuses.map(s => <option key={s} value={s}>{s === 'All' ? t('all', lang) : t(s.toLowerCase() as any, lang)}</option>)}
                        </select>
                    </div>
                    <div className="relative">
                        <div onClick={toggleDropdown} className={`w-full bg-slate-50 dark:bg-scada-900 border border-slate-200 dark:border-scada-600 rounded-lg py-2 text-xs font-medium text-slate-700 dark:text-white focus:border-scada-accent hover:border-slate-300 dark:hover:border-scada-500 transition-colors cursor-pointer flex items-center justify-between relative ${lang === 'ar' ? 'pr-9 pl-4' : 'pl-9 pr-8'}`}>
                             <Filter className={`absolute top-2.5 text-scada-accent ${lang === 'ar' ? 'right-3' : 'left-3'}`} size={16} />
                             <span className="truncate">{selectedStations.length === 0 ? `Aggregate (${availableStations.filter(s => filterStatus === 'All' ? s.status !== 'Pending_Install' : true).length})` : `${selectedStations.length} Units Selected`}</span>
                             <ChevronRight size={14} className={`transform transition-transform ${isMultiSelectOpen ? 'rotate-90' : ''} ${lang === 'ar' ? 'rotate-180' : ''}`} />
                        </div>
                        {isMultiSelectOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-white dark:bg-scada-800 border border-slate-200 dark:border-scada-600 rounded-xl shadow-xl z-50 p-2 space-y-1">
                                <div onClick={() => setSelectedStations([])} className={`p-2 rounded-lg text-xs cursor-pointer flex items-center justify-between ${selectedStations.length === 0 ? 'bg-scada-accent text-white' : 'hover:bg-slate-100 dark:hover:bg-scada-700 text-slate-700 dark:text-slate-300'}`}><span>All Matching Active Units</span>{selectedStations.length === 0 && <Check size={14} />}</div>
                                <div className="h-px bg-slate-100 dark:bg-scada-700 my-1"></div>
                                {availableStations.filter(s => filterStatus === 'All' ? s.status !== 'Pending_Install' : true).map(vru => {
                                    const isSelected = selectedStations.includes(vru.id);
                                    return (
                                        <div key={vru.id} onClick={() => toggleStationSelection(vru.id)} className={`p-2 rounded-lg text-xs cursor-pointer flex items-center justify-between group ${isSelected ? 'bg-blue-50 dark:bg-scada-700 text-scada-accent' : 'hover:bg-slate-100 dark:hover:bg-scada-700 text-slate-700 dark:text-slate-300'}`}>
                                            <div className="flex flex-col"><span className="font-bold">{vru.name}</span><span className="text-[10px] opacity-70">{vru.id}</span></div>
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-scada-accent border-scada-accent' : 'border-slate-300 dark:border-slate-500'}`}>{isSelected && <Check size={12} className="text-white" />}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Calendar Grid */}
            <Card className="min-h-[600px] p-0 overflow-hidden border border-slate-200 dark:border-scada-700 shadow-sm">
                <div className="grid grid-cols-7 border-b border-slate-200 dark:border-scada-700 bg-slate-50 dark:bg-scada-900">
                    {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                        <div key={day} className="py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider">{day}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 auto-rows-fr bg-white dark:bg-scada-800">
                    {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} className="min-h-[120px] bg-slate-50/50 dark:bg-scada-900/30 border-r border-b border-slate-100 dark:border-scada-700/50"></div>)}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const isToday = new Date(TODAY_CUTOFF).getDate() === day && new Date(TODAY_CUTOFF).getMonth() === month && new Date(TODAY_CUTOFF).getFullYear() === year;
                        const yieldVal = dailyYields[day] || 0;
                        const percent = monthStats.max > 0 ? (yieldVal / monthStats.max) * 100 : 0;
                        const varianceColor = getVarianceColor(yieldVal);
                        const hasNote = notes[dateStr];

                        return (
                            <div 
                                key={day} 
                                onClick={() => openNote(day)}
                                className={`min-h-[120px] p-3 border-r border-b border-slate-100 dark:border-scada-700/50 relative group transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-scada-700/30 ${isToday ? 'bg-blue-50/50 dark:bg-scada-accent/5' : ''}`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className={`text-sm font-bold mb-2 ${isToday ? 'text-scada-accent' : 'text-slate-400 dark:text-slate-500'}`}>{day}</div>
                                    {hasNote && <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" title="Has Note"></div>}
                                </div>
                                {yieldVal > 0 ? (
                                    <div className="mt-4 animate-in fade-in zoom-in duration-300">
                                        <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">Yield</div>
                                        <div className="text-lg font-black text-slate-800 dark:text-white tracking-tight group-hover:text-scada-accent transition-colors">{yieldVal.toLocaleString()}</div>
                                        <div className="h-1.5 w-full bg-slate-100 dark:bg-scada-900 rounded-full mt-2 overflow-hidden">
                                            <div className={`h-full ${varianceColor} transition-all duration-700`} style={{ width: `${Math.max(percent, 5)}%` }}></div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-8 text-center text-[10px] text-slate-300 dark:text-slate-600 font-mono">-</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </Card>
            
            {/* Legend */}
            <div className="flex gap-6 justify-center text-xs text-slate-500">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-emerald-500"></div> Good (&gt;95% Avg)</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-amber-500"></div> Warning (&lt;95% Avg)</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-rose-500"></div> Critical (&lt;80% Avg)</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-amber-500 rounded-full"></div> Note Attached</div>
            </div>
        </div>
    );
};
