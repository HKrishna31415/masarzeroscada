
import React, { useMemo } from 'react';
import { Card, formatDateFriendly } from './ui';
import { getMachineData } from '../data/MachineRepository';
import { generateMaintenanceTasks } from '../mockData';
import { CheckCircle, AlertTriangle, Info, Wrench, FileText, Droplet } from 'lucide-react';
import { VRU } from '../types';

interface ActivityFeedProps {
    fleet?: VRU[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = React.memo(({ fleet = [] }) => {
    
    // Generate feed items algorithmically from fleet data and tasks
    const feedItems = useMemo(() => {
        const items = [];
        // Use the passed fleet prop for consistency, fallback if needed (though app structure ensures it's passed)
        const currentFleet = fleet; 
        const maintenanceTasks = generateMaintenanceTasks(currentFleet);

        // 0. Inject Manual Report (Simulation)
        items.push({
            id: 'MANUAL_RPT_LIVE',
            time: 'Just Now',
            msg: 'Operator Report: Gasoline spill incident (Feb 3rd) on King Faisal Road manually logged. Reason: Oil pump failure.',
            type: 'warning',
            category: 'report',
            timestamp: Date.now() + 100000 // Future timestamp to ensure it stays at top
        });

        // 0.1 Inject Airport 3 Resolution
        items.push({
            id: 'RES-A03-FIX',
            time: '11:45 AM, Feb 6th 2026',
            msg: 'Maintenance Report: Airport 3 Oil pump overload fault cleared. System restarted successfully.',
            type: 'success',
            category: 'fix',
            timestamp: new Date('2026-02-06T11:45:00').getTime()
        });

        // --- NEW RESOLUTION INJECTIONS ---
        
        // Evaporator Freezing Fixed (Feb 20, 2025) - Airport 3
        items.push({
            id: 'RES-A03-ICE-FIX',
            time: '08:30 AM, Feb 20th 2025',
            msg: 'Resolved: Airport 3 Evaporator froze. Ice cleared manually, PLC setpoints adjusted.',
            type: 'success',
            category: 'fix',
            timestamp: new Date('2025-02-20T08:30:00').getTime()
        });

        // Raffaya Fixed (Feb 10)
        items.push({
            id: 'RES-RAF-FIX',
            time: '09:15 AM, Feb 10th 2026',
            msg: 'Resolved: Raffaya Air pump failure addressed. Pump replaced and calibrated.',
            type: 'success',
            category: 'fix',
            timestamp: new Date('2026-02-10T09:15:00').getTime()
        });

        // Thaneem Fixed (Feb 9)
        items.push({
            id: 'RES-THM-FIX',
            time: '10:00 AM, Feb 9th 2026',
            msg: 'Resolved: Thaneem Freon loop pressure variance stabilized. Refrigerant charged.',
            type: 'success',
            category: 'fix',
            timestamp: new Date('2026-02-09T10:00:00').getTime()
        });

        // King Faisal Road Fixed (Feb 8)
        items.push({
            id: 'RES-KFR-FIX',
            time: '04:45 PM, Feb 8th 2026',
            msg: 'Resolved: King Faisal Road Oil pump overload cleared. Thermal relay reset.',
            type: 'success',
            category: 'fix',
            timestamp: new Date('2026-02-08T16:45:00').getTime()
        });

        // King Abdullah Road Fixed (Feb 7)
        items.push({
            id: 'RES-KRA-FIX',
            time: '01:20 PM, Feb 7th 2026',
            msg: 'Resolved: King Abdullah Road Oil pump overload cleared. System online.',
            type: 'success',
            category: 'fix',
            timestamp: new Date('2026-02-07T13:20:00').getTime()
        });

        // 1. Add Maintenance Activities
        maintenanceTasks.forEach(task => {
            const vru = currentFleet.find(f => f.id === task.vruId);
            items.push({
                id: `maint-${task.id}`,
                time: formatDateFriendly(task.dueDate), // Use friendly date format
                msg: `${task.description} scheduled for ${vru?.name || task.vruId}`,
                type: 'info',
                category: 'maintenance',
                timestamp: new Date(task.dueDate).getTime()
            });
        });

        // 2. Add Critical Alert Activities
        currentFleet.forEach(vru => {
            vru.alerts.forEach(alert => {
                // Only show unacknowledged alerts in the feed as warnings to avoid duplicates with resolution success messages
                if (!alert.acknowledged) {
                    items.push({
                        id: alert.id,
                        time: formatDateFriendly(alert.timestamp), // Use friendly date format
                        msg: `Alert: ${alert.message} on ${vru.name}`,
                        type: alert.severity === 'Critical' ? 'warning' : 'info',
                        category: 'alert',
                        timestamp: new Date(alert.timestamp).getTime()
                    });
                }
            });
        });

        // 3. Scan Repository for "Breakdown" events (Sudden 0s)
        const trackedIds = ['VRU-KFR', 'VRU-A03', 'VRU-A02']; // Focus on notable units
        trackedIds.forEach(id => {
            const data = getMachineData(id);
            const daily = data.daily;
            
            // Find transitions to 0
            for (let i = 1; i < daily.length; i++) {
                if (daily[i].recoveredLiters === 0 && daily[i-1].recoveredLiters > 0) {
                    const date = daily[i].date;
                    const vruName = currentFleet.find(f => f.id === id)?.name || id;
                    
                    // Filter recent events only (e.g., late 2025)
                    if (date.startsWith('2025-08') || date.startsWith('2025-09')) {
                        items.push({
                            id: `fail-${id}-${date}`,
                            time: formatDateFriendly(date), // Use friendly date format
                            msg: `${vruName} output dropped to 0L (System Offline)`,
                            type: 'warning',
                            category: 'outage',
                            timestamp: new Date(date).getTime()
                        });
                    }
                }
            }
        });

        // Sort by timestamp descending
        return items.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10); // Increased slice to show more recent fixes
    }, [fleet]);

    const getIcon = (category: string, type: string) => {
        if (type === 'success') return <CheckCircle size={14} className="text-emerald-500" />;
        if (type === 'warning') return <AlertTriangle size={14} className="text-rose-500" />;
        switch(category) {
            case 'maintenance': return <Wrench size={14} className="text-blue-500" />;
            case 'report': return <FileText size={14} className="text-amber-500" />;
            case 'outage': return <Droplet size={14} className="text-rose-500" />;
            default: return <Info size={14} className="text-slate-500" />;
        }
    };

    return (
        <Card title="Recent Activity" className="flex-1 h-full content-visibility-auto">
            <div className="space-y-0 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {feedItems.length > 0 ? feedItems.map((item, idx) => (
                    <div key={item.id} className="flex gap-3 items-start p-3 border-b border-slate-100 dark:border-scada-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-scada-700/30 transition-colors group">
                        <div className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                            item.type === 'success' ? 'bg-emerald-100 dark:bg-emerald-500/10' : 
                            item.type === 'warning' ? 'bg-rose-100 dark:bg-rose-500/10' : 
                            'bg-slate-100 dark:bg-slate-800'
                        }`}>
                            {getIcon(item.category || 'info', item.type)}
                        </div>
                        <div>
                            <p className={`text-xs leading-snug font-medium ${item.type === 'warning' ? 'text-slate-800 dark:text-slate-200' : 'text-slate-600 dark:text-slate-400'}`}>
                                {item.msg}
                            </p>
                            <span className="text-[10px] text-slate-400 font-mono mt-1 block">{item.time}</span>
                        </div>
                    </div>
                )) : (
                    <div className="text-center text-slate-500 text-xs py-4">No recent activity found.</div>
                )}
            </div>
        </Card>
    );
});
