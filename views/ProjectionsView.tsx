
import React, { useMemo } from 'react';
import { Card } from '../components/ui';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { TrendingUp, Target, PieChart } from 'lucide-react';
import { getAggregatedFleetData } from '../data/MachineRepository';

export const ProjectionsView: React.FC = () => {
    // Generate Forecast based on actual history
    const forecastData = useMemo(() => {
        const history = getAggregatedFleetData('2025'); // Use 2025 as baseline
        const monthlyAgg: Record<string, number> = {};
        
        history.forEach(d => {
            const m = d.date.substring(0, 7);
            monthlyAgg[m] = (monthlyAgg[m] || 0) + d.recoveredLiters;
        });

        // Simple linear projection logic
        const months = Object.keys(monthlyAgg).sort();
        const last6Months = months.slice(-6);
        const avgGrowth = 1.05; // 5% Month over Month Growth assumption

        let lastVal = monthlyAgg[last6Months[last6Months.length - 1]] || 15000;

        return Array.from({ length: 6 }, (_, i) => {
            const nextVal = lastVal * avgGrowth;
            lastVal = nextVal;
            const date = new Date();
            date.setMonth(date.getMonth() + i + 1);
            
            return {
                month: date.toLocaleString('default', { month: 'short', year: '2-digit' }),
                forecast: Math.round(nextVal),
                confidenceLower: Math.round(nextVal * 0.9),
                confidenceUpper: Math.round(nextVal * 1.1)
            };
        });
    }, []);

    // Metric Summary
    const totalProjectedRevenue = forecastData.reduce((acc, curr) => acc + (curr.forecast * 2.4), 0);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <TrendingUp className="text-scada-accent" />
                Statistical Projections
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-scada-800 p-6 rounded-xl border border-scada-700 flex flex-col justify-between h-40">
                    <div>
                        <h3 className="text-slate-400 text-sm font-medium">Projected Revenue (6 Mo)</h3>
                        <div className="text-3xl font-bold text-white mt-1">{totalProjectedRevenue.toLocaleString(undefined, {style: 'currency', currency: 'SAR', maximumFractionDigits: 0})}</div>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-400 text-sm">
                        <TrendingUp size={16} /> Based on actual fleet output
                    </div>
                </div>
                <div className="bg-scada-800 p-6 rounded-xl border border-scada-700 flex flex-col justify-between h-40">
                    <div>
                        <h3 className="text-slate-400 text-sm font-medium">Recovery Efficiency Goal</h3>
                        <div className="text-3xl font-bold text-white mt-1">99.2%</div>
                    </div>
                    <div className="flex items-center gap-2 text-blue-400 text-sm">
                        <Target size={16} /> Q4 Target
                    </div>
                </div>
                <div className="bg-scada-800 p-6 rounded-xl border border-scada-700 flex flex-col justify-between h-40">
                    <div>
                        <h3 className="text-slate-400 text-sm font-medium">Market Share Projection</h3>
                        <div className="text-3xl font-bold text-white mt-1">35%</div>
                    </div>
                    <div className="flex items-center gap-2 text-amber-400 text-sm">
                        <PieChart size={16} /> Expanding Leadership
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Recovery Volume Forecast (Next 6 Months)" className="h-96">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <AreaChart data={forecastData}>
                            <defs>
                                <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="month" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" />
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }} />
                            <Legend />
                            <Area type="monotone" dataKey="forecast" stroke="#8884d8" fillOpacity={1} fill="url(#colorForecast)" name="Forecast Volume" />
                            <Line type="monotone" dataKey="confidenceUpper" stroke="#22c55e" strokeDasharray="5 5" name="Upper Bound" />
                            <Line type="monotone" dataKey="confidenceLower" stroke="#f97316" strokeDasharray="5 5" name="Lower Bound" />
                        </AreaChart>
                    </ResponsiveContainer>
                </Card>

                <Card title="Revenue Scenarios (SAR)" className="h-96">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <BarChart data={forecastData.map(d => ({
                            month: d.month,
                            conservative: d.confidenceLower * 2.4,
                            aggressive: d.confidenceUpper * 2.4
                        }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="month" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" tickFormatter={(v) => `${v/1000}k`} />
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }} formatter={(v) => v.toLocaleString()} />
                            <Legend />
                            <Bar dataKey="conservative" fill="#0ea5e9" name="Conservative Rev." />
                            <Bar dataKey="aggressive" fill="#f97316" name="Aggressive Rev." />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
            </div>
        </div>
    );
};
