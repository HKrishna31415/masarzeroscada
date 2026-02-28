
import * as React from 'react';
import { Suspense, useCallback } from 'react';
import { Layout } from './components/Layout';
import { LoginView } from './views/LoginView';
import { KioskMode } from './components/KioskMode';
import { Toast, ToastProps } from './components/ui';
import { ErrorBoundary } from './components/ErrorBoundary'; // Import ErrorBoundary
import { AppState, ViewState, VRU, AuditLogEntry, ClientBranding, Alert } from './types';
import { generateFleet, generateGecoFleet, generateMasterFleet, generateMaintenanceTasks, generateInventory } from './mockData';
import { getAggregatedFleetData, getMachineData, updateMachineConfig } from './data/MachineRepository';
import { Loader2, Activity } from 'lucide-react';
import { applyTheme, CLIENT_CONFIGS } from './theme';

// --- LAZY LOADED VIEWS ---
const DashboardView = React.lazy(() => import('./views/DashboardView').then(module => ({ default: module.DashboardView })));
const MapsView = React.lazy(() => import('./views/MapsView').then(module => ({ default: module.MapsView })));
const FinancialView = React.lazy(() => import('./views/FinancialView').then(module => ({ default: module.FinancialView })));
const MachinesView = React.lazy(() => import('./views/MachinesView').then(module => ({ default: module.MachinesView })));
const MachineDetailView = React.lazy(() => import('./views/MachineDetailView').then(module => ({ default: module.MachineDetailView })));
const ReportBuilderView = React.lazy(() => import('./views/ReportBuilderView').then(module => ({ default: module.ReportBuilderView })));
const YieldCalendarView = React.lazy(() => import('./views/YieldCalendarView').then(module => ({ default: module.YieldCalendarView })));
const ComparisonView = React.lazy(() => import('./views/ComparisonView').then(module => ({ default: module.ComparisonView })));
const ESGView = React.lazy(() => import('./views/ESGView').then(module => ({ default: module.ESGView })));
const MaintenanceView = React.lazy(() => import('./views/MaintenanceView').then(module => ({ default: module.MaintenanceView })));
const AlertsView = React.lazy(() => import('./views/AlertsView').then(module => ({ default: module.AlertsView })));
const SettingsView = React.lazy(() => import('./views/SettingsView').then(module => ({ default: module.SettingsView })));
const TelemetryView = React.lazy(() => import('./views/TelemetryView').then(module => ({ default: module.TelemetryView })));
const ProjectionsView = React.lazy(() => import('./views/ProjectionsView').then(module => ({ default: module.ProjectionsView })));

// --- SCADA LOADING FALLBACK ---
const LoadingFallback = () => (
    <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0b1121] transition-colors">
        <div className="relative">
            <div className="absolute inset-0 bg-scada-accent/20 blur-xl rounded-full animate-pulse"></div>
            <Loader2 size={48} className="text-scada-accent animate-spin relative z-10" />
        </div>
        <div className="mt-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <Activity size={12} className="animate-pulse" />
            Loading Module...
        </div>
    </div>
);

// Initial Mock Audit Logs
const initialAuditLogs: AuditLogEntry[] = [
    { id: 'LOG-1', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), user: 'Admin', action: 'System Login', details: 'User logged in from Riyadh HQ IP', category: 'Security' },
    { id: 'LOG-2', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), user: 'Operator', action: 'Acknowledge Alert', details: 'Acknowledged Pump Failure on VRU-A03', category: 'System' },
    { id: 'LOG-3', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), user: 'Admin', action: 'Export Report', details: 'Exported Monthly Yield Report (PDF)', category: 'User' },
];

// --- CRITICAL DATA SYNC UTILITY ---
// This function ensures that the fleet's "totalRecoveredAmount" property (used in lists/summaries)
// matches the sum of the detailed daily records in the MachineRepository (used in charts).
const getFullySyncedFleet = (baseFleet: VRU[]): VRU[] => {
    return baseFleet.map(unit => {
        // Skip pending units (no data to sync)
        if (unit.status === 'Pending_Install') return unit;

        // Force access to the repository to calculate the REAL sum
        // This calculates 2024 + 2025 + 2026 data
        const data = getMachineData(unit.id);
        const realTotal = data.daily.reduce((acc, curr) => acc + curr.recoveredLiters, 0);

        // Debug log for verification
        // if (unit.id === 'VRU-A02') console.log(`[SYNC] Airport 2 Mock: ${unit.totalRecoveredAmount} -> Real: ${realTotal}`);

        return {
            ...unit,
            totalRecoveredAmount: realTotal
        };
    });
};

