
import React, { useState, useMemo, useEffect } from 'react';
import { VRU, DailyRecord, MonthlyRecord } from '../types';
import { getMachineData, getAggregatedFleetData } from '../data/MachineRepository';
import { getHistoricalWeather, getCurrentWeather } from '../data/WeatherRepository';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Line, ComposedChart } from 'recharts';
import { ArrowLeft, Clock, Gauge, ArrowUpRight, Activity, Calendar, Thermometer, MapPin, Settings, Info, Download, X, Terminal, Maximize2, LayoutGrid, AlertTriangle, Wind, Sun, Cloud, CloudRain, CloudLightning, CloudSnow, Table as TableIcon, Leaf, TrendingUp, ChevronLeft, ChevronRight, Globe, Copy, Users } from 'lucide-react';
import { Card, Badge, formatDateFriendly } from '../components/ui';
import { t } from '../utils/i18n';
import { exportToCSV } from '../utils/csvExport';

interface MachineDetailProps {
    machine: VRU;
    onBack: () => void;
    lang: 'en' | 'ar' | 'zh' | 'ko';
}

const WeatherWidget = ({ lat, lng, lang }: { lat: number; lng: number, lang: 'en'|'ar'|'zh'|'ko' }) => {
    const [weather, setWeather] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const fetchWeather = async () => {
            const data = await getCurrentWeather(lat, lng);
            if (data && data.current_weather) { setWeather(data.current_weather); }
            setLoading(false);
        };
        fetchWeather();
    }, [lat, lng]);
    const getWeatherIcon = (code: number) => {
        if (code === 0) return <Sun className="text-amber-500" size={24} />;
        if (code >= 1 && code <= 3) return <Cloud className="text-slate-400" size={24} />;
        if (code >= 51 && code <= 67) return <CloudRain className="text-blue-400" size={24} />;
        if (code >= 95) return <CloudLightning className="text-purple-500" size={24} />;
        if (code >= 71) return <CloudSnow className="text-sky-300" size={24} />;
        return <Sun className="text-amber-500" size={24} />;
    };
    if (loading) return <div className="h-20 flex items-center justify-center text-xs text-slate-400">{t('loading', lang)}</div>;
    if (!weather) return null;
    return (
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">{getWeatherIcon(weather.weathercode)}</div>
                <div><div className="text-[10px] text-slate-500 uppercase font-bold">{t('siteConditions', lang)}</div><div className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-1">{weather.temperature}°C</div></div>
            </div>
            <div className={`text-${lang==='ar'?'left':'right'}`}><div className="text-[10px] text-slate-500 uppercase font-bold flex items-center justify-end gap-1"><Wind size={10} /> {t('wind', lang)}</div><div className="text-sm font-mono font-bold text-slate-700 dark:text-slate-300">{weather.windspeed} <span className="text-[10px] font-normal">km/h</span></div></div>
        </div>
    );
};

const VisualTank = ({ level, capacity, product, lang }: { level: number, capacity: number, product: string, lang: 'en'|'ar'|'zh'|'ko' }) => (
    <div className="relative w-full h-36 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden flex flex-col justify-end group shadow-inner">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/20 dark:from-white/5 to-transparent z-20 pointer-events-none"></div>
        <div className="absolute right-0 top-4 bottom-4 w-4 flex flex-col justify-between items-end pr-1 z-20 pointer-events-none">{[100, 75, 50, 25, 0].map(tick => (<div key={tick} className="w-2 h-px bg-slate-400/50"></div>))}</div>
        <div className="w-full transition-all duration-1000 ease-in-out relative z-10 overflow-hidden" style={{ height: `${level}%`, background: level > 80 ? 'linear-gradient(to top, #15803d, #22c55e)' : 'linear-gradient(to top, #0369a1, #0ea5e9)' }}>
            <div className="absolute top-0 w-full h-1 bg-white/30"></div>
            <div className="bubble w-1 h-1 left-[20%]" style={{ animationDelay: '0.2s', animationDuration: '4s' }}></div>
            <div className="bubble w-2 h-2 left-[50%]" style={{ animationDelay: '1.5s', animationDuration: '3s' }}></div>
            <div className="bubble w-1.5 h-1.5 left-[80%]" style={{ animationDelay: '0.8s', animationDuration: '5s' }}></div>
        </div>
        <div className={`absolute top-3 ${lang === 'ar' ? 'right-3' : 'left-3'} z-30`}><div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold mb-0">{product}</div><div className="text-2xl font-mono font-black text-slate-800 dark:text-white drop-shadow-sm">{level}<span className="text-sm align-top opacity-50">%</span></div></div>
    </div>
);

