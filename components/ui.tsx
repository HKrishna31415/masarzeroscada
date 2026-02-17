
import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export const Card: React.FC<{ children: React.ReactNode; className?: string; title?: string; action?: React.ReactNode }> = ({ children, className = '', title, action }) => (
  <div className={`bg-white dark:bg-scada-800 border border-slate-200 dark:border-scada-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col ${className}`}>
    {(title || action) && (
        <div className="px-5 py-4 border-b border-slate-100 dark:border-scada-700 flex justify-between items-center bg-slate-50/30 dark:bg-white/[0.02] rounded-t-xl">
            {title && <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 tracking-wide uppercase">{title}</h3>}
            {action && <div>{action}</div>}
        </div>
    )}
    <div className="p-5 flex-1 text-slate-700 dark:text-slate-300">{children}</div>
  </div>
);

export const Badge: React.FC<{ children: React.ReactNode; variant?: 'success' | 'warning' | 'danger' | 'neutral' }> = ({ children, variant = 'neutral' }) => {
  const styles = {
    success: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
    warning: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    danger: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold border shadow-sm ${styles[variant]}`}>
      {children}
    </span>
  );
};

export const StatCard: React.FC<{ label: string; value: string | number; subValue?: string; icon: React.ReactNode; trend?: 'up' | 'down' | 'neutral' }> = ({ label, value, subValue, icon, trend }) => (
    <div className="bg-white dark:bg-scada-800 p-5 rounded-xl border border-slate-200 dark:border-scada-700 hover:border-teal-400 dark:hover:border-scada-600 transition-colors group shadow-sm dark:shadow-none relative overflow-hidden">
        <div className="flex justify-between items-start mb-2 relative z-10">
            <div className="text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">{label}</div>
            <div className="p-2 bg-slate-100 dark:bg-scada-700 rounded-lg text-scada-accent group-hover:bg-teal-50 dark:group-hover:text-white transition-colors shadow-sm">{icon}</div>
        </div>
        <div className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight relative z-10">{value}</div>
        {subValue && (
            <div className={`text-xs mt-1 flex items-center gap-1 font-medium relative z-10 ${trend === 'up' ? 'text-emerald-700 dark:text-emerald-400' : trend === 'down' ? 'text-rose-700 dark:text-rose-400' : 'text-slate-500'}`}>
                {subValue}
            </div>
        )}
        {/* Subtle hover gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent to-slate-50 dark:to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
    </div>
);

export const ProgressBar: React.FC<{ value: number; max: number; color?: string }> = ({ value, max, color = 'bg-scada-accent' }) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    return (
        <div className="h-2 w-full bg-slate-100 dark:bg-scada-900 rounded-full overflow-hidden border border-slate-200 dark:border-white/5">
            <div className={`h-full ${color} transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,0,0,0.1)]`} style={{ width: `${percentage}%` }}></div>
        </div>
    );
};

export const Tabs: React.FC<{ children: React.ReactNode; value: string; onValueChange: (v: string) => void; className?: string }> = ({ children, className = '' }) => (
  <div className={`flex flex-col ${className}`}>{children}</div>
);

export const TabsList: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`flex bg-slate-100 dark:bg-scada-900/50 p-1 rounded-xl border border-slate-200 dark:border-scada-700 self-start ${className}`}>{children}</div>
);

export const TabsTrigger: React.FC<{ children: React.ReactNode; value: string; selectedValue?: string; onClick?: () => void }> = ({ children, value, selectedValue, onClick }) => (
  <button 
    onClick={onClick}
    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
        selectedValue === value 
        ? 'bg-white dark:bg-scada-700 text-slate-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10' 
        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5'
    }`}
  >
    {children}
  </button>
);

export const TabsContent: React.FC<{ children: React.ReactNode; value: string; selectedValue?: string }> = ({ children, value, selectedValue }) => {
  if (value !== selectedValue) return null;
  return <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">{children}</div>;
};

export const Gauge: React.FC<{ value: number; min: number; max: number; label: string; unit: string; color?: string }> = ({ value, min, max, label, unit, color = '#14b8a6' }) => {
  const percent = Math.min(1, Math.max(0, (value - min) / (max - min)));
  const circumference = 2 * Math.PI * 40; // r=40
  const offset = circumference - (percent * circumference * 0.75); // 75% circle gauge

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative w-32 h-32 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-[135deg]">
          {/* Track */}
          <circle cx="50%" cy="50%" r="40" className="stroke-slate-100 dark:stroke-[#1e293b]" strokeWidth="8" fill="transparent" strokeDasharray={`${circumference * 0.75} ${circumference}`} strokeLinecap="round" />
          {/* Progress */}
          <circle 
            cx="50%" 
            cy="50%" 
            r="40" 
            stroke={color} 
            strokeWidth="8" 
            fill="transparent" 
            strokeDasharray={`${circumference * 0.75} ${circumference}`} 
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out drop-shadow-md"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</span>
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">{unit}</span>
        </div>
      </div>
      <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mt-[-20px]">{label}</span>
    </div>
  );
};

// --- NEW TOAST COMPONENT ---

export interface ToastProps {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ id, message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => onClose(id), 4000);
        return () => clearTimeout(timer);
    }, [id, onClose]);

    const styles = {
        success: 'bg-white dark:bg-scada-800 border-l-4 border-emerald-500 text-slate-800 dark:text-white',
        error: 'bg-white dark:bg-scada-800 border-l-4 border-rose-500 text-slate-800 dark:text-white',
        info: 'bg-white dark:bg-scada-800 border-l-4 border-teal-500 text-slate-800 dark:text-white',
        warning: 'bg-white dark:bg-scada-800 border-l-4 border-amber-500 text-slate-800 dark:text-white',
    };

    const icons = {
        success: <CheckCircle className="text-emerald-500" size={18} />,
        error: <AlertCircle className="text-rose-500" size={18} />,
        info: <Info className="text-teal-500" size={18} />,
        warning: <AlertTriangle className="text-amber-500" size={18} />,
    };

    return (
        <div className={`${styles[type]} shadow-2xl rounded-lg p-4 flex items-center gap-3 min-w-[320px] animate-in slide-in-from-right-10 fade-in duration-300 pointer-events-auto ring-1 ring-black/5 dark:ring-white/10`}>
            {icons[type]}
            <p className="flex-1 text-sm font-medium">{message}</p>
            <button onClick={() => onClose(id)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                <X size={16} />
            </button>
        </div>
    );
};

// --- UTILS ---

export const formatDateFriendly = (dateInput: string | Date) => {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return String(dateInput);
    
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    return `${day} ${month} ${year}, ${time}`;
};
