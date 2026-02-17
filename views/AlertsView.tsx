
import React, { useState, useEffect, useMemo } from 'react';
import { Card, Badge, Tabs, TabsList, TabsTrigger, TabsContent, formatDateFriendly } from '../components/ui';
import { AlertTriangle, CheckCircle, Info, Filter, ArrowUpRight, Wrench, X, ClipboardList, Unlock, Lock, Zap, Power, Upload, Camera, Settings, RotateCcw, Thermometer, Wifi, Activity, Gauge, Cable, ListFilter, ArrowRight, Wind, Ruler, RefreshCw, Sliders, Snowflake, Cloud, Globe, Fan } from 'lucide-react';
import { VRU, Alert } from '../types';
import { t } from '../utils/i18n';
import { VisualRelay } from '../components/wizards/VisualRelay';
import { VisualOilPump } from '../components/wizards/VisualOilPump';
import { VisualEvaporator } from '../components/wizards/VisualEvaporator';

interface AlertsViewProps {
    fleet: VRU[];
    onSelectMachine: (id: string) => void;
    lang: 'en' | 'ar' | 'zh' | 'ko';
}

export const AlertsView: React.FC<AlertsViewProps> = ({ fleet, onSelectMachine, lang }) => {
    const [localAlerts, setLocalAlerts] = useState<Alert[]>([]);
    const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
    const [view, setView] = useState('active');
    const [severityFilter, setSeverityFilter] = useState<'All' | 'Critical' | 'Warning'>('All');
    const [wizardStep, setWizardStep] = useState(0);
    const [taskCompleted, setTaskCompleted] = useState(false);
    const [evidenceImage, setEvidenceImage] = useState<string | null>(null);

    useEffect(() => {
        const initialAlerts = fleet.flatMap(vru => 
            vru.alerts.map(a => ({
                ...a,
                machineId: vru.id,
                machineName: vru.name,
                acknowledged: a.acknowledged || false
            }))
        );
        setLocalAlerts(initialAlerts);
    }, [fleet]);

    const openAlert = (alert: Alert) => {
        setSelectedAlert(alert);
        setWizardStep(0);
        setTaskCompleted(false);
        setEvidenceImage(alert.evidence || null);
    };

    const handleAcknowledge = (alertId: string, e?: React.MouseEvent) => {
        if(e) e.stopPropagation();
        setLocalAlerts(prev => prev.map(a => 
            a.id === alertId ? { ...a, acknowledged: true, evidence: evidenceImage || undefined } : a
        ));
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setEvidenceImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const getAlertContext = (msg: string) => {
        const m = msg.toLowerCase();
        if (m.includes('oil pump') && m.includes('overload')) return 'oil_pump_overload';
        if (m.includes('evaporator') && m.includes('overload')) return 'evaporator_overload';
        return 'generic';
    };

    const alertType = selectedAlert ? getAlertContext(selectedAlert.message) : 'generic';

    const renderEvidenceStep = () => (
        <div className="animate-in slide-in-from-right duration-300 space-y-4">
            <div className="bg-slate-50 dark:bg-scada-900/50 border border-slate-200 dark:border-scada-700 rounded-xl p-4 text-center">
                <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-1">Verify & Document</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">Upload a photo of the resolved state (e.g. pressure gauge, cleared panel).</p>
            </div>
            <div className="border-2 border-dashed border-slate-300 dark:border-scada-600 rounded-xl p-6 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-scada-900/30">
                {evidenceImage ? (
                    <div className="relative group">
                        <img src={evidenceImage} alt="Evidence" className="h-32 w-auto object-cover rounded-lg border border-slate-300 shadow-sm" />
                        <button onClick={() => setEvidenceImage(null)} className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                        <div className="mt-2 text-center text-xs font-bold text-emerald-500 flex items-center justify-center gap-1"><CheckCircle size={12} /> Proof Attached</div>
                    </div>
                ) : (
                    <label className="cursor-pointer flex flex-col items-center">
                        <div className="w-10 h-10 bg-slate-200 dark:bg-scada-700 rounded-full flex items-center justify-center mb-2"><Camera size={20} className="text-slate-500" /></div>
                        <span className="text-xs font-bold text-scada-accent">Upload Evidence Photo</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                    </label>
                )}
            </div>
            <div className="flex justify-center pt-2">
                <button 
                    onClick={(e) => { handleAcknowledge(selectedAlert!.id, e); setSelectedAlert(null); }}
                    className={`px-8 py-3 font-bold rounded-lg shadow-lg flex items-center gap-2 mx-auto transition-all ${evidenceImage ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20' : 'bg-slate-200 dark:bg-scada-700 text-slate-400 cursor-not-allowed'}`}
                    disabled={!evidenceImage}
                >
                    <CheckCircle size={18} /> {t('markResolved', lang)}
                </button>
            </div>
        </div>
    );

    const renderRemediationContent = () => {
        if (!selectedAlert) return null;

        if (alertType === 'oil_pump_overload') {
            return (
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-4 mb-4">
                        {[1, 2, 3, 4].map(s => (
                            <div key={s} className={`flex flex-col items-center gap-1 ${wizardStep >= s-1 ? 'text-scada-accent' : 'text-slate-600'}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${wizardStep >= s-1 ? 'border-scada-accent bg-scada-accent/10' : 'border-slate-600'}`}>{s}</div>
                            </div>
                        ))}
                    </div>
                    {wizardStep === 0 && (
                        <div className="animate-in slide-in-from-right duration-300 text-center">
                            <div className="bg-slate-50 dark:bg-scada-900/50 border border-slate-200 dark:border-scada-700 rounded-xl p-6">
                                <Unlock size={32} className="text-slate-500 mx-auto mb-4" />
                                <h4 className="text-lg font-bold text-slate-800 dark:text-white">Access & Safety</h4>
                                <p className="text-sm text-slate-500 mb-6">Open cabinet. Ensure Lockout/Tagout procedures are followed.</p>
                                <button onClick={() => setWizardStep(1)} className="px-6 py-2 bg-scada-accent text-white font-bold rounded-lg hover:bg-sky-400 transition-colors">Proceed</button>
                            </div>
                        </div>
                    )}
                    {wizardStep === 1 && (
                        <div className="animate-in slide-in-from-right duration-300">
                            <div className="mb-4 text-center">
                                <h4 className="font-bold text-slate-800 dark:text-white">Mechanical Service</h4>
                                <p className="text-xs text-slate-500">Unscrew, clean, and spin the impeller manually.</p>
                            </div>
                            <VisualOilPump onComplete={() => setWizardStep(2)} />
                        </div>
                    )}
                    {wizardStep === 2 && (
                        <div className="animate-in slide-in-from-right duration-300">
                            <div className="mb-4 text-center">
                                <h4 className="font-bold text-slate-800 dark:text-white">Electrical Reset</h4>
                                <p className="text-xs text-slate-500">Reset the thermal overload relay [KM3].</p>
                            </div>
                            <div className="flex justify-center gap-4 bg-slate-100 dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                                <VisualRelay label="Main Breaker" code="Q1" status="NORMAL" isTarget={false} onReset={() => {}} />
                                <VisualRelay label="Overload Relay" code="KM3" status={taskCompleted ? "NORMAL" : "TRIPPED"} isTarget={true} onReset={() => { setTaskCompleted(true); setTimeout(() => setWizardStep(3), 1000); }} />
                                <VisualRelay label="Control Power" code="F2" status="NORMAL" isTarget={false} onReset={() => {}} />
                            </div>
                        </div>
                    )}
                    {wizardStep === 3 && renderEvidenceStep()}
                </div>
            );
        }

        if (alertType === 'evaporator_overload') {
            return (
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-4 mb-4">
                        {[1, 2, 3, 4].map(s => (
                            <div key={s} className={`flex flex-col items-center gap-1 ${wizardStep >= s-1 ? 'text-scada-accent' : 'text-slate-600'}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${wizardStep >= s-1 ? 'border-scada-accent bg-scada-accent/10' : 'border-slate-600'}`}>{s}</div>
                            </div>
                        ))}
                    </div>
                    {wizardStep === 0 && (
                        <div className="animate-in slide-in-from-right duration-300 text-center">
                            <div className="bg-slate-50 dark:bg-scada-900/50 border border-slate-200 dark:border-scada-700 rounded-xl p-6">
                                <Unlock size={32} className="text-slate-500 mx-auto mb-4" />
                                <h4 className="text-lg font-bold text-slate-800 dark:text-white">Access & Safety</h4>
                                <p className="text-sm text-slate-500 mb-6">Shut down unit. Follow standard LOTO procedures before accessing the evaporator housing.</p>
                                <button onClick={() => setWizardStep(1)} className="px-6 py-2 bg-scada-accent text-white font-bold rounded-lg hover:bg-sky-400 transition-colors">Proceed</button>
                            </div>
                        </div>
                    )}
                    {wizardStep === 1 && (
                        <div className="animate-in slide-in-from-right duration-300">
                            <div className="mb-4 text-center">
                                <h4 className="font-bold text-slate-800 dark:text-white">Fan Inspection</h4>
                                <p className="text-xs text-slate-500">Clear any ice buildup and verify fan spins freely.</p>
                            </div>
                            <VisualEvaporator onComplete={() => setWizardStep(2)} />
                        </div>
                    )}
                    {wizardStep === 2 && (
                        <div className="animate-in slide-in-from-right duration-300">
                            <div className="mb-4 text-center">
                                <h4 className="font-bold text-slate-800 dark:text-white">Electrical Reset</h4>
                                <p className="text-xs text-slate-500">Reset the Evaporator Overload Relay [KM2].</p>
                            </div>
                            <div className="flex justify-center gap-4 bg-slate-100 dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                                <VisualRelay label="Main Breaker" code="Q1" status="NORMAL" isTarget={false} onReset={() => {}} />
                                <VisualRelay label="Evap Relay" code="KM2" status={taskCompleted ? "NORMAL" : "TRIPPED"} isTarget={true} onReset={() => { setTaskCompleted(true); setTimeout(() => setWizardStep(3), 1000); }} />
                                <VisualRelay label="Control Power" code="F2" status="NORMAL" isTarget={false} onReset={() => {}} />
                            </div>
                        </div>
                    )}
                    {wizardStep === 3 && renderEvidenceStep()}
                </div>
            );
        }

        return (
            <div className="p-12 text-center text-slate-400">
                <Wrench size={48} className="mx-auto mb-4 opacity-20" />
                <p>Standard troubleshooting guide not available for this alert type.</p>
                <button onClick={() => setEvidenceImage('manual_override')} className="mt-4 text-xs text-blue-500 hover:underline">Skip to Resolution</button>
                {evidenceImage === 'manual_override' && renderEvidenceStep()}
            </div>
        );
    };

    // Filter Logic
    const filteredAlerts = useMemo(() => {
        return localAlerts
            .filter(a => view === 'active' ? !a.acknowledged : a.acknowledged)
            .filter(a => severityFilter === 'All' ? true : a.severity === severityFilter)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [localAlerts, view, severityFilter]);

    return (
        <div className="h-full flex flex-col md:flex-row gap-6 animate-in fade-in duration-500">
            {/* List Side */}
            <div className={`flex flex-col gap-4 transition-all duration-500 ${selectedAlert ? 'w-full md:w-1/3' : 'w-full'}`}>
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <AlertTriangle className="text-scada-accent" /> {t('systemAlerts', lang)}
                    </h2>
                    <div className="flex bg-slate-100 dark:bg-scada-800 p-1 rounded-lg border border-slate-200 dark:border-scada-700">
                        <button onClick={() => setView('active')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${view === 'active' ? 'bg-white dark:bg-scada-700 shadow text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>{t('activeAlertsTab', lang)}</button>
                        <button onClick={() => setView('resolved')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${view === 'resolved' ? 'bg-white dark:bg-scada-700 shadow text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>{t('resolvedHistory', lang)}</button>
                    </div>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {['All', 'Critical', 'Warning'].map(sev => (
                        <button 
                            key={sev}
                            onClick={() => setSeverityFilter(sev as any)}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase border transition-colors whitespace-nowrap ${severityFilter === sev ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900' : 'bg-white dark:bg-scada-800 text-slate-500 border-slate-200 dark:border-scada-700 hover:border-slate-300'}`}
                        >
                            {sev}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                    {filteredAlerts.length > 0 ? filteredAlerts.map(alert => (
                        <div 
                            key={alert.id}
                            onClick={() => openAlert(alert)}
                            className={`bg-white dark:bg-scada-800 border rounded-xl p-4 cursor-pointer transition-all hover:shadow-md group relative overflow-hidden ${selectedAlert?.id === alert.id ? 'border-scada-accent ring-1 ring-scada-accent' : 'border-slate-200 dark:border-scada-700'}`}
                        >
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${alert.severity === 'Critical' ? 'bg-rose-500' : alert.severity === 'Warning' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                            <div className="flex justify-between items-start mb-2 pl-2">
                                <Badge variant={alert.severity === 'Critical' ? 'danger' : alert.severity === 'Warning' ? 'warning' : 'neutral'}>{alert.severity}</Badge>
                                <span className="text-[10px] text-slate-400 font-mono">{formatDateFriendly(alert.timestamp)}</span>
                            </div>
                            <h4 className="font-bold text-slate-800 dark:text-white mb-1 pl-2">{alert.message}</h4>
                            <div className="flex justify-between items-center pl-2">
                                <span className="text-xs text-slate-500">{alert.machineName}</span>
                                {alert.acknowledged && <CheckCircle size={14} className="text-emerald-500" />}
                            </div>
                        </div>
                    )) : (
                        <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-scada-900 rounded-xl border border-dashed border-slate-200 dark:border-scada-700">
                            {t('noActiveAlerts', lang)}
                        </div>
                    )}
                </div>
            </div>

            {/* Detail / Wizard Side */}
            {selectedAlert && (
                <div className="w-full md:w-2/3 bg-white dark:bg-scada-800 border border-slate-200 dark:border-scada-700 rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
                    <div className="p-6 border-b border-slate-100 dark:border-scada-700 flex justify-between items-start bg-slate-50 dark:bg-scada-900/50">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedAlert.message}</h3>
                                <Badge variant={selectedAlert.severity === 'Critical' ? 'danger' : 'warning'}>{selectedAlert.severity}</Badge>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-slate-500 font-mono">
                                <span>ID: {selectedAlert.id}</span>
                                <span>Unit: {selectedAlert.machineName}</span>
                                <span>Detected: {new Date(selectedAlert.timestamp).toLocaleString()}</span>
                            </div>
                        </div>
                        <button onClick={() => setSelectedAlert(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-scada-700 rounded-full transition-colors">
                            <X size={20} className="text-slate-500" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                        {/* If Resolved, Show Summary */}
                        {selectedAlert.acknowledged ? (
                            <div className="text-center py-12">
                                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle size={40} className="text-emerald-500" />
                                </div>
                                <h3 className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mb-2">Issue Resolved</h3>
                                <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                                    This alert was marked as resolved. System status is normal.
                                </p>
                                {selectedAlert.evidence && (
                                    <div className="mt-8">
                                        <div className="text-xs font-bold text-slate-400 uppercase mb-2">Attached Evidence</div>
                                        <img src={selectedAlert.evidence} alt="Proof" className="h-48 rounded-lg border border-slate-200 dark:border-scada-600 shadow-sm mx-auto" />
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Wizard Mode
                            <div className="max-w-2xl mx-auto">
                                {renderRemediationContent()}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
