
import React, { useState } from 'react';
import { Card, Badge, Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui';
import { CheckCircle, AlertTriangle, Wrench, Check } from 'lucide-react';
import { MaintenanceTask, InventoryItem } from '../types';

interface MaintenanceProps {
    tasks: MaintenanceTask[];
    inventory: InventoryItem[];
    addToast?: (message: string, type: 'success' | 'error' | 'info') => void;
    lang: 'en' | 'ar' | 'zh' | 'ko';
}

export const MaintenanceView: React.FC<MaintenanceProps> = ({ tasks: initialTasks, inventory, addToast, lang }) => {
    const [view, setView] = useState('tasks');
    const [activeTasks, setActiveTasks] = useState<MaintenanceTask[]>(() => initialTasks.filter(t => t.status !== 'Completed'));
    const [completedHistory, setCompletedHistory] = useState<MaintenanceTask[]>(() => initialTasks.filter(t => t.status === 'Completed'));

    const handleCompleteTask = (taskId: string) => {
        const task = activeTasks.find(t => t.id === taskId);
        if (task) {
            setActiveTasks(prev => prev.filter(t => t.id !== taskId));
            setCompletedHistory(prev => [{...task, status: 'Completed'}, ...prev]);
            
            if (addToast) {
                addToast(`Task ${taskId} marked as complete.`, 'success');
            }
        }
    };

    const isOverdue = (dateStr: string) => {
        return new Date(dateStr) < new Date() && new Date(dateStr).toDateString() !== new Date().toDateString();
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-500 h-full flex flex-col pb-20 md:pb-0">
            {/* Alert Banner */}
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-4 flex items-center justify-between flex-shrink-0">
                <div className="flex items-start gap-4">
                    <AlertTriangle className="text-amber-500 mt-1" size={24} />
                    <div>
                        <h3 className="text-amber-700 dark:text-amber-500 font-bold">Urgent: {activeTasks.filter(t => t.priority === 'High').length} High Priority Tasks</h3>
                        <p className="text-amber-600 dark:text-amber-500/80 text-sm">Review critical maintenance items immediately.</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
                <Tabs value={view} onValueChange={setView} className="h-full flex flex-col">
                    <div className="w-full overflow-x-auto pb-2 no-scrollbar">
                        <TabsList className="mb-2 flex-shrink-0 min-w-max">
                            <TabsTrigger value="tasks" selectedValue={view} onClick={() => setView('tasks')}>Active Tasks ({activeTasks.length})</TabsTrigger>
                            <TabsTrigger value="history" selectedValue={view} onClick={() => setView('history')}>History ({completedHistory.length})</TabsTrigger>
                            <TabsTrigger value="inventory" selectedValue={view} onClick={() => setView('inventory')}>Inventory</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="tasks" selectedValue={view}>
                        <Card title={`Open Tickets`} className="h-full overflow-hidden flex flex-col">
                            <div className="overflow-auto flex-1 custom-scrollbar">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 dark:bg-scada-900 text-xs text-slate-500 dark:text-slate-400 uppercase sticky top-0 z-10">
                                        <tr>
                                            <th className="px-4 py-3">ID</th>
                                            <th className="px-4 py-3">Description</th>
                                            <th className="px-4 py-3 hidden sm:table-cell">Assigned To</th>
                                            <th className="px-4 py-3">Priority</th>
                                            <th className="px-4 py-3 hidden sm:table-cell">Due Date</th>
                                            <th className="px-4 py-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-scada-700">
                                        {activeTasks.length > 0 ? activeTasks.map(task => {
                                            const overdue = isOverdue(task.dueDate);
                                            return (
                                                <tr key={task.id} className={`transition-colors group ${task.priority === 'High' ? 'bg-rose-50/50 dark:bg-rose-900/10 hover:bg-rose-50 dark:hover:bg-rose-900/20' : 'hover:bg-slate-50 dark:hover:bg-scada-700/30'}`}>
                                                    <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400 text-xs">{task.id}</td>
                                                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                                                        {task.description}
                                                        <div className="sm:hidden text-[10px] text-slate-400 mt-1">{task.assignedTo} • {task.dueDate}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 hidden sm:table-cell">{task.assignedTo}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`text-xs px-2 py-1 rounded border ${
                                                            task.priority === 'High' ? 'text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10' : 
                                                            task.priority === 'Medium' ? 'text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10' : 
                                                            'text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10'
                                                        }`}>
                                                            {task.priority}
                                                        </span>
                                                        {overdue && <span className="ml-2 text-[10px] text-rose-500 font-bold animate-pulse hidden sm:inline">OVERDUE</span>}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-500 hidden sm:table-cell font-mono text-xs">{task.dueDate}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button 
                                                            onClick={() => handleCompleteTask(task.id)}
                                                            className="text-emerald-600 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 p-1.5 rounded transition-colors"
                                                            title="Mark Complete"
                                                        >
                                                            <CheckCircle size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr>
                                                <td colSpan={6} className="text-center py-8 text-slate-500 italic">No active maintenance tasks.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </TabsContent>

                    <TabsContent value="history" selectedValue={view}>
                        <Card title="Completed History" className="h-full overflow-hidden flex flex-col">
                            <div className="overflow-auto flex-1 custom-scrollbar">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 dark:bg-scada-900 text-xs text-slate-500 dark:text-slate-400 uppercase sticky top-0 z-10">
                                        <tr>
                                            <th className="px-4 py-3">ID</th>
                                            <th className="px-4 py-3">Description</th>
                                            <th className="px-4 py-3">Technician</th>
                                            <th className="px-4 py-3">Completed Date</th>
                                            <th className="px-4 py-3 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-scada-700">
                                        {completedHistory.length > 0 ? completedHistory.map(task => (
                                            <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-scada-700/30 transition-colors opacity-75">
                                                <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400 text-xs">{task.id}</td>
                                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400 line-through">{task.description}</td>
                                                <td className="px-4 py-3 text-slate-500">{task.assignedTo}</td>
                                                <td className="px-4 py-3 text-slate-500 font-mono text-xs">{new Date().toLocaleDateString()}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className="text-emerald-500 text-xs font-bold flex items-center justify-end gap-1">
                                                        <Check size={12} /> Done
                                                    </span>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan={5} className="text-center py-8 text-slate-500 italic">No completed history.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </TabsContent>

                    <TabsContent value="inventory" selectedValue={view}>
                        <Card title="Spare Parts Inventory" className="h-full overflow-hidden flex flex-col">
                            <div className="overflow-auto flex-1 custom-scrollbar">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 dark:bg-scada-900 text-xs text-slate-500 dark:text-slate-400 uppercase sticky top-0 z-10">
                                        <tr>
                                            <th className="px-4 py-3">Item Name</th>
                                            <th className="px-4 py-3">SKU</th>
                                            <th className="px-4 py-3">Category</th>
                                            <th className="px-4 py-3 text-right">Qty</th>
                                            <th className="px-4 py-3 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-scada-700">
                                        {inventory.map(item => (
                                            <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-scada-700/30 transition-colors">
                                                <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">{item.name}</td>
                                                <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.sku}</td>
                                                <td className="px-4 py-3 text-slate-500">{item.category}</td>
                                                <td className="px-4 py-3 text-right font-bold font-mono">{item.quantity}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <Badge variant={item.status === 'In Stock' ? 'success' : item.status === 'Low Stock' ? 'warning' : 'danger'}>
                                                        {item.status}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};
