
import React, { useEffect, useState } from 'react';
import { AppState, VRU } from '../types';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Clock, LayoutDashboard, Map, Server, AlertCircle, Menu } from 'lucide-react';
import { CommandPalette } from './CommandPalette';

interface LayoutProps {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  children: React.ReactNode;
  fleet?: VRU[]; // Added fleet prop for global search access
}

export const Layout: React.FC<LayoutProps> = ({ appState, setAppState, children, fleet = [] }) => {
  const [isCmdOpen, setIsCmdOpen] = useState(false);
  
  // Handle Theme Switching
  useEffect(() => {
    const root = window.document.documentElement;
    if (appState.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [appState.theme]);

  // Handle Command Palette Shortcut (Ctrl/Cmd + K)
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
              e.preventDefault();
              setIsCmdOpen(prev => !prev);
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCommandNavigate = (view: any, id?: string) => {
      if (id) {
          setAppState(prev => ({ ...prev, currentView: 'machine-detail', selectedMachineId: id }));
      } else {
          setAppState(prev => ({ ...prev, currentView: view }));
      }
  };

  // View Label Helper
  const getLabel = () => {
      const labels: Record<string, string> = {
          'dashboard': 'Dashboard',
          'maps': 'Fleet Map',
          'machines': 'Machine Registry',
          'machine-detail': 'Machine Details',
          'comparison': 'Comparative Analysis',
          'yield-calendar': 'Yield Calendar',
          'financial': 'Financial Analysis',
          'esg': 'Environment Impact',
          'maintenance': 'Maintenance Ops',
          'alerts': 'Alert Management',
          'report-builder': 'Custom Reports',
          'knowledge-base': 'Knowledge Base',
          'settings': 'System Settings',
          'telemetry': 'Live Telemetry'
      };
      return labels[appState.currentView] || 'Overview';
  };

  return (
    // Use 100dvh for mobile viewport stability (handles address bar collapse)
    <div 
        className={`flex h-screen h-[100dvh] w-screen bg-slate-100 dark:bg-scada-900 text-slate-900 dark:text-slate-200 overflow-hidden font-sans`}
        dir={appState.language === 'ar' ? 'rtl' : 'ltr'}
    >
      <CommandPalette 
        isOpen={isCmdOpen} 
        onClose={() => setIsCmdOpen(false)} 
        onNavigate={handleCommandNavigate}
        fleet={fleet}
      />
      
      {/* Mobile Sidebar Overlay - High Z-Index to beat Maps */}
      {appState.isSidebarOpen && (
          <div 
              className="fixed inset-0 bg-black/50 z-[3000] md:hidden backdrop-blur-sm transition-opacity"
              onClick={() => setAppState(s => ({ ...s, isSidebarOpen: false }))}
          />
      )}

      {/* Desktop Sidebar - Hidden on Mobile */}
      <div className="hidden md:block h-full z-[100]">
        <Sidebar appState={appState} setAppState={setAppState} />
      </div>

      {/* Mobile Sidebar - Slide in (Controlled by isSidebarOpen) */}
      <div className={`md:hidden fixed inset-y-0 left-0 z-[3001] w-64 transform transition-transform duration-300 ease-in-out ${appState.isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
         <Sidebar appState={appState} setAppState={setAppState} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 transition-colors duration-300 relative z-0">
        <Header 
            appState={appState} 
            setAppState={setAppState} 
            currentLabel={getLabel()} 
            fleet={fleet}
        />

        {/* Main Content - Added padding-bottom for mobile nav */}
        <main className="flex-1 overflow-auto p-4 md:p-6 pb-24 md:pb-6 relative scroll-smooth">
            {children}
            
            <div className="fixed bottom-24 md:bottom-4 right-4 bg-slate-200/80 dark:bg-scada-800/80 border border-slate-300 dark:border-scada-600 text-slate-600 dark:text-slate-400 px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 backdrop-blur-md z-[500] shadow-sm pointer-events-none md:pointer-events-auto">
                <Clock size={14} />
                Data delayed by up to a day
                <span className="hidden md:inline text-slate-400">| Press ⌘K for menu</span>
            </div>
        </main>

        {/* Mobile Bottom Navigation Bar - High Z-Index */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/90 dark:bg-[#0f172a]/95 backdrop-blur-lg border-t border-slate-200 dark:border-white/10 z-[2000] flex items-center justify-around px-2 pb-safe">
            <button 
                onClick={() => setAppState(s => ({...s, currentView: 'dashboard'}))}
                className={`flex flex-col items-center justify-center w-full h-full gap-1 ${appState.currentView === 'dashboard' ? 'text-scada-accent' : 'text-slate-400'}`}
            >
                <LayoutDashboard size={20} />
                <span className="text-[9px] font-bold uppercase">Dash</span>
            </button>
            <button 
                onClick={() => setAppState(s => ({...s, currentView: 'maps'}))}
                className={`flex flex-col items-center justify-center w-full h-full gap-1 ${appState.currentView === 'maps' ? 'text-scada-accent' : 'text-slate-400'}`}
            >
                <Map size={20} />
                <span className="text-[9px] font-bold uppercase">Map</span>
            </button>
            
            {/* Floating Action Button for Alerts */}
            <div className="relative -top-5">
                <button 
                    onClick={() => setAppState(s => ({...s, currentView: 'alerts'}))}
                    className="w-14 h-14 bg-scada-accent rounded-full flex items-center justify-center text-white shadow-lg shadow-scada-accent/40 border-4 border-slate-100 dark:border-[#0f172a]"
                >
                    <AlertCircle size={24} />
                    {appState.notifications.length > 0 && (
                        <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-rose-500 rounded-full border border-white dark:border-[#0f172a]"></span>
                    )}
                </button>
            </div>

            <button 
                onClick={() => setAppState(s => ({...s, currentView: 'machines'}))}
                className={`flex flex-col items-center justify-center w-full h-full gap-1 ${appState.currentView === 'machines' ? 'text-scada-accent' : 'text-slate-400'}`}
            >
                <Server size={20} />
                <span className="text-[9px] font-bold uppercase">Units</span>
            </button>
            <button 
                onClick={() => setAppState(s => ({...s, isSidebarOpen: true}))}
                className="flex flex-col items-center justify-center w-full h-full gap-1 text-slate-400"
            >
                <Menu size={20} />
                <span className="text-[9px] font-bold uppercase">Menu</span>
            </button>
        </div>
      </div>
    </div>
  );
};