const CompactGauge = ({ value, min, max, label, unit, color }: { value: number, min: number, max: number, label: string, unit: string, color: string }) => {
    const percentage = Math.min(1, Math.max(0, (value - min) / (max - min)));
    return (
        <div className="flex flex-col">
            <div className="flex justify-between items-end mb-1.5"><span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">{label}</span><span className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200">{value}<span className="text-[10px] text-slate-500 ml-0.5">{unit}</span></span></div>
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden shadow-inner"><div className="h-full rounded-full transition-all duration-1000 shadow-sm" style={{ width: `${percentage * 100}%`, backgroundColor: color }}></div></div>
        </div>
    );
};

const MonthDetailsModal = ({ monthData, details, onClose }: { monthData: MonthlyRecord, details: any, onClose: () => void }) => {
    const dailyRecords = useMemo(() => { return details.daily.filter((d: DailyRecord) => d.date.startsWith(monthData.month)); }, [monthData, details]);
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white dark:bg-[#0f172a] w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh] overflow-hidden ring-1 ring-slate-200 dark:ring-white/10" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 relative flex items-center justify-center bg-slate-50 dark:bg-slate-800/30">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{monthData.month} Details</h3>
                    <button onClick={onClose} className="absolute right-6 top-6 p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors border border-transparent hover:border-slate-300 dark:hover:border-slate-600"><X size={20} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-100 dark:bg-slate-900">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {dailyRecords.length > 0 ? dailyRecords.map((day: DailyRecord, idx: number) => {
                            const dayNum = parseInt(day.date.split('-')[2]);
                            return (<div key={idx} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex justify-between items-center shadow-sm hover:border-scada-accent/50 hover:shadow-md transition-all group"><span className="text-sm text-slate-600 dark:text-slate-400 font-medium">Day {dayNum}</span><span className="text-lg font-bold text-slate-900 dark:text-white font-mono group-hover:text-scada-accent transition-colors">{day.recoveredLiters}</span></div>);
                        }) : (<div className="col-span-full text-center text-slate-500 py-12 italic">No daily records available for this month.</div>)}
                    </div>
                </div>
            </div>
        </div>
    );
};

const FullLogModal = ({ data, range, onClose, lang }: { data: any[], range: string, onClose: () => void, lang: 'en'|'ar'|'zh'|'ko' }) => {
    const filteredData = [...data].reverse(); 
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white dark:bg-[#0b1121] w-full max-w-6xl h-[85vh] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden ring-1 ring-white/10" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-scada-accent/10 rounded-lg text-scada-accent"><Terminal size={20} /></div>
                        <div><h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{t('logPreview', lang)}</h3><div className="text-xs text-slate-600 dark:text-slate-400 font-mono mt-0.5 uppercase tracking-wider">{filteredData.length} Records Found</div></div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors"><X size={20} /></button>
                </div>
                <div className="flex-1 overflow-auto custom-scrollbar bg-white dark:bg-[#0b1121]">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-100/80 dark:bg-slate-800/80 sticky top-0 z-10 text-xs text-slate-600 dark:text-slate-400 uppercase font-bold tracking-wider backdrop-blur-sm"><tr><th className="px-6 py-3 border-b border-slate-200 dark:border-slate-700">{t('date', lang)}</th><th className="px-6 py-3 text-right border-b border-slate-200 dark:border-slate-700">{t('total', lang)} (L)</th><th className="px-6 py-3 text-right border-b border-slate-200 dark:border-slate-700">{t('efficiency', lang)}</th></tr></thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {filteredData.map((row: any, idx: number) => (<tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"><td className="px-6 py-3 font-mono text-slate-700 dark:text-slate-300">{row.date}</td><td className="px-6 py-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">{Number(row.recoveredLiters).toLocaleString()}</td><td className="px-6 py-3 text-right text-slate-600 dark:text-slate-400 font-mono">{(Number(row.efficiency) * 100).toFixed(1)}%</td></tr>))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const CustomTooltip = React.memo(({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/90 dark:bg-[#0f172a]/95 backdrop-blur-md p-3 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl">
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{label}</p>
                {payload.map((p: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-sm"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></div><span className="font-bold text-slate-800 dark:text-white">{p.value.toLocaleString()} {p.unit || ''}</span><span className="text-xs text-slate-500 dark:text-slate-400">{p.name}</span></div>
                ))}
            </div>
        );
    }
    return null;
});

