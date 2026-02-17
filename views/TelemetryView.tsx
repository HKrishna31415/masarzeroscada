
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, Gauge } from '../components/ui';
import { VRU } from '../types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from 'recharts';
import { Activity, Thermometer, Wind, Search, Waves, Server, Terminal } from 'lucide-react';
import { telemetryService, TelemetryData } from '../services/TelemetryService';

// --- SUB-COMPONENT: SIDEBAR LIST (Memoized) ---
const TelemetrySidebar = React.memo(({ 
    units, 
    selectedId, 
    onSelect 
}: { 
    units: VRU[], 
    selectedId: string, 
    onSelect: (id: string) => void 
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredUnits = useMemo(() => {
        if (!searchTerm) return units;
        const lowerTerm = searchTerm.toLowerCase();
        return units.filter(u => 
            u.name.toLowerCase().includes(lowerTerm) || 
            u.id.toLowerCase().includes(lowerTerm)
        );
    }, [units, searchTerm]);

    return (
        <div className="w-full md:w-64 flex-shrink-0 flex flex-col gap-2 bg-white dark:bg-scada-800 border border-slate-200 dark:border-scada-700 rounded-xl overflow-hidden shadow-sm transition-colors h-full">
            <div className="p-4 border-b border-slate-200 dark:border-scada-700 font-bold text-slate-800 dark:text-slate-200">
                <div className="flex justify-between items-center">
                    <span>Active Streams</span>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider">Live</span>
                    </div>
                </div>
                {/* Search Bar */}
                <div className="mt-3 relative">
                    <Search className="absolute left-2 top-2 text-slate-400" size={12} />
                    <input 
                        type="text" 
                        placeholder="Find Unit..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-scada-900 border border-slate-200 dark:border-scada-600 rounded-md py-1.5 pl-7 pr-2 text-xs text-slate-700 dark:text-white outline-none focus:border-scada-accent transition-colors"
                    />
                </div>
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                {filteredUnits.length > 0 ? (
                    filteredUnits.map(unit => (
                        <button
                            key={unit.id}
                            onClick={() => onSelect(unit.id)}
                            className={`w-full text-left px-3 py-2 rounded text-sm transition-colors flex justify-between items-center ${
                                selectedId === unit.id 
                                ? 'bg-scada-accent text-white shadow-sm' 
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-scada-700 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <span className="truncate font-mono text-xs">{unit.id}</span>
                            <span className={`text-[10px] uppercase font-bold ${selectedId === unit.id ? 'text-white/80' : 'text-slate-400'}`}>
                                {unit.name.split(' ')[0]}
                            </span>
                        </button>
                    ))
                ) : (
                    <div className="text-xs text-center text-slate-400 p-4">No matching units found.</div>
                )}
            </div>
        </div>
    );
});

// --- SUB-COMPONENT: LIVE MONITOR (Handles high-freq updates) ---
const TelemetryMonitor = ({ unit }: { unit: VRU }) => {
    const [liveData, setLiveData] = useState<TelemetryData[]>([]);
    const [rawLogs, setRawLogs] = useState<{ts: string, type: 'TX'|'RX', data: string}[]>([]);
    const [connectionStatus, setConnectionStatus] = useState<'Connected' | 'Connecting'>('Connecting');
    const logsEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logs
    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [rawLogs]);

    // Helper to generate fake hex data
    const generateHex = (val: number) => {
        return Math.floor(val).toString(16).toUpperCase().padStart(2, '0');
    };

    useEffect(() => {
        setConnectionStatus('Connecting');
        setLiveData([]);
        setRawLogs([]);

        const handshakeTimeout = setTimeout(() => {
            setConnectionStatus('Connected');
            
            const handleData = (data: TelemetryData) => {
                setLiveData(prev => {
                    const newData = [...prev, data];
                    if (newData.length > 60) return newData.slice(newData.length - 60);
                    return newData;
                });

                const timestamp = new Date(data.timestamp).toISOString().split('T')[1].slice(0, -1);
                const packet = `PKT:${generateHex(data.pressure)}${generateHex(data.flowRate)} FF ${generateHex(data.temperature)} 00 ${generateHex(data.vibration * 10)} CHECKSUM:OK`;
                
                setRawLogs(prev => {
                    const newEntry: {ts: string, type: 'TX'|'RX', data: string} = { ts: timestamp, type: 'RX', data: packet };
                    const newLogs = [...prev, newEntry];
                    if (newLogs.length > 20) return newLogs.slice(newLogs.length - 20);
                    return newLogs;
                });
            };

            telemetryService.subscribe(unit.id, handleData);

            return () => {
                telemetryService.unsubscribe(unit.id, handleData);
            };
        }, 500);

        return () => {
            clearTimeout(handshakeTimeout);
            // Cleanup happens in the handshake inner return or here if component unmounts before timeout
            telemetryService.unsubscribe(unit.id, () => {}); 
        };
    }, [unit.id]);

    // Derived values
    const latest = liveData.length > 0 ? liveData[liveData.length - 1] : null;
    const currentPressure = latest ? latest.pressure : 0;
    const currentFlow = latest ? latest.flowRate : 0;
    const currentTemp = latest ? latest.temperature : 0;
    const currentVib = latest ? latest.vibration : 0;

    return (
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto pb-4 custom-scrollbar min-w-0 h-full">
            {/* Connection Status Header */}
            <div className="flex justify-between items-center bg-white dark:bg-scada-800 p-3 rounded-xl border border-slate-200 dark:border-scada-700 shadow-sm flex-shrink-0">
                <div className="flex items-center gap-3">
                    <Server size={18} className="text-slate-400" />
                    <div>
                        <h2 className="text-sm font-bold text-slate-800 dark:text-white">{unit.name}</h2>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                            <span>{unit.id}</span>
                            <span>|</span>
                            <span className={connectionStatus === 'Connected' ? 'text-emerald-500' : 'text-amber-500'}>
                                SOCKET: {connectionStatus.toUpperCase()}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Last Packet</div>
                    <div className="font-mono text-xs text-slate-600 dark:text-slate-300">
                        {latest ? new Date(latest.timestamp).toLocaleTimeString() : '--:--:--'}
                    </div>
                </div>
            </div>

            {/* Real-time Gauges */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
                <div className="bg-white dark:bg-scada-800 p-4 rounded-xl border border-slate-200 dark:border-scada-700 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10"><Activity size={48} /></div>
                    <Gauge value={Number(currentPressure)} min={0} max={25} label="Inlet Pressure" unit="PSI" color="#14b8a6" />
                    <div className="mt-2 h-1 w-full bg-slate-100 dark:bg-scada-900 rounded overflow-hidden">
                        <div className="h-full bg-teal-500 transition-all duration-300" style={{width: `${(currentPressure/25)*100}%`}}></div>
                    </div>
                </div>
                <div className="bg-white dark:bg-scada-800 p-4 rounded-xl border border-slate-200 dark:border-scada-700 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10"><Wind size={48} /></div>
                    <Gauge value={Number(currentFlow)} min={0} max={60} label="Flow Rate" unit="L/hr" color="#22c55e" />
                    <div className="mt-2 h-1 w-full bg-slate-100 dark:bg-scada-900 rounded overflow-hidden">
                        <div className="h-full bg-emerald-500 transition-all duration-300" style={{width: `${(currentFlow/60)*100}%`}}></div>
                    </div>
                </div>
                <div className="bg-white dark:bg-scada-800 p-4 rounded-xl border border-slate-200 dark:border-scada-700 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10"><Thermometer size={48} /></div>
                    <Gauge value={Number(currentTemp)} min={0} max={80} label="Fluid Temp" unit="°C" color="#f97316" />
                    <div className="mt-2 h-1 w-full bg-slate-100 dark:bg-scada-900 rounded overflow-hidden">
                        <div className="h-full bg-orange-500 transition-all duration-300" style={{width: `${(currentTemp/80)*100}%`}}></div>
                    </div>
                </div>
                <div className="bg-white dark:bg-scada-800 p-4 rounded-xl border border-slate-200 dark:border-scada-700 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10"><Waves size={48} /></div>
                    <div className="text-3xl font-black text-slate-800 dark:text-white mt-4">{currentVib.toFixed(3)}</div>
                    <div className="text-xs text-slate-500 uppercase font-bold mt-1">Vibration</div>
                    <div className="text-[10px] text-slate-400 font-mono mb-2">mm/s RMS</div>
                    <div className="mt-auto h-1 w-full bg-slate-100 dark:bg-scada-900 rounded overflow-hidden">
                        <div className="h-full bg-purple-500 transition-all duration-300" style={{width: `${(currentVib/2)*100}%`}}></div>
                    </div>
                </div>
            </div>

            {/* Primary Chart */}
            <Card title="Live Process Data (60s Window)" className="flex-1 min-h-[300px]">
                <div className="h-full w-full min-h-[250px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <AreaChart data={liveData}>
                            <defs>
                                <linearGradient id="colorPressure" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorFlow" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" vertical={false} />
                            <XAxis 
                                dataKey="timestamp" 
                                stroke="#64748b" 
                                fontSize={10} 
                                tickFormatter={(t) => new Date(t).toLocaleTimeString([], {minute:'2-digit', second:'2-digit'})}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis yAxisId="left" stroke="#14b8a6" fontSize={10} domain={[0, 25]} tickLine={false} axisLine={false} label={{ value: 'Pressure (PSI)', angle: -90, position: 'insideLeft', fill: '#14b8a6', fontSize: 10 }} />
                            <YAxis yAxisId="right" orientation="right" stroke="#22c55e" fontSize={10} domain={[0, 60]} tickLine={false} axisLine={false} label={{ value: 'Flow (L/h)', angle: 90, position: 'insideRight', fill: '#22c55e', fontSize: 10 }} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: 'var(--tooltip-bg, #0f172a)', borderColor: 'var(--tooltip-border, #334155)', color: 'var(--tooltip-text, #fff)', borderRadius: '8px' }}
                                labelFormatter={(t) => new Date(t).toLocaleTimeString()}
                            />
                            <Area yAxisId="left" type="monotone" dataKey="pressure" stroke="#14b8a6" strokeWidth={2} fill="url(#colorPressure)" isAnimationActive={false} />
                            <Area yAxisId="right" type="monotone" dataKey="flowRate" stroke="#22c55e" strokeWidth={2} fill="url(#colorFlow)" isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-shrink-0">
                {/* Protocol Analyzer */}
                <div className="lg:col-span-2 bg-[#0b1121] rounded-xl border border-slate-700 p-0 overflow-hidden flex flex-col h-48 shadow-lg">
                    <div className="flex justify-between items-center px-3 py-1.5 bg-slate-800 border-b border-slate-700">
                        <div className="flex items-center gap-2">
                            <Terminal size={12} className="text-emerald-500" />
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Protocol Analyzer / Modbus RTU</span>
                        </div>
                        <div className="flex gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-red-500/20 border border-red-500/50"></div>
                            <div className="w-2 h-2 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                            <div className="w-2 h-2 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>
                        </div>
                    </div>
                    <div className="flex-1 p-2 overflow-y-auto custom-scrollbar font-mono text-[10px] space-y-1">
                        {rawLogs.map((log, i) => (
                            <div key={i} className="flex gap-2 hover:bg-white/5 px-1 rounded">
                                <span className="text-slate-500 select-none">[{log.ts}]</span>
                                <span className={log.type === 'RX' ? 'text-emerald-400' : 'text-blue-400'}>{log.type}</span>
                                <span className="text-slate-300">{log.data}</span>
                            </div>
                        ))}
                        <div ref={logsEndRef} />
                        {rawLogs.length === 0 && <div className="text-slate-600 italic">Waiting for stream...</div>}
                    </div>
                </div>

                {/* Secondary Chart */}
                <div className="h-48 bg-white dark:bg-scada-800 rounded-xl border border-slate-200 dark:border-scada-700 p-4 shadow-sm flex flex-col">
                    <div className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                        <Thermometer size={12} /> Compressor Temp Trend
                    </div>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <LineChart data={liveData}>
                                <XAxis dataKey="timestamp" hide />
                                <YAxis domain={['auto', 'auto']} hide />
                                <Tooltip contentStyle={{ backgroundColor: 'var(--tooltip-bg, #0f172a)', borderColor: 'var(--tooltip-border, #334155)', borderRadius: '8px', fontSize: '10px' }} />
                                <Line type="monotone" dataKey="temperature" stroke="#f97316" strokeWidth={2} dot={false} isAnimationActive={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MAIN PARENT COMPONENT ---
export const TelemetryView: React.FC<{ fleet: VRU[] }> = ({ fleet }) => {
    const runningUnits = useMemo(() => fleet.filter(v => v.status === 'Running'), [fleet]);
    const [selectedId, setSelectedId] = useState(runningUnits[0]?.id || '');

    const currentUnit = fleet.find(f => f.id === selectedId);

    if (!currentUnit) return <div className="p-10 text-center text-slate-500">No active units available for telemetry.</div>;

    return (
        <div className="flex flex-col md:flex-row h-full md:h-[calc(100vh-8rem)] gap-4 animate-in fade-in duration-500">
            <TelemetrySidebar 
                units={runningUnits} 
                selectedId={selectedId} 
                onSelect={setSelectedId} 
            />
            <TelemetryMonitor unit={currentUnit} />
        </div>
    );
};
