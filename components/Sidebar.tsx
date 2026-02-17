
import React, { useMemo } from 'react';
import { 
  LayoutDashboard, Map as MapIcon, Server, DollarSign, 
  Leaf, Wrench, Activity, AlertCircle, Settings, 
  FileText, Calendar, X, ArrowRightLeft
} from 'lucide-react';
import { AppState, ViewState } from '../types';
import { t } from '../utils/i18n';

interface SidebarProps {
    appState: AppState;
    setAppState: React.Dispatch<React.SetStateAction<AppState>>;
}

export const Sidebar: React.FC<SidebarProps> = React.memo(({ appState, setAppState }) => {
    const lang = appState.language;
    const client = appState.client;
    
    // Memoize nav items to prevent recreation on every render
    const navItems = useMemo(() => [
        { id: 'dashboard', label: t('dashboard', lang), icon: <LayoutDashboard size={20} /> },
        { id: 'maps', label: t('fleetMap', lang), icon: <MapIcon size={20} /> },
        { id: 'machines', label: t('machines', lang), icon: <Server size={20} /> },
        { id: 'comparison', label: t('analysis', lang), icon: <ArrowRightLeft size={20} /> },
        { id: 'yield-calendar', label: t('yieldCalendar', lang), icon: <Calendar size={20} /> },
        { id: 'financial', label: t('financial', lang), icon: <DollarSign size={20} /> },
        { id: 'esg', label: t('environment', lang), icon: <Leaf size={20} /> },
        { id: 'maintenance', label: t('navMaintenance', lang), icon: <Wrench size={20} /> },
        { id: 'alerts', label: t('alerts', lang), icon: <AlertCircle size={20} /> },
        { id: 'report-builder', label: t('reports', lang), icon: <FileText size={20} /> },
        { id: 'settings', label: t('settings', lang), icon: <Settings size={20} /> },
    ], [lang]);

    return (
        <aside 
            className={`
                fixed inset-y-0 z-30 md:relative bg-white dark:bg-scada-800 border-r border-slate-200 dark:border-scada-700 transition-all duration-300 flex flex-col h-full shadow-xl md:shadow-none
                ${appState.language === 'ar' ? 'right-0 border-l border-r-0' : 'left-0 border-r'}
                ${appState.isSidebarOpen ? 'w-64 translate-x-0' : (appState.language === 'ar' ? 'translate-x-full md:translate-x-0 md:w-20 w-64' : '-translate-x-full md:translate-x-0 md:w-20 w-64')}
            `}
        >
            {/* Logo Area (Client Logo) */}
            <div className="h-20 flex items-center justify-between px-4 border-b border-slate-200 dark:border-scada-700 flex-shrink-0 bg-slate-50 dark:bg-scada-800/50">
                <div className={`flex items-center justify-center ${!appState.isSidebarOpen ? 'w-full' : ''} w-full`}>
                    <img 
                        src={client.logoUrl} 
                        alt={client.name} 
                        className={`object-contain transition-all duration-300 ${appState.isSidebarOpen ? 'h-12 w-auto' : 'h-8 w-auto'}`}
                    />
                </div>
                
                {appState.isSidebarOpen && (
                    <button onClick={() => setAppState(s => ({ ...s, isSidebarOpen: false }))} className="p-1 hover:bg-slate-200 dark:hover:bg-scada-700 rounded md:hidden text-slate-500 dark:text-slate-400">
                        <X size={20} />
                    </button>
                )}
            </div>

            <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar">
                <ul className="space-y-1 px-3">
                    {navItems.map((item) => (
                        <li key={item.id}>
                            <button
                                onClick={() => {
                                    setAppState(s => ({ ...s, currentView: item.id as ViewState }));
                                    // Close sidebar on mobile when navigating
                                    if (window.innerWidth < 768) {
                                        setAppState(s => ({ ...s, isSidebarOpen: false }));
                                    }
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group
                                    ${appState.currentView === item.id 
                                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold shadow-sm ring-1 ring-emerald-500/20 dark:ring-transparent' 
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-scada-700 hover:text-slate-900 dark:hover:text-slate-200'}
                                `}
                                style={appState.currentView === item.id ? { color: client.primaryColor, backgroundColor: `${client.primaryColor}15` } : {}}
                                title={!appState.isSidebarOpen ? item.label : ''}
                            >
                                <span className={`flex-shrink-0 transition-transform group-hover:scale-110 ${appState.currentView === item.id ? 'scale-110' : ''}`}>{item.icon}</span>
                                {appState.isSidebarOpen && <span className="truncate">{item.label}</span>}
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>
            
            {/* Footer Area (MasarZero Logo) */}
            <div className="p-6 border-t border-slate-200 dark:border-scada-700 flex-shrink-0 bg-slate-50 dark:bg-scada-800/50">
                 {appState.isSidebarOpen ? (
                     <div className="flex flex-col items-center gap-3">
                         <div className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Powered By</div>
                         <img 
                            src="https://i.ibb.co/Lzf6K7nG/masarzerologo.png" 
                            alt="MasarZero" 
                            className="h-20 w-auto opacity-90 hover:opacity-100 transition-opacity duration-300"
                         />
                     </div>
                 ) : (
                     <div className="flex flex-col items-center gap-2">
                         <img 
                            src="https://i.ibb.co/Lzf6K7nG/masarzerologo.png" 
                            alt="MZ" 
                            className="h-8 w-auto opacity-80"
                         />
                     </div>
                 )}
            </div>
        </aside>
    );
});
