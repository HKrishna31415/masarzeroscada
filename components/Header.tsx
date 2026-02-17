
import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, Menu, Globe, DollarSign, Moon, Sun, X, ChevronRight, Monitor, Laptop2 } from 'lucide-react';
import { AppState, VRU } from '../types';
import { t } from '../utils/i18n';

interface HeaderProps {
    appState: AppState;
    setAppState: React.Dispatch<React.SetStateAction<AppState>>;
    currentLabel?: string;
    fleet?: VRU[];
}

export const Header: React.FC<HeaderProps> = React.memo(({ appState, setAppState, currentLabel, fleet = [] }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<VRU[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false); // Mobile search state
    const searchRef = useRef<HTMLDivElement>(null);
    const lang = appState.language;
    const isGeco = appState.client.name === 'GECO';

    const toggleTheme = () => {
        setAppState(prev => ({
            ...prev,
            theme: prev.theme === 'dark' ? 'light' : 'dark',
            autoTheme: false // Disable auto if manually toggled
        }));
    };

    // Debounce Search Logic
    useEffect(() => {
        const handler = setTimeout(() => {
            if (searchTerm.length > 1) {
                const results = fleet.filter(unit => 
                    unit.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                    unit.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    unit.city.toLowerCase().includes(searchTerm.toLowerCase())
                ).slice(0, 5); // Limit to 5
                setSearchResults(results);
                setShowResults(true);
            } else {
                setSearchResults([]);
                setShowResults(false);
            }
        }, 300); // 300ms delay

        return () => clearTimeout(handler);
    }, [searchTerm, fleet]);

    // Click outside to close search
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowResults(false);
                setIsMobileSearchOpen(false); // Close mobile search on outside click
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelectResult = (id: string) => {
        setAppState(prev => ({
            ...prev,
            currentView: 'machine-detail',
            selectedMachineId: id
        }));
        setSearchTerm('');
        setShowResults(false);
        setIsMobileSearchOpen(false);
    };

    // Translate view label if it matches a key
    const translatedLabel = React.useMemo(() => {
        return currentLabel; 
    }, [currentLabel]);

    return (
        <header className="h-16 bg-white dark:bg-scada-800/90 backdrop-blur-md border-b border-slate-200 dark:border-scada-700 flex items-center justify-between px-4 md:px-6 z-10 transition-colors duration-300 shrink-0 relative">
            <div className="flex items-center gap-3 md:gap-4 overflow-hidden flex-1">
               {!appState.isSidebarOpen && (
                   <button 
                       onClick={() => setAppState(s => ({ ...s, isSidebarOpen: true }))} 
                       className="flex-shrink-0 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                       aria-label="Open sidebar"
                   >
                       <Menu size={20} />
                   </button>
               )}
               {/* Hide label on mobile if search is open */}
               <h2 className={`text-lg font-bold text-slate-800 dark:text-slate-100 capitalize tracking-tight truncate ${isMobileSearchOpen ? 'hidden' : 'block'}`}>
                   {translatedLabel}
               </h2>
               
               {/* Search Bar - Responsive */}
               <div ref={searchRef} className={`relative group flex-1 max-w-md ${isMobileSearchOpen ? 'block absolute left-4 right-4 z-20' : 'hidden md:block'} ${lang === 'ar' ? 'mr-4 lg:mr-6' : 'ml-4 lg:ml-6'}`}>
                   <div className="relative">
                       <div className={`absolute inset-y-0 flex items-center pointer-events-none ${lang === 'ar' ? 'right-0 pr-3' : 'left-0 pl-3'}`}>
                           <Search size={14} className="text-slate-400 dark:text-slate-500" />
                       </div>
                       <input 
                          type="text" 
                          placeholder={t('searchPlaceholder', lang)}
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          onFocus={() => { if(searchTerm.length > 1) setShowResults(true); }}
                          className={`bg-slate-100 dark:bg-scada-900 border border-slate-200 dark:border-scada-600 rounded-full py-1.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-scada-accent w-full transition-all placeholder:text-slate-400 ${lang === 'ar' ? 'pr-9 pl-8' : 'pl-9 pr-20'}`}
                          autoFocus={isMobileSearchOpen}
                          aria-label="Search assets"
                       />
                       {/* Shortcut Hint - Desktop Only */}
                       {!searchTerm && (
                           <div className={`absolute inset-y-0 flex items-center pointer-events-none hidden sm:flex ${lang === 'ar' ? 'left-3' : 'right-3'}`}>
                               <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-slate-400 bg-white dark:bg-scada-800 border border-slate-200 dark:border-scada-700 rounded shadow-sm">⌘K</kbd>
                           </div>
                       )}
                       {searchTerm && (
                           <button 
                                onClick={() => { setSearchTerm(''); setIsMobileSearchOpen(false); }} 
                                className={`absolute inset-y-0 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ${lang === 'ar' ? 'left-0 pl-3' : 'right-0 pr-3'}`}
                                aria-label="Clear search"
                           >
                               <X size={12} />
                           </button>
                       )}
                   </div>

                   {/* Search Dropdown Results */}
                   {showResults && (
                       <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-scada-800 border border-slate-200 dark:border-scada-600 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                           {searchResults.length > 0 ? (
                               <div className="py-2">
                                   <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400">{t('machinesResult', lang)}</div>
                                   {searchResults.map(unit => (
                                       <button 
                                           key={unit.id}
                                           onClick={() => handleSelectResult(unit.id)}
                                           className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-scada-700 flex items-center justify-between group transition-colors"
                                       >
                                           <div>
                                               <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{unit.name}</div>
                                               <div className="text-xs text-slate-500 font-mono">{unit.id} • {unit.city}</div>
                                           </div>
                                           <ChevronRight size={14} className={`text-slate-300 group-hover:text-scada-accent transition-colors ${lang === 'ar' ? 'rotate-180' : ''}`} />
                                       </button>
                                   ))}
                               </div>
                           ) : (
                               <div className="p-4 text-center text-sm text-slate-500">
                                   {t('noResults', lang)} "{searchTerm}"
                               </div>
                           )}
                       </div>
                   )}
               </div>
            </div>

            <div className={`flex items-center gap-2 md:gap-4 flex-shrink-0 ${lang === 'ar' ? 'mr-2' : 'ml-2'}`}>
                {/* Mobile Search Toggle */}
                <button 
                    onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)} 
                    className="md:hidden p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-scada-700 rounded-full"
                    aria-label="Toggle mobile search"
                >
                    <Search size={20} />
                </button>

                {/* Global Controls */}
                <div className="flex items-center bg-slate-100 dark:bg-scada-900 rounded-lg p-1 border border-slate-200 dark:border-scada-700">
                    {/* Kiosk Mode Toggle - Hidden on small mobile */}
                    <div className="hidden sm:flex items-center px-2 border-r border-slate-200 dark:border-scada-700">
                        <button 
                            onClick={() => setAppState(s => ({...s, isKioskMode: true}))}
                            className="flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-scada-accent transition-colors"
                            title="Enter Kiosk Mode"
                            aria-label="Enter kiosk mode"
                        >
                            <Monitor size={14} />
                        </button>
                    </div>

                    {/* Language - Hidden on Mobile */}
                    <div className="hidden sm:flex items-center px-2 border-r border-slate-200 dark:border-scada-700">
                        <Globe size={14} className={`text-slate-500 dark:text-slate-400 ${lang === 'ar' ? 'ml-2' : 'mr-2'}`} />
                        <select 
                            value={appState.language}
                            onChange={(e) => setAppState(s => ({...s, language: e.target.value as any}))}
                            className="bg-transparent text-xs font-medium text-slate-700 dark:text-slate-200 outline-none cursor-pointer w-10"
                            aria-label="Select language"
                        >
                            <option value="en">EN</option>
                            {isGeco ? (
                                <>
                                    <option value="zh">ZH</option>
                                    <option value="ko">KR</option>
                                </>
                            ) : (
                                <option value="ar">AR</option>
                            )}
                        </select>
                    </div>
                    
                    {/* Currency - Always Visible */}
                    <div className="flex items-center px-2 sm:border-r border-slate-200 dark:border-scada-700">
                        <DollarSign size={14} className={`text-slate-500 dark:text-slate-400 ${lang === 'ar' ? 'ml-1 sm:ml-2' : 'mr-1 sm:mr-2'}`} />
                        <select 
                            value={appState.currency}
                            onChange={(e) => setAppState(s => ({...s, currency: e.target.value as any}))}
                            className="bg-transparent text-xs font-medium text-slate-700 dark:text-slate-200 outline-none cursor-pointer w-12"
                            aria-label="Select currency"
                        >
                            {isGeco ? (
                                <>
                                    <option value="KRW">KRW</option>
                                    <option value="USD">USD</option>
                                    <option value="CNY">CNY</option>
                                </>
                            ) : (
                                <>
                                    <option value="SAR">SAR</option>
                                    <option value="USD">USD</option>
                                    <option value="CNY">CNY</option>
                                    <option value="BHD">BHD</option>
                                </>
                            )}
                        </select>
                    </div>

                    {/* Theme Toggle */}
                    <div className="flex items-center px-2">
                        <button 
                            onClick={toggleTheme}
                            className="flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-scada-accent transition-colors relative group"
                            title="Toggle Theme"
                            aria-label="Toggle theme"
                        >
                            {appState.theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                            {appState.autoTheme && (
                                <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-emerald-500 rounded-full" title="Auto-Theme Enabled"></span>
                            )}
                        </button>
                    </div>
                </div>

                <div className="hidden sm:block h-6 w-px bg-slate-200 dark:bg-scada-700 mx-1"></div>

                <div className="flex items-center gap-2 md:gap-3">
                   <button 
                        className="relative p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                        onClick={() => setAppState(s => ({...s, currentView: 'alerts'}))}
                        aria-label="View alerts"
                   >
                       <Bell size={20} />
                       {appState.notifications.length > 0 && (
                           <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                       )}
                   </button>
                   
                   {/* User Profile - Compact on Mobile */}
                   <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-scada-700 p-1 rounded-lg transition-colors border border-transparent hover:border-slate-200 dark:hover:border-scada-600"
                        onClick={() => setAppState(s => ({...s, currentView: 'settings'}))}
                        role="button"
                        aria-label="User settings"
                   >
                       <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold border-2 border-white dark:border-scada-800 text-white shadow-sm">
                           {appState.user.name.substring(0,2).toUpperCase()}
                       </div>
                       <div className={`hidden lg:block text-xs ${lang === 'ar' ? 'text-left' : 'text-right'}`}>
                           <div className="font-bold text-slate-700 dark:text-slate-200">{appState.user.name}</div>
                           <div className="text-slate-500 dark:text-slate-400">{appState.user.role}</div>
                       </div>
                   </div>
                </div>
            </div>
        </header>
    );
});
