
import React, { useState, useEffect, useMemo } from 'react';
import { Search, LayoutDashboard, Map, Server, FileText, Settings, ArrowRight, Wrench, AlertCircle, DollarSign } from 'lucide-react';
import { VRU, ViewState } from '../types';

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (view: ViewState, params?: any) => void;
    fleet: VRU[];
}

interface SearchItem {
    id: string;
    title: string;
    icon: React.ReactNode;
    type: string;
    sub?: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onNavigate, fleet }) => {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);

    const pages: SearchItem[] = [
        { id: 'dashboard', title: 'Dashboard', icon: <LayoutDashboard size={14} />, type: 'Page' },
        { id: 'maps', title: 'Fleet Map', icon: <Map size={14} />, type: 'Page' },
        { id: 'financial', title: 'Financial Analysis', icon: <DollarSign size={14} />, type: 'Page' },
        { id: 'maintenance', title: 'Maintenance Operations', icon: <Wrench size={14} />, type: 'Page' },
        { id: 'alerts', title: 'System Alerts', icon: <AlertCircle size={14} />, type: 'Page' },
        { id: 'settings', title: 'Settings', icon: <Settings size={14} />, type: 'Page' },
    ];

    // Reset selection when query changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    const results = useMemo(() => {
        if (!query) return pages;

        const lowerQuery = query.toLowerCase();
        
        // Filter Pages
        const filteredPages = pages.filter(p => p.title.toLowerCase().includes(lowerQuery));
        
        // Filter Machines
        const filteredMachines: SearchItem[] = fleet
            .filter(u => u.name.toLowerCase().includes(lowerQuery) || u.id.toLowerCase().includes(lowerQuery) || u.city.toLowerCase().includes(lowerQuery))
            .slice(0, 5)
            .map(u => ({
                id: u.id,
                title: u.name,
                sub: `${u.id} • ${u.city}`,
                icon: <Server size={14} />,
                type: 'Asset'
            }));

        return [...filteredPages, ...filteredMachines];
    }, [query, fleet]);

    // Keyboard Trap
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % results.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (results[selectedIndex]) {
                    handleSelect(results[selectedIndex]);
                }
            } else if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedIndex, query, results]); // Added results to dep array

    const handleSelect = (item: SearchItem) => {
        if (item.type === 'Page') {
            onNavigate(item.id as ViewState);
        } else {
            // It's a machine
            onNavigate('machine-detail', item.id);
        }
        onClose();
        setQuery('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[20vh] animate-in fade-in duration-200" onClick={onClose}>
            <div className="w-full max-w-lg bg-white dark:bg-[#1e293b] rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                    <Search className="text-slate-400" size={18} />
                    <input 
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Type a command or search..."
                        className="flex-1 bg-transparent text-sm text-slate-800 dark:text-white outline-none placeholder:text-slate-400"
                    />
                    <div className="text-[10px] font-bold bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-500">ESC</div>
                </div>
                
                <div className="max-h-[300px] overflow-y-auto p-2">
                    {results.length > 0 ? results.map((item, idx) => (
                        <button
                            key={item.id}
                            onClick={() => handleSelect(item)}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${idx === selectedIndex ? 'bg-scada-accent text-white' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-1.5 rounded-md ${idx === selectedIndex ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                    {item.icon}
                                </div>
                                <div className="text-left">
                                    <div className="font-medium">{item.title}</div>
                                    {item.sub && <div className={`text-[10px] ${idx === selectedIndex ? 'text-white/70' : 'text-slate-400'}`}>{item.sub}</div>}
                                </div>
                            </div>
                            {idx === selectedIndex && <ArrowRight size={14} />}
                        </button>
                    )) : (
                        <div className="p-8 text-center text-slate-400 text-sm">No results found.</div>
                    )}
                </div>
                
                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 text-[10px] text-slate-400 flex justify-between">
                    <span>ProTip: Use arrow keys to navigate</span>
                    <span>MasarZero SCADA</span>
                </div>
            </div>
        </div>
    );
};
