
import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '../components/ui';
import { Shield, Bell, Save, Database, Server, Banknote, Search, Activity, FileText, User, Map, Lock, Info, ExternalLink, HelpCircle, History, Zap, Moon, Sun, AlertTriangle, PlayCircle, Clock, Users, CheckCircle } from 'lucide-react';
import { AppState, VRU, Alert } from '../types';
import { getMachineData, updateMachineConfig } from '../data/MachineRepository';
import { t } from '../utils/i18n';

interface SettingsProps {
    appState: AppState;
    setAppState: React.Dispatch<React.SetStateAction<AppState>>;
    fleet?: VRU[]; 
    onUpdateMachine?: (machine: VRU) => void;
    onInjectAlert?: (machineId: string, alert: Alert) => void;
    addToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const SettingsView: React.FC<SettingsProps> = ({ appState, setAppState, fleet = [], onUpdateMachine, onInjectAlert, addToast }) => {
    const [activeTab, setActiveTab] = useState('general');
    const lang = appState.language;
    
    // Station Config State
    const [selectedStationId, setSelectedStationId] = useState<string>(fleet[0]?.id || '');
    
    const [stationConfig, setStationConfig] = useState(selectedStationId ? getMachineData(selectedStationId).config : { salesPricePerLiter: 0, targetDailyYield: 0, currency: 'SAR', vatRate: 0.15, electricityConsumptionKwPerL: 0.0952, electricityCostPerKw: 0.32 });
    const [selectedStationStatus, setSelectedStationStatus] = useState<string>(fleet[0]?.status || 'Offline');
    const [configSearch, setConfigSearch] = useState('');

    // Simulation State
    const [simTargetId, setSimTargetId] = useState<string>(fleet[0]?.id || '');
    const [simSeverity, setSimSeverity] = useState<'Critical' | 'Warning' | 'Info'>('Critical');
    const [simMessage, setSimMessage] = useState('Pump failure detected in main loop');

    // Shift State
    const [shifts, setShifts] = useState([
        { id: 1, name: 'Morning Shift', start: '06:00', end: '14:00', active: true },
        { id: 2, name: 'Evening Shift', start: '14:00', end: '22:00', active: true },
        { id: 3, name: 'Night Shift', start: '22:00', end: '06:00', active: true },
    ]);

    const rates: Record<string, number> = { 'SAR': 1, 'USD': 0.266, 'CNY': 1.91 };
    const currentRate = rates[appState.currency] || 1;

    const handleStationSelect = (id: string) => {
        setSelectedStationId(id);
        const machine = fleet.find(f => f.id === id);
        const data = getMachineData(id);
        
        if (machine) {
            setSelectedStationStatus(machine.status);
            setStationConfig({
                ...data.config,
                targetDailyYield: machine.stationDetails?.dailySalesLiters || data.config.targetDailyYield
            });
        } else {
            setStationConfig(data.config);
        }
    };

    const handleSaveConfig = () => {
        if (!selectedStationId) return;
        updateMachineConfig(selectedStationId, stationConfig);
        if (onUpdateMachine) {
            const machine = fleet.find(f => f.id === selectedStationId);
            if (machine) {
                const updatedMachine = {
                    ...machine,
                    status: selectedStationStatus as any,
                    stationDetails: {
                        ...machine.stationDetails!,
                        dailySalesLiters: stationConfig.targetDailyYield 
                    }
                };
                onUpdateMachine(updatedMachine);
            }
        }
        const newLogEntry = {
            id: `LOG-${Date.now()}`,
            timestamp: new Date().toISOString(),
            user: appState.user.name,
            action: 'Update Configuration',
            details: `Updated ${selectedStationId}: Price ${stationConfig.salesPricePerLiter} SAR, Throughput ${stationConfig.targetDailyYield}, Status ${selectedStationStatus}`,
            category: 'Config' as const
        };
        setAppState(prev => ({ ...prev, auditLog: [newLogEntry, ...prev.auditLog] }));

        if (addToast) {
            addToast(`Configuration updated for ${selectedStationId}.`, 'success');
        }
    };

    const handleInjectSimulation = () => {
        if (!simTargetId || !onInjectAlert) return;
        
        const machine = fleet.find(f => f.id === simTargetId);
        const newAlert: Alert = {
            id: `SIM-${Date.now()}`,
            severity: simSeverity,
            message: simMessage,
            timestamp: new Date().toISOString(),
            acknowledged: false,
            machineId: simTargetId,
            machineName: machine?.name || simTargetId
        };
        
        onInjectAlert(simTargetId, newAlert);
        setSimMessage(''); // Clear after send
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newName = e.target.value;
        setAppState(prev => ({
            ...prev,
            user: { ...prev.user, name: newName }
        }));
        localStorage.setItem('masarzero_username', newName);
    };

    // Save shifts to local storage
    const handleSaveShifts = () => {
        localStorage.setItem('masarzero_shifts', JSON.stringify(shifts));
        if (addToast) addToast("Shift schedule updated.", "success");
    };

    useEffect(() => {
        const savedShifts = localStorage.getItem('masarzero_shifts');
        if (savedShifts) {
            try {
                setShifts(JSON.parse(savedShifts));
            } catch (e) { console.error("Failed to load shifts"); }
        }
    }, []);

    // Optimization: Memoize the filtered list to avoid re-calculation on every render
    const filteredFleet = useMemo(() => {
        if (!configSearch) return fleet;
        const lowerSearch = configSearch.toLowerCase();
        return fleet.filter(f => f.id.toLowerCase().includes(lowerSearch) || f.name.toLowerCase().includes(lowerSearch));
    }, [fleet, configSearch]);

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 h-full flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-scada-700 pb-4">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('settingsConfig', lang)}</h1>
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold border border-emerald-100 dark:border-emerald-500/20 uppercase tracking-wider">
                    <CheckCircle size={14} />
                    <span>Production GA</span>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-8 min-h-0">
                {/* Sidebar Navigation */}
                <div className="md:col-span-1 space-y-2">
                    <button onClick={() => setActiveTab('general')} className={`w-full text-left px-4 py-2 rounded font-medium transition-colors ${activeTab === 'general' ? 'bg-scada-700 text-white' : 'text-slate-400 hover:bg-scada-800'}`}>{t('general', lang)}</button>
                    <button onClick={() => setActiveTab('stations')} className={`w-full text-left px-4 py-2 rounded font-medium transition-colors ${activeTab === 'stations' ? 'bg-scada-700 text-white' : 'text-slate-400 hover:bg-scada-800'}`}>{t('stationSalesData', lang)}</button>
                    <button onClick={() => setActiveTab('shifts')} className={`w-full text-left px-4 py-2 rounded font-medium transition-colors ${activeTab === 'shifts' ? 'bg-scada-700 text-white' : 'text-slate-400 hover:bg-scada-800'}`}>Shift Management</button>
                    <button onClick={() => setActiveTab('simulation')} className={`w-full text-left px-4 py-2 rounded font-medium transition-colors ${activeTab === 'simulation' ? 'bg-scada-700 text-white' : 'text-slate-400 hover:bg-scada-800'}`}>Simulation & Training</button>
                    <button onClick={() => setActiveTab('about')} className={`w-full text-left px-4 py-2 rounded font-medium transition-colors ${activeTab === 'about' ? 'bg-scada-700 text-white' : 'text-slate-400 hover:bg-scada-800'}`}>{t('aboutLegal', lang)}</button>
                </div>

                {/* Content Area */}
                <div className="md:col-span-3 space-y-6 overflow-y-auto pr-2 pb-6 custom-scrollbar">
                    
                    {activeTab === 'general' && (
                        <>
                            <Card title={t('userProfile', lang)}>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-16 h-16 rounded-full bg-scada-700 flex items-center justify-center text-2xl font-bold text-scada-accent border-2 border-scada-600">
                                        {appState.user.name.substring(0,2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{appState.user.name}</h3>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm">{appState.user.role} • Riyadh HQ</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500 dark:text-slate-400">{t('fullName', lang)}</label>
                                        <input 
                                            type="text" 
                                            value={appState.user.name} 
                                            onChange={handleNameChange}
                                            className="w-full bg-slate-50 dark:bg-scada-900 border border-slate-200 dark:border-scada-600 rounded px-3 py-2 text-slate-900 dark:text-white outline-none focus:border-scada-accent" 
                                        />
                                    </div>
                                    <div className="space-y-1 relative">
                                        <label className="text-xs text-slate-500 dark:text-slate-400">{t('emailAddress', lang)}</label>
                                        <div className="relative">
                                            <input 
                                                type="email" 
                                                value="admin@masarzero.com" 
                                                readOnly
                                                className="w-full bg-slate-50 dark:bg-scada-900/50 border border-slate-200 dark:border-scada-700 rounded px-3 py-2 text-slate-400 outline-none cursor-not-allowed pr-8" 
                                            />
                                            <Lock size={14} className="absolute right-3 top-3 text-slate-500" />
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            <Card title="Interface Preferences">
                                <div className="space-y-4">
                                    {/* Auto Theme Toggle */}
                                    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-scada-700/50">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-100 dark:bg-scada-700 rounded-full">
                                                <Sun size={16} className="text-slate-500 dark:text-slate-300" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Auto-Theme (Day/Night Sync)</div>
                                                <div className="text-[10px] text-slate-500 dark:text-slate-400">Automatically switch to Dark Mode between 6 PM and 6 AM.</div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setAppState(s => ({...s, autoTheme: !s.autoTheme}))}
                                            className={`w-10 h-5 rounded-full relative transition-colors ${appState.autoTheme ? 'bg-scada-accent' : 'bg-slate-300 dark:bg-scada-700'}`}
                                        >
                                            <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${appState.autoTheme ? 'right-1' : 'left-1'}`}></div>
                                        </button>
                                    </div>

                                    {/* Map Visualization Toggle */}
                                    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-scada-700/50">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-100 dark:bg-scada-700 rounded-full">
                                                <Map size={16} className="text-slate-500 dark:text-slate-300" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{t('showPlanned', lang)}</div>
                                                <div className="text-[10px] text-slate-500 dark:text-slate-400">Show units marked as 'Pending_Install' on the map.</div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setAppState(s => ({...s, showPendingUnits: !s.showPendingUnits}))}
                                            className={`w-10 h-5 rounded-full relative transition-colors ${appState.showPendingUnits ? 'bg-scada-accent' : 'bg-slate-300 dark:bg-scada-700'}`}
                                        >
                                            <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${appState.showPendingUnits ? 'right-1' : 'left-1'}`}></div>
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        </>
                    )}

                    {activeTab === 'shifts' && (
                        <Card title="Operator Shift Management">
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                                    <Clock className="text-blue-500" size={24} />
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-800 dark:text-white">Shift Schedules</h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Define operational hours. Metrics on the dashboard will be tagged with the active shift.</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {shifts.map((shift, index) => (
                                        <div key={shift.id} className="flex flex-col sm:flex-row gap-4 p-4 border border-slate-200 dark:border-scada-700 rounded-xl bg-slate-50 dark:bg-scada-900/50">
                                            <div className="flex items-center gap-3 w-40">
                                                <div className="p-2 bg-white dark:bg-scada-800 rounded-full border border-slate-200 dark:border-scada-700 shadow-sm">
                                                    <Users size={16} className="text-scada-accent" />
                                                </div>
                                                <input 
                                                    value={shift.name} 
                                                    onChange={(e) => {
                                                        const newShifts = [...shifts];
                                                        newShifts[index].name = e.target.value;
                                                        setShifts(newShifts);
                                                    }}
                                                    className="bg-transparent font-bold text-sm text-slate-800 dark:text-white w-full outline-none focus:border-b focus:border-scada-accent" 
                                                />
                                            </div>
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className="flex flex-col">
                                                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1">Start Time</label>
                                                    <input 
                                                        type="time" 
                                                        value={shift.start} 
                                                        onChange={(e) => {
                                                            const newShifts = [...shifts];
                                                            newShifts[index].start = e.target.value;
                                                            setShifts(newShifts);
                                                        }}
                                                        className="bg-white dark:bg-scada-800 border border-slate-200 dark:border-scada-700 rounded px-2 py-1.5 text-xs outline-none focus:border-scada-accent"
                                                    />
                                                </div>
                                                <div className="text-slate-400 dark:text-slate-600">-</div>
                                                <div className="flex flex-col">
                                                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1">End Time</label>
                                                    <input 
                                                        type="time" 
                                                        value={shift.end} 
                                                        onChange={(e) => {
                                                            const newShifts = [...shifts];
                                                            newShifts[index].end = e.target.value;
                                                            setShifts(newShifts);
                                                        }}
                                                        className="bg-white dark:bg-scada-800 border border-slate-200 dark:border-scada-700 rounded px-2 py-1.5 text-xs outline-none focus:border-scada-accent"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-end">
                                                <button 
                                                    onClick={() => {
                                                        const newShifts = [...shifts];
                                                        newShifts[index].active = !newShifts[index].active;
                                                        setShifts(newShifts);
                                                    }}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${shift.active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}
                                                >
                                                    {shift.active ? 'Active' : 'Disabled'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-scada-700">
                                    <button 
                                        onClick={handleSaveShifts}
                                        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
                                    >
                                        <Save size={16} /> Save Schedule
                                    </button>
                                </div>
                            </div>
                        </Card>
                    )}

                    {activeTab === 'stations' && (
                        <div className="flex flex-col md:flex-row gap-6 h-[600px]">
                            {/* Station Selector */}
                            <div className="w-full md:w-1/3 flex flex-col gap-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
                                    <input 
                                        type="text" 
                                        placeholder={t('findStation', lang)} 
                                        value={configSearch}
                                        onChange={(e) => setConfigSearch(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-scada-900 border border-slate-200 dark:border-scada-600 rounded pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white focus:border-scada-accent outline-none" 
                                    />
                                </div>
                                <div className="flex-1 bg-white dark:bg-scada-800 border border-slate-200 dark:border-scada-700 rounded-lg overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                    {filteredFleet.map(f => (
                                        <button 
                                            key={f.id} 
                                            onClick={() => handleStationSelect(f.id)}
                                            className={`w-full text-left px-3 py-2 rounded text-xs flex justify-between items-center ${selectedStationId === f.id ? 'bg-scada-accent text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-scada-700 dark:text-slate-400 dark:hover:text-white'}`}
                                        >
                                            <span className="font-bold">{f.name}</span>
                                            <span className="font-mono opacity-70">{f.id}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Config Form */}
                            <Card title={t('salesTargetConfig', lang)} className="flex-1">
                                {selectedStationId ? (
                                    <div className="space-y-6">
                                        <div className="bg-slate-100 dark:bg-scada-900/50 p-4 rounded border border-slate-200 dark:border-scada-700">
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{fleet.find(f => f.id === selectedStationId)?.name}</h3>
                                            <p className="text-xs text-slate-500 font-mono">ID: {selectedStationId} • Location: {fleet.find(f => f.id === selectedStationId)?.city}</p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs uppercase font-bold text-slate-500 flex items-center gap-2">
                                                    <Banknote size={14} /> {t('salesPrice', lang)}
                                                </label>
                                                <div className="flex">
                                                    <input 
                                                        type="number" 
                                                        step="0.01"
                                                        value={(stationConfig.salesPricePerLiter * currentRate).toFixed(2)}
                                                        onChange={(e) => {
                                                            const val = parseFloat(e.target.value);
                                                            setStationConfig({
                                                                ...stationConfig, 
                                                                salesPricePerLiter: val / currentRate
                                                            });
                                                        }}
                                                        className="flex-1 bg-white dark:bg-scada-900 border border-slate-200 dark:border-scada-600 rounded-l px-3 py-2 text-slate-900 dark:text-white outline-none focus:border-scada-accent"
                                                    />
                                                    <span className="bg-slate-100 dark:bg-scada-700 border border-l-0 border-slate-200 dark:border-scada-600 px-3 py-2 text-slate-500 dark:text-slate-300 text-sm rounded-r flex items-center font-bold">
                                                        {appState.currency}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs uppercase font-bold text-slate-500 flex items-center gap-2">
                                                    <Zap size={14} /> Consumption (kWh/L)
                                                </label>
                                                <div className="flex">
                                                    <input 
                                                        type="number" 
                                                        step="0.0001"
                                                        value={stationConfig.electricityConsumptionKwPerL}
                                                        onChange={(e) => setStationConfig({...stationConfig, electricityConsumptionKwPerL: parseFloat(e.target.value)})}
                                                        className="flex-1 bg-white dark:bg-scada-900 border border-slate-200 dark:border-scada-600 rounded px-3 py-2 text-slate-900 dark:text-white outline-none focus:border-scada-accent"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs uppercase font-bold text-slate-500 flex items-center gap-2">
                                                    {/* Dynamic Currency Label */}
                                                    <Zap size={14} /> Elec Cost ({appState.currency}/kWh)
                                                </label>
                                                <div className="flex">
                                                    <input 
                                                        type="number" 
                                                        step="0.01"
                                                        value={stationConfig.electricityCostPerKw}
                                                        onChange={(e) => setStationConfig({...stationConfig, electricityCostPerKw: parseFloat(e.target.value)})}
                                                        className="flex-1 bg-white dark:bg-scada-900 border border-slate-200 dark:border-scada-600 rounded px-3 py-2 text-slate-900 dark:text-white outline-none focus:border-scada-accent"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs uppercase font-bold text-slate-500 flex items-center gap-2">
                                                    <Banknote size={14} /> VAT Rate (%)
                                                </label>
                                                <div className="flex">
                                                    <input 
                                                        type="number" 
                                                        step="1"
                                                        value={(stationConfig.vatRate * 100).toFixed(0)}
                                                        onChange={(e) => setStationConfig({...stationConfig, vatRate: parseFloat(e.target.value) / 100})}
                                                        className="flex-1 bg-white dark:bg-scada-900 border border-slate-200 dark:border-scada-600 rounded px-3 py-2 text-slate-900 dark:text-white outline-none focus:border-scada-accent"
                                                    />
                                                </div>
                                            </div>

                                            <div className="md:col-span-2 space-y-2 pt-2 border-t border-slate-100 dark:border-scada-700">
                                                <label className="text-xs uppercase font-bold text-slate-500 flex items-center gap-2">
                                                    <Activity size={14} /> {t('opStatusOverride', lang)}
                                                </label>
                                                <div className="flex gap-2 items-center">
                                                    <select 
                                                        value={selectedStationStatus}
                                                        onChange={(e) => setSelectedStationStatus(e.target.value)}
                                                        className="flex-1 bg-white dark:bg-scada-900 border border-slate-200 dark:border-scada-600 rounded px-3 py-2 text-slate-900 dark:text-white outline-none focus:border-scada-accent cursor-pointer"
                                                    >
                                                        <option value="Running">{t('running', lang)}</option>
                                                        <option value="Offline">{t('offline', lang)}</option>
                                                        <option value="Stopped">{t('stopped', lang)}</option>
                                                        <option value="Maintenance">{t('maintenance', lang)}</option>
                                                        <option value="Pending_Install">{t('pending_install', lang)}</option>
                                                    </select>
                                                    <div className={`px-3 py-1.5 rounded text-xs font-bold uppercase ${selectedStationStatus === 'Running' ? 'bg-emerald-500/20 text-emerald-400' : selectedStationStatus === 'Offline' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300'}`}>
                                                        {t(selectedStationStatus.toLowerCase() as any, lang)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-slate-100 dark:border-scada-700 flex justify-end">
                                            <button 
                                                onClick={handleSaveConfig}
                                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium flex items-center gap-2 transition-colors shadow-lg shadow-emerald-900/20"
                                            >
                                                <Save size={18} /> {t('saveChanges', lang)}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                        <Server size={48} className="mb-4 opacity-20" />
                                        <p>Select a station from the list to configure.</p>
                                    </div>
                                )}
                            </Card>
                        </div>
                    )}

                    {activeTab === 'simulation' && (
                        <div className="h-full flex flex-col items-center justify-center">
                            <Card className="w-full max-w-2xl border-amber-500/30 bg-[repeating-linear-gradient(45deg,rgba(0,0,0,0.02),rgba(0,0,0,0.02)_10px,transparent_10px,transparent_20px)]">
                                <div className="border-b border-amber-500/20 pb-4 mb-6 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest flex items-center gap-3">
                                            <AlertTriangle size={24} /> Fault Injection Simulator
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">Use for Operator Training and System Integrity Testing</p>
                                    </div>
                                    <div className="bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-3 py-1 rounded text-xs font-bold uppercase border border-amber-200 dark:border-amber-500/30">
                                        Test Mode
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block">Target Unit</label>
                                            <select 
                                                value={simTargetId}
                                                onChange={(e) => setSimTargetId(e.target.value)}
                                                className="w-full bg-white dark:bg-scada-900 border border-slate-200 dark:border-scada-600 rounded px-3 py-2 text-sm outline-none focus:border-amber-500"
                                            >
                                                {fleet.filter(f => f.status !== 'Pending_Install').map(f => (
                                                    <option key={f.id} value={f.id}>{f.name} ({f.id})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block">Severity Level</label>
                                            <div className="flex gap-2">
                                                {['Critical', 'Warning', 'Info'].map((sev) => (
                                                    <button 
                                                        key={sev}
                                                        onClick={() => setSimSeverity(sev as any)}
                                                        className={`flex-1 py-2 rounded text-xs font-bold uppercase transition-all ${
                                                            simSeverity === sev 
                                                            ? sev === 'Critical' ? 'bg-rose-500 text-white' : sev === 'Warning' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'
                                                            : 'bg-slate-100 dark:bg-scada-700 text-slate-500 hover:bg-slate-200'
                                                        }`}
                                                    >
                                                        {sev}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block">Fault Scenario / Message</label>
                                        <textarea 
                                            value={simMessage}
                                            onChange={(e) => setSimMessage(e.target.value)}
                                            className="w-full bg-white dark:bg-scada-900 border border-slate-200 dark:border-scada-600 rounded px-3 py-2 text-sm outline-none focus:border-amber-500 min-h-[80px]"
                                            placeholder="Enter simulation message..."
                                        />
                                        <div className="flex gap-2 mt-2">
                                            <button onClick={() => setSimMessage('Compressor Overload Protection Trip')} className="text-[10px] bg-slate-100 dark:bg-scada-700 px-2 py-1 rounded hover:text-amber-500">Preset: Overload</button>
                                            <button onClick={() => setSimMessage('Pressure Vacuum Valve Failure')} className="text-[10px] bg-slate-100 dark:bg-scada-700 px-2 py-1 rounded hover:text-amber-500">Preset: Valve Leak</button>
                                            <button onClick={() => setSimMessage('Telemetry Network Timeout (Error 504)')} className="text-[10px] bg-slate-100 dark:bg-scada-700 px-2 py-1 rounded hover:text-amber-500">Preset: Network</button>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-slate-100 dark:border-scada-700">
                                        <button 
                                            onClick={handleInjectSimulation}
                                            className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-widest rounded-lg shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                                        >
                                            <PlayCircle size={20} /> Inject Fault Simulation
                                        </button>
                                        <p className="text-center text-[10px] text-slate-400 mt-2">
                                            Action triggers immediate alert on dashboard. Use for drill purposes only.
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'about' && (
                        <Card title={t('legalAttribution', lang)}>
                            <div className="space-y-6">
                                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-white dark:bg-scada-900 rounded-full shadow-sm">
                                            <Info size={24} className="text-scada-accent" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white mb-2">Weather Data Attribution</h4>
                                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                                                Weather data used for operational context and efficiency correlation is provided by Open-Meteo.com under the Creative Commons Attribution 4.0 International License (CC BY 4.0).
                                            </p>
                                            <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-scada-accent hover:underline">
                                                Visit Open-Meteo <ExternalLink size={12} />
                                            </a>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{t('systemVersion', lang)}</h4>
                                    <div className="flex gap-4 text-xs font-mono text-slate-500">
                                        <span>Build: v1.0.0-GA</span>
                                        <span>Commit: 8f3a21</span>
                                        <span>Env: Production</span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};