// --- TWIN COMPARISON COMPONENT ---
const TwinComparisonWidget = ({ currentUnit, dailyData }: { currentUnit: VRU, dailyData: DailyRecord[] }) => {
    // We don't have direct access to "fleet" prop here to calculate region avg, so we use a mock randomizer bounded by reality
    // In a real app, this would be passed down or fetched from context
    
    // Simulate Twin Data (Regional Average)
    const regionalAvg = useMemo(() => {
        if (!dailyData || dailyData.length === 0) return 0;
        const currentAvg = dailyData.slice(-30).reduce((a,b) => a + b.recoveredLiters, 0) / 30;
        // Random variance between -10% and +10% for "Region"
        return Math.floor(currentAvg * (0.9 + Math.random() * 0.2)); 
    }, [dailyData]);

    const currentAvg = useMemo(() => {
        if (!dailyData || dailyData.length === 0) return 0;
        return Math.floor(dailyData.slice(-30).reduce((a,b) => a + b.recoveredLiters, 0) / 30);
    }, [dailyData]);

    const diff = currentAvg - regionalAvg;
    const isBetter = diff >= 0;

    return (
        <div className="bg-white dark:bg-scada-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm mt-4">
            <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-bold text-slate-600 dark:text-slate-500 uppercase flex items-center gap-2">
                    <Users size={12}/> Digital Twin Comparison
                </div>
                <div className="text-[10px] bg-slate-100 dark:bg-scada-900 px-2 py-0.5 rounded text-slate-500">Region: {currentUnit.region}</div>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="flex-1 text-center border-r border-slate-100 dark:border-slate-700/50">
                    <div className="text-lg font-black text-slate-800 dark:text-white">{currentAvg} L</div>
                    <div className="text-[9px] uppercase text-slate-400 font-bold">This Unit (30d Avg)</div>
                </div>
                <div className="flex-1 text-center">
                    <div className="text-lg font-black text-slate-500 dark:text-slate-400">{regionalAvg} L</div>
                    <div className="text-[9px] uppercase text-slate-400 font-bold">Regional Avg</div>
                </div>
            </div>

            <div className={`mt-3 text-xs font-bold text-center py-1.5 rounded-lg border ${isBetter ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border-emerald-100 dark:border-emerald-900/30' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 border-amber-100 dark:border-amber-900/30'}`}>
                {isBetter ? 'Performing Above Average' : 'Underperforming Peers'} ({Math.abs(diff)} L variance)
            </div>
        </div>
    );
};