const App: React.FC = () => {
    // Auth State
    const [isAuthenticated, setIsAuthenticated] = React.useState(false);
    
    // Fleet state initialized with SYNCHRONOUS calculation
    // This ensures no flash of incorrect data
    const [fleet, setFleet] = React.useState<VRU[]>(() => getFullySyncedFleet(generateFleet()));

    // Reactive Financial Data - CRITICAL: Pass 'fleet' to ensure we only aggregate active units
    const globalDailyData = React.useMemo(() => {
        return getAggregatedFleetData('all', fleet);
    }, [fleet]); 

    // Toast State
    const [toasts, setToasts] = React.useState<Omit<ToastProps, 'onClose'>[]>([]);

    const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning') => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, { id, message, type }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const tasks = React.useMemo(() => generateMaintenanceTasks(fleet), [fleet]); 
    const inventory = generateInventory();

    const [appState, setAppState] = React.useState<AppState>({
        currentView: 'dashboard',
        isSidebarOpen: true,
        language: (localStorage.getItem('masarzero_lang') as any) || 'en',
        currency: (localStorage.getItem('masarzero_curr') as any) || 'SAR',
        theme: (localStorage.getItem('masarzero_theme') as any) || 'dark',
        notifications: [],
        auditLog: initialAuditLogs,
        user: { 
            name: localStorage.getItem('masarzero_username') || 'Admin', 
            role: 'Admin', 
            avatar: '' 
        },
        client: { name: 'Sasco', logoUrl: '', primaryColor: '#009095' }, // Initial placeholder
        showPendingUnits: false,
        isKioskMode: false,
        autoTheme: false
    });

    React.useEffect(() => {
        localStorage.setItem('masarzero_theme', appState.theme);
        localStorage.setItem('masarzero_lang', appState.language);
        localStorage.setItem('masarzero_curr', appState.currency);
    }, [appState.theme, appState.language, appState.currency]);

    // --- AUTO THEME LOGIC ---
    React.useEffect(() => {
        if (!appState.autoTheme) return;

        const checkTime = () => {
            const hour = new Date().getHours();
            const isNight = hour >= 18 || hour < 6;
            const newTheme = isNight ? 'dark' : 'light';
            
            if (appState.theme !== newTheme) {
                setAppState(prev => ({ ...prev, theme: newTheme }));
                addToast(`Auto-Theme: Switched to ${newTheme} mode based on time.`, 'info');
            }
        };

        checkTime(); 
        const interval = setInterval(checkTime, 60000); 
        return () => clearInterval(interval);
    }, [appState.autoTheme, appState.theme, addToast]);

    const handleUpdateMachine = useCallback((updatedMachine: VRU) => {
        setFleet(prevFleet => prevFleet.map(m => m.id === updatedMachine.id ? updatedMachine : m));
        addToast(`Updated status for ${updatedMachine.name}`, 'info');
    }, [addToast]);

    const handleInjectAlert = useCallback((machineId: string, alert: Alert) => {
        setFleet(prevFleet => prevFleet.map(m => {
            if (m.id === machineId) {
                return { ...m, alerts: [alert, ...m.alerts] };
            }
            return m;
        }));
        addToast(`Simulated alert injected into ${machineId}`, 'warning');
    }, [addToast]);

    const handleMachineSelect = useCallback((id: string) => {
        setAppState(prev => ({
            ...prev,
            currentView: 'machine-detail',
            selectedMachineId: id
        }));
    }, []);

    const handleNavigate = useCallback((view: ViewState, props?: any) => {
        setAppState(prev => ({ ...prev, currentView: view, viewProps: props }));
    }, []);

    // --- LOGIN HANDLER ---
    const handleLogout = useCallback(() => {
        setIsAuthenticated(false);
        // Optional: clear any session specific local storage if needed
        // localStorage.removeItem('masarzero_token');
        addToast('Session terminated. You have been logged out.', 'info');
    }, [addToast]);

    const handleLoginSuccess = (clientId: string) => {
        setIsAuthenticated(true);
        
        // Apply Global Theme
        const themeConfig = applyTheme(clientId);

        const baseStateUpdate = {
            client: { 
                name: themeConfig.name, 
                logoUrl: themeConfig.logoUrl, 
                primaryColor: themeConfig.colors.primary 
            },
            currentView: 'dashboard' as ViewState
        };
        
        if (clientId === 'bapco') {
            const bapcoUnitId = 'VRU-BAH-01';
            const fullFleet = generateFleet();
            const bapcoUnit = fullFleet.find(u => u.id === bapcoUnitId);
            if (bapcoUnit) bapcoUnit.alerts = []; 

            setFleet([bapcoUnit!]);
            setAppState(prev => ({
                ...prev,
                ...baseStateUpdate,
                currency: 'BHD',
                user: { ...prev.user, role: 'Site Manager', name: 'Bapco Admin' }
            }));
            updateMachineConfig(bapcoUnitId, { salesPricePerLiter: 0.140, currency: 'BHD', vatRate: 0.10, electricityCostPerKw: 0.016 });
            addToast('Welcome Bapco Energies. System configured for Bahrain Region.', 'success');

        } else if (clientId === 'geco') {
            const gecoFleet = generateGecoFleet();
            // Sync GECO fleet as well
            setFleet(getFullySyncedFleet(gecoFleet));
            setAppState(prev => ({
                ...prev,
                ...baseStateUpdate,
                currency: 'KRW', 
                user: { ...prev.user, role: 'Admin', name: 'GECO Admin' }
            }));
            addToast('Welcome GECO. System configured for Korean Fleet.', 'success');

        } else if (clientId === 'masarzero') {
            // Master Admin View - Sync Master Fleet
            const masterFleet = generateMasterFleet();
            setFleet(getFullySyncedFleet(masterFleet));
            setAppState(prev => ({
                ...prev,
                ...baseStateUpdate,
                currency: 'USD', // CHANGED: Default to USD for Super Admin
                user: { ...prev.user, role: 'Super Admin', name: 'MasarZero Ops' }
            }));
            addToast('Welcome Master Admin. Global Overview Loaded.', 'success');

        } else {
            // Default Sasco
            const sascoFleet = generateFleet().filter(u => u.country === 'KSA');
            setFleet(getFullySyncedFleet(sascoFleet));
            setAppState(prev => ({
                ...prev,
                ...baseStateUpdate,
                currency: 'SAR',
                user: { ...prev.user, role: 'Admin', name: 'Sasco Admin' }
            }));
        }
    };

    const renderView = () => {
        const lang = appState.language;
        // Wrap the dynamic view component in an ErrorBoundary
        const ViewComponent = () => {
            switch (appState.currentView) {
                case 'dashboard': return <DashboardView fleet={fleet} historyData={globalDailyData} onSelectMachine={handleMachineSelect} onNavigate={handleNavigate} currency={appState.currency} lang={lang} />;
                case 'maps': return <MapsView fleet={fleet} onSelectMachine={handleMachineSelect} theme={appState.theme} showPendingUnits={appState.showPendingUnits} lang={lang} />;
                case 'financial': return <FinancialView history={globalDailyData} fleet={fleet} currency={appState.currency} onCurrencyChange={(c) => { setAppState(s => ({...s, currency: c as 'SAR'|'USD'|'CNY'|'BHD'|'KRW'})); addToast(`Currency switched to ${c}`, 'info'); }} clientName={appState.client.name} lang={lang} />;
                case 'machines': return <MachinesView fleet={fleet} onSelectMachine={handleMachineSelect} initialStatus={appState.viewProps?.status} lang={lang} />;
                case 'machine-detail': 
                    const selectedMachine = fleet.find(m => m.id === appState.selectedMachineId);
                    if (selectedMachine) {
                        return <MachineDetailView machine={selectedMachine} onBack={() => setAppState(s => ({...s, currentView: 'machines'}))} lang={lang} />;
                    }
                    return <MachinesView fleet={fleet} onSelectMachine={handleMachineSelect} lang={lang} />;
                case 'yield-calendar': return <YieldCalendarView fleet={fleet} lang={lang} />;
                case 'comparison': return <ComparisonView fleet={fleet} lang={lang} />;
                case 'report-builder': return <ReportBuilderView fleet={fleet} client={appState.client} />;
                case 'esg': return <ESGView fleet={fleet} lang={lang} />;
                case 'maintenance': return <MaintenanceView tasks={tasks} inventory={inventory} addToast={addToast} lang={lang} />;
                case 'alerts': return <AlertsView fleet={fleet} onSelectMachine={handleMachineSelect} lang={lang} />;
                case 'settings': return <SettingsView appState={appState} setAppState={setAppState} fleet={fleet} onUpdateMachine={handleUpdateMachine} onInjectAlert={handleInjectAlert} addToast={addToast} />;
                case 'telemetry': return <TelemetryView fleet={fleet} />;
                default: return <DashboardView fleet={fleet} historyData={globalDailyData} onSelectMachine={handleMachineSelect} onNavigate={handleNavigate} currency={appState.currency} lang={lang} />;
            }
        };

        return (
            <ErrorBoundary viewName={appState.currentView}>
                <ViewComponent />
            </ErrorBoundary>
        );
    };

    if (!isAuthenticated) {
        return <LoginView onLogin={handleLoginSuccess} />;
    }

    if (appState.isKioskMode) {
        return (
            <KioskMode 
                fleet={fleet} 
                onExit={() => setAppState(s => ({...s, isKioskMode: false}))} 
                lang={appState.language}
            />
        );
    }

    return (
        <Layout appState={appState} setAppState={setAppState} fleet={fleet} onLogout={handleLogout}>
            <Suspense fallback={<LoadingFallback />}>
                {renderView()}
            </Suspense>
            
            <div className="fixed bottom-24 md:bottom-6 left-6 z-[2000] flex flex-col gap-2 pointer-events-none">
                {toasts.map(toast => (
                    <Toast key={toast.id} {...toast} onClose={removeToast} />
                ))}
            </div>
        </Layout>
    );
};

export default App;