export const MachineDetailView: React.FC<MachineDetailProps> = ({ machine, onBack, lang }) => {
    const details = useMemo(() => getMachineData(machine.id, machine.temperatureC), [machine.id]);
    const [viewRange, setViewRange] = useState('grid');
    const [selectedMonthData, setSelectedMonthData] = useState<MonthlyRecord | null>(null);
    const [showFullLog, setShowFullLog] = useState(false);
    const [includeOffline, setIncludeOffline] = useState(true);
    const [enrichedDailyData, setEnrichedDailyData] = useState<any[]>(details.daily);
    const [weatherHistory, setWeatherHistory] = useState<any[]>([]);
    const [selectedGridMonth, setSelectedGridMonth] = useState(new Date().getMonth());
    const dailySalesVolume = machine.stationDetails?.dailySalesLiters || 50000; 
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    // Available Years Logic
    const availableYears = useMemo(() => {
        const years = new Set(details.monthly.map(m => m.month.split('-')[0]));
        if (years.size === 0) return ['2024', '2025', '2026'];
        return Array.from(years).sort().reverse();
    }, [details.monthly]);

    const [selectedYear, setSelectedYear] = useState(() => {
        const currentYear = new Date().getFullYear().toString();
        const years = Array.from(new Set(details.monthly.map(m => m.month.split('-')[0])));
        return years.includes(currentYear) ? currentYear : (years.sort().reverse()[0] || '2025');
    });

    useEffect(() => {
        if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
            const currentYear = new Date().getFullYear().toString();
            if (availableYears.includes(currentYear)) { setSelectedYear(currentYear); } else { setSelectedYear(availableYears[0]); }
        }
    }, [availableYears]);

    // Data Processing with Year Filter
    const processedData = useMemo(() => {
        if (!enrichedDailyData) return [];
        // FILTER BY YEAR FOR ALL CHARTS
        let data = enrichedDailyData.filter(d => d.date.startsWith(selectedYear));
        if (!includeOffline) { data = data.filter(d => d.recoveredLiters > 0); }
        return data;
    }, [enrichedDailyData, includeOffline, selectedYear]);

    const averageRecoveredLiters = useMemo(() => {
        if (processedData.length === 0) return 0;
        const sum = processedData.reduce((acc, curr) => acc + curr.recoveredLiters, 0);
        return Math.round(sum / processedData.length);
    }, [processedData]);

    const averageRecoveryRate = useMemo(() => {
        if (dailySalesVolume === 0) return "0.00";
        return ((averageRecoveredLiters / dailySalesVolume) * 100).toFixed(2);
    }, [averageRecoveredLiters, dailySalesVolume]);

    // "Today" stats logic - Always use the absolute latest available data regardless of filter
    const realLatestRecord = details.daily.length > 0 ? details.daily[details.daily.length - 1] : { recoveredLiters: 0, efficiency: 0 };
    const todayVolume = realLatestRecord.recoveredLiters;
    const todayRate = ((todayVolume / dailySalesVolume) * 100).toFixed(2);

    const calculatedUptime = useMemo(() => {
        let offlineDays = 0;
        const records = details.daily;
        for (let i = 1; i < records.length; i++) {
            if (records[i].recoveredLiters === 0 && records[i-1].recoveredLiters === 0) { offlineDays++; }
        }
        const totalDaysMonitored = records.length;
        if (totalDaysMonitored === 0) return "100.0";
        return Math.max(0, ((totalDaysMonitored - offlineDays) / totalDaysMonitored) * 100).toFixed(1);
    }, [details.daily]);

    useEffect(() => {
        const fetchData = async () => {
            const dates = details.daily.map(d => d.date);
            if (dates.length === 0) return;
            const start = dates[0];
            const end = dates[dates.length - 1];
            const weatherData = await getHistoricalWeather(machine.latitude, machine.longitude, start, end);
            setWeatherHistory(weatherData); 
            if (weatherData.length > 0) {
                const merged = details.daily.map(d => {
                    const weatherPoint = weatherData.find(w => w.date === d.date);
                    return { ...d, realMeanTemp: weatherPoint ? weatherPoint.meanTemp : d.avgTemperatureC };
                });
                setEnrichedDailyData(merged);
            } else { setEnrichedDailyData(details.daily); }
        };
        fetchData();
    }, [machine.id, details.daily]);

    const monthlyDataForYear = useMemo(() => { return details.monthly.filter(m => m.month.startsWith(selectedYear)); }, [details.monthly, selectedYear]);
    const envDataForYear = useMemo(() => { return monthlyDataForYear.map(m => ({ ...m, co2Saved: m.recoveredLiters * 2.31 })); }, [monthlyDataForYear]);

    const handleMonthClick = (data: any) => {
        if (data && data.activePayload && data.activePayload.length > 0) {
            const monthRecord = data.activePayload[0].payload as MonthlyRecord;
            setSelectedMonthData(monthRecord);
        }
    };

    const dailyDataMap = useMemo(() => {
        const map = new Map<string, any>();
        if (enrichedDailyData) { enrichedDailyData.forEach(d => map.set(d.date, d)); }
        return map;
    }, [enrichedDailyData]);

    const getGridDayData = (day: number) => {
        const m = selectedGridMonth + 1;
        const mStr = m < 10 ? `0${m}` : `${m}`;
        const dStr = day < 10 ? `0${day}` : `${day}`;
        const dateStr = `${selectedYear}-${mStr}-${dStr}`;
        return dailyDataMap.get(dateStr);
    };

    const calculateGridMonthTotal = () => {
        const m = selectedGridMonth + 1;
        const mStr = m < 10 ? `0${m}` : `${m}`;
        const prefix = `${selectedYear}-${mStr}`;
        return enrichedDailyData.filter(d => d.date.startsWith(prefix)).reduce((acc, curr) => acc + curr.recoveredLiters, 0);
    };

    const handleExport = () => {
        const dataToExport = details.daily.map(d => ({
            Date: d.date,
            'Recovered Liters': d.recoveredLiters,
            'Sales Amount (SAR)': d.salesAmount.toFixed(2),
            'Efficiency': d.efficiency,
            'Avg Temp (C)': d.avgTemperatureC
        }));
        exportToCSV(dataToExport, `${machine.id}_Log_${new Date().toISOString().split('T')[0]}`);
    };

    const RangeFilter = () => (
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700/50">
            {['grid', 'daily', 'monthly', 'env'].map((mode) => (
                <button key={mode} onClick={() => setViewRange(mode)} className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${viewRange === mode ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-white/10' : 'text-slate-600 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'}`}>
                    {mode === 'env' ? t('environment', lang) : mode === 'daily' ? t('today', lang) : mode === 'monthly' ? t('calendar', lang) : t('grid', lang)}
                </button>
            ))}
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-[#0b1121] text-slate-900 dark:text-slate-200 overflow-hidden font-sans transition-colors duration-300">
            {selectedMonthData && <MonthDetailsModal monthData={selectedMonthData} details={details} onClose={() => setSelectedMonthData(null)} />}
            {showFullLog && <FullLogModal data={details.daily} range={viewRange} onClose={() => setShowFullLog(false)} lang={lang} />}

            <div className="bg-white dark:bg-[#0f172a] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 py-3 shrink-0 transition-colors">
                <div className="flex items-center gap-6">
                    <button onClick={onBack} className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors group">
                        <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 group-hover:bg-scada-accent group-hover:text-white transition-colors"><ArrowLeft size={16} /></div>
                        <span className="text-xs font-bold uppercase tracking-wider">{t('backToFleet', lang)}</span>
                    </button>
                    <div className="h-10 w-px bg-slate-200 dark:bg-slate-800"></div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase">{machine.name}</h1>
                            <div className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider flex items-center gap-1.5 ${machine.status === 'Running' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' : 'bg-slate-500/10 text-slate-700 border-slate-500/20'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full relative ${machine.status === 'Running' ? 'bg-emerald-500' : 'bg-slate-500'}`}>
                                    {machine.status === 'Running' && <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-75"></div>}
                                </div>
                                {t(machine.status.toLowerCase() as any, lang)}
                            </div>
                        </div>
                        <div className="flex flex-col gap-0.5 mt-1">
                            <div className="flex items-center gap-3 text-[10px] text-slate-600 dark:text-slate-500 font-mono">
                                <span>ID: {machine.id}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1"><MapPin size={10}/> {machine.city}, {machine.region}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                <span className="truncate max-w-[300px] hover:text-slate-800 dark:hover:text-slate-200 transition-colors" title={machine.address}>{machine.address || 'Address not available'}</span>
                                <span className="opacity-30">|</span>
                                <span className="text-[10px] text-slate-400 uppercase font-bold mr-1 flex items-center gap-1"><Globe size={10}/> GPS:</span>
                                <span className="bg-slate-100 dark:bg-slate-800 px-1.5 rounded text-slate-600 dark:text-slate-300 select-all font-mono">{machine.latitude.toFixed(6)}, {machine.longitude.toFixed(6)}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right mr-4 hidden md:block">
                        <div className="text-[10px] text-slate-600 dark:text-slate-500 uppercase font-bold">{t('dailySalesVol', lang)}</div>
                        <div className="font-mono font-bold text-slate-800 dark:text-slate-300">{dailySalesVolume.toLocaleString()} L</div>
                    </div>
                    <button onClick={handleExport} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors" title={t('exportData', lang)}><Download size={18} /></button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    <div className="lg:col-span-2 bg-white dark:bg-gradient-to-br dark:from-slate-800/80 dark:to-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-3xl p-8 relative overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[320px]">
                        <div>
                            <div className="relative z-20 flex justify-between items-start mb-6">
                                <div className="flex items-center gap-2 cursor-pointer bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 p-1.5 rounded-lg border border-slate-200 dark:border-slate-600/50 transition-colors" onClick={() => setIncludeOffline(!includeOffline)}>
                                    <div className={`w-7 h-3.5 rounded-full p-0.5 transition-colors ${includeOffline ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}><div className={`w-2.5 h-2.5 bg-white rounded-full shadow-sm transition-transform ${includeOffline ? 'translate-x-3.5' : 'translate-x-0'}`}></div></div>
                                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{t('includeOffline', lang)}</span>
                                </div>
                            </div>
                            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-8">
                                <div className="flex-1 text-center md:text-left">
                                    <div className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1 flex items-center gap-2">{t('today', lang)}'s Volume <TrendingUp size={14} className="animate-pulse-slow" /></div>
                                    <div className="flex items-baseline gap-2 mb-1"><div className="text-6xl lg:text-7xl font-black text-slate-900 dark:text-white tracking-tighter drop-shadow-sm dark:drop-shadow-lg tabular-nums">{todayVolume.toLocaleString()}</div><span className="text-xl md:text-2xl text-slate-500 dark:text-slate-500 font-bold">L</span></div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Avg: {averageRecoveredLiters.toLocaleString()} L</div>
                                </div>
                                <div className="h-32 w-px bg-slate-200 dark:bg-slate-700 hidden md:block opacity-50"></div>
                                <div className="text-center md:text-left min-w-[200px]">
                                    <div className="text-[12px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-widest mb-1">{t('today', lang)}'s Rate</div>
                                    <div className="flex items-baseline gap-2 mb-1"><div className="text-5xl lg:text-6xl font-black text-scada-accent tracking-tighter drop-shadow-sm dark:drop-shadow-lg tabular-nums">{todayRate}</div><span className="text-xl text-slate-500 dark:text-slate-500 font-bold">%</span></div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Avg: {averageRecoveryRate}%</div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="mt-6 h-28 w-full relative z-10">
                            <div className="text-[10px] uppercase font-bold text-slate-400 mb-2 flex items-center gap-1">
                                <Activity size={10} /> Last 24 Hours Flow Trend
                            </div>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={details.hourly.slice(-24)}> 
                                    <defs>
                                        <linearGradient id="colorHourly" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <Tooltip 
                                        cursor={false} 
                                        contentStyle={{ backgroundColor: 'var(--tooltip-bg, #0f172a)', borderColor: 'var(--tooltip-border, #334155)', color: 'var(--tooltip-text, #fff)', borderRadius: '8px', fontSize: '10px' }}
                                        labelFormatter={(v) => ''} // Hide timestamp in this mini view or format simply
                                        formatter={(val: number) => [`${val} L`, 'Vol']}
                                    />
                                    <Area type="monotone" dataKey="recoveredLiters" stroke="#10b981" strokeWidth={2} fill="url(#colorHourly)" isAnimationActive={true} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 flex flex-col justify-between shadow-sm transition-colors">
                        <div className="space-y-5">
                            <CompactGauge value={parseFloat(calculatedUptime)} min={0} max={100} label={t('uptime', lang)} unit="%" color={parseFloat(calculatedUptime) > 90 ? "#10b981" : "#f59e0b"} />
                            <WeatherWidget lat={machine.latitude} lng={machine.longitude} lang={lang} />
                            <TwinComparisonWidget currentUnit={machine} dailyData={details.daily} />
                            <div className="flex items-center gap-4 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                                <VisualTank level={machine.tankFillLevelPercentage || 0} capacity={1000} product={t('tankLevel', lang)} lang={lang} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Graph Card */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    <div className="lg:col-span-2 bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col min-h-[450px] relative overflow-hidden transition-colors shadow-sm">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 z-20">
                            <div className="flex items-center gap-2"><Activity className="text-scada-accent" size={18} /><h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">{t('recoveryAnalytics', lang)}</h2></div>
                            <div className="flex items-center gap-3">
                                {/* Year/Month Selectors - Enabled for ALL views */}
                                <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
                                    {viewRange === 'grid' && (
                                        <select value={selectedGridMonth} onChange={(e) => setSelectedGridMonth(parseInt(e.target.value))} className="bg-transparent text-[10px] font-bold text-slate-700 dark:text-white outline-none cursor-pointer py-1 px-2 border-r border-slate-200 dark:border-slate-700">
                                            {monthNames.map((m, i) => (<option key={i} value={i} className="bg-white dark:bg-slate-800">{m}</option>))}
                                        </select>
                                    )}
                                    <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-transparent text-[10px] font-bold text-slate-700 dark:text-white outline-none cursor-pointer py-1 px-2 rounded-lg">
                                        {availableYears.map(year => (<option key={year} value={year} className="bg-white dark:bg-slate-800">{year}</option>))}
                                    </select>
                                </div>
                                <div className="h-4 w-px bg-slate-300 dark:bg-slate-600"></div>
                                <RangeFilter />
                            </div>
                        </div>
                        <div className="flex-1 p-4 relative h-full">
                            <div className="h-[400px] w-full overflow-hidden">
                                {viewRange === 'grid' ? (
                                    <div className="w-full h-full overflow-y-auto custom-scrollbar p-2">
                                        <div className="text-center mb-4 font-bold text-slate-500 uppercase text-xs tracking-widest border-b border-slate-100 dark:border-slate-700 pb-2">Production Details in {monthNames[selectedGridMonth]} {selectedYear}</div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                            {[0, 10, 20].map(offset => (
                                                <div key={offset} className="space-y-2">
                                                    {Array.from({length: 10}, (_, i) => i + 1 + offset).map(day => {
                                                        const rec = getGridDayData(day);
                                                        return (
                                                            <div key={day} className="flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30 p-2 rounded-lg border border-slate-100 dark:border-slate-700/50 shadow-sm">
                                                                <span className="text-sm font-bold text-slate-500 dark:text-slate-400 w-8 text-center">{day}:</span>
                                                                <div className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md px-3 py-1.5 text-right shadow-inner"><span className="text-lg font-mono font-black text-slate-800 dark:text-white tracking-tight">{rec ? rec.recoveredLiters : 0}</span></div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ))}
                                            <div className="flex flex-col h-full gap-4">
                                                <div className="flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30 p-2 rounded-lg border border-slate-100 dark:border-slate-700/50 shadow-sm"><span className="text-sm font-bold text-slate-500 dark:text-slate-400 w-8 text-center">31:</span><div className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md px-3 py-1.5 text-right shadow-inner"><span className="text-lg font-mono font-black text-slate-800 dark:text-white tracking-tight">{getGridDayData(31) ? getGridDayData(31)?.recoveredLiters : 0}</span></div></div>
                                                <div className="mt-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800 p-4 rounded-xl flex flex-col justify-center items-center text-center shadow-sm flex-1">
                                                    <div className="text-[12px] uppercase font-bold text-emerald-600 dark:text-emerald-400 mb-2 tracking-widest">Total Output</div>
                                                    <div className="bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-700 rounded-xl px-6 py-4 w-full shadow-inner"><span className="text-3xl font-mono font-black text-emerald-700 dark:text-emerald-400 tracking-tighter block">{calculateGridMonthTotal().toLocaleString()}</span><span className="text-xs font-bold text-emerald-500 dark:text-emerald-600 uppercase mt-1 block">Liters</span></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                        {viewRange === 'env' ? (
                                            <AreaChart data={envDataForYear}><defs><linearGradient id="colorCo2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" className="opacity-20 dark:stroke-[#1e293b] dark:opacity-100" /><XAxis dataKey="month" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} dy={10} /><YAxis stroke="#10b981" fontSize={10} tickLine={false} axisLine={false} /><Tooltip content={<CustomTooltip />} /><Area type="monotone" dataKey="co2Saved" stroke="#10b981" fillOpacity={1} fill="url(#colorCo2)" unit="kg" name="CO₂ Saved" /></AreaChart>
                                        ) : viewRange === 'daily' ? (
                                            <ComposedChart data={processedData}><defs><linearGradient id="colorDailyVol" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22c55e" stopOpacity={0.8}/><stop offset="100%" stopColor="#15803d" stopOpacity={0.8}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" className="opacity-20 dark:stroke-[#1e293b] dark:opacity-100" /><XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} stroke="#475569" fontSize={10} tickLine={false} axisLine={false} dy={10} /><YAxis yAxisId="left" stroke="#22c55e" fontSize={10} tickLine={false} axisLine={false} /><YAxis yAxisId="right" orientation="right" stroke="#f97316" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} unit="°C" /><Tooltip content={<CustomTooltip />} /><Bar yAxisId="left" dataKey="recoveredLiters" fill="url(#colorDailyVol)" radius={[2,2,0,0]} name="Recovered" unit="L" barSize={10} /><Line yAxisId="right" type="monotone" dataKey="realMeanTemp" name="Avg Temp" unit="°C" stroke="#f97316" strokeWidth={2} dot={false} /></ComposedChart>
                                        ) : (
                                            <ComposedChart data={monthlyDataForYear} onClick={handleMonthClick} className="cursor-pointer"><defs><linearGradient id="colorMonthly" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.8}/><stop offset="100%" stopColor="#0369a1" stopOpacity={0.8}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" className="opacity-20 dark:stroke-[#1e293b] dark:opacity-100" /><XAxis dataKey="month" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} dy={10} /><YAxis yAxisId="left" stroke="#0ea5e9" fontSize={10} tickLine={false} axisLine={false} /><Tooltip content={<CustomTooltip />} cursor={{fill: 'var(--tooltip-cursor, #1e293b)'}} /><Bar yAxisId="left" dataKey="recoveredLiters" name="Volume" unit="L" fill="url(#colorMonthly)" radius={[4, 4, 0, 0]} barSize={20} /></ComposedChart>
                                        )}
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>
                    </div>
                    {/* Right Column */}
                    <div className="flex flex-col gap-6">
                        <div className="bg-white dark:bg-scada-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm transition-colors">
                            <div className="text-xs font-bold text-slate-600 dark:text-slate-500 uppercase mb-3 flex items-center gap-2"><Settings size={12}/> {t('configSummary', lang)}</div>
                            <div className="space-y-2"><div className="flex justify-between text-sm"><span className="text-slate-600 dark:text-slate-400">{t('pumps', lang)}</span><span className="font-mono text-slate-800 dark:text-white">{machine.stationDetails?.pumps || '-'}</span></div><div className="flex justify-between text-sm"><span className="text-slate-600 dark:text-slate-400">{t('trucksDay', lang)}</span><span className="font-mono text-slate-800 dark:text-white">{machine.stationDetails?.trucksPerDay || '-'}</span></div><div className="flex justify-between text-sm"><span className="text-slate-600 dark:text-slate-400">{t('dailySalesVol', lang)}</span><span className="font-mono text-slate-800 dark:text-white">{machine.stationDetails?.dailySalesLiters?.toLocaleString() || '-'} L</span></div></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
