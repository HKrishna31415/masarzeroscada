
import React, { useState, useMemo, useRef } from 'react';
import { Card, formatDateFriendly } from '../components/ui';
import { FileText, GripVertical, Plus, Save, Trash2, Users, RefreshCw, X, AlertTriangle, CheckCircle, Wrench, WifiOff, DollarSign, Calendar, TrendingUp, BarChart3, Table as TableIcon, Leaf, Trophy, PieChart, MapPin, Activity, Settings, Printer, Signal, Database, Thermometer, ArrowRightLeft, ShieldCheck, Copy, ChevronDown, ChevronUp, Palette, Stamp, Upload, Image as ImageIcon, ClipboardList, Scissors, List as ListIcon, BookOpen, Layers, Sparkles, Loader2 } from 'lucide-react';
import { VRU, DailyRecord, MonthlyRecord, ClientBranding } from '../types';
import { getMachineData, TODAY_CUTOFF } from '../data/MachineRepository';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, AreaChart, Area, BarChart, Bar, Legend, Tooltip } from 'recharts';
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

interface ReportSection {
    id: string;
    title: string;
    type: 'active_by_region' | 'units_with_alerts' | 'offline_units' | 'custom_text' | 'fleet_summary' | 'financial_impact' | 'maintenance_schedule' | 'asset_register' | 'efficiency_dist' | 'performance_leaders' | 'alarm_summary' | 'esg_impact' | 'single_unit_detail' | 'fleet_status_matrix' | 'comparison_matrix' | 'roi_certificate' | 'page_break' | 'table_of_contents' | 'regional_analysis';
    config: {
        region?: string;
        showResolution?: boolean;
        unitId?: string; 
        unitId2?: string; // For comparison
        showChart?: boolean;
        showTechParams?: boolean;
        showDiagnostics?: boolean;
        textContent?: string; // For custom text section
    };
    isCollapsed?: boolean;
}

interface ReportBuilderProps {
    fleet: VRU[];
    client?: ClientBranding;
}

export const ReportBuilderView: React.FC<ReportBuilderProps> = ({ fleet, client }) => {
    // --- State ---
    const [reportMeta, setReportMeta] = useState({
        clientName: client?.name || 'Sasco',
        reportTitle: 'Operational Status Report',
        date: TODAY_CUTOFF, // Default to System "Today"
        primaryColor: client?.primaryColor || '#009095',
        watermarkText: '',
        showWatermark: false,
        clientLogo: client?.logoUrl || 'https://media.majarracdn.cloud/manhom/mgmt/images/6575/1730119204/%D8%A7%D9%84%D8%B4%D8%B1%D9%83%D8%A9-%D8%A7%D9%84%D8%B3%D8%B9%D9%88%D8%AF%D9%8A%D8%A9-%D9%84%D8%AE%D8%AF%D9%85%D8%A7%D8%AA-%D8%A7%D9%84%D8%B3%D9%8A%D8%A7%D8%B1%D8%A7%D8%AA-%D9%88%D8%A7%D9%84%D9%85.webp',
        watermarkType: 'logo' as 'text' | 'logo',
        // Default Time Frame: Last 30 Days from System "Today"
        periodStart: new Date(new Date(TODAY_CUTOFF).setDate(new Date(TODAY_CUTOFF).getDate() - 30)).toISOString().split('T')[0],
        periodEnd: TODAY_CUTOFF
    });

    const [sections, setSections] = useState<ReportSection[]>([
        { id: 'sec_1', title: 'Executive Summary', type: 'fleet_summary', config: {}, isCollapsed: false },
        { id: 'sec_matrix', title: 'Fleet Status Overview', type: 'fleet_status_matrix', config: {}, isCollapsed: false },
        { id: 'sec_unit_1', title: `Deep Dive: ${fleet[0]?.name || 'Asset'}`, type: 'single_unit_detail', config: { unitId: fleet[0]?.id, showChart: true, showTechParams: true, showDiagnostics: true }, isCollapsed: false },
        { id: 'sec_roi', title: 'Financial Value Created', type: 'roi_certificate', config: {}, isCollapsed: false }
    ]);

    const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

    const installedFleet = useMemo(() => fleet.filter(f => f.status !== 'Pending_Install'), [fleet]);

    // --- Helpers ---
    const getRemediationSteps = (alertMsg: string): string[] => {
        const lowerMsg = alertMsg.toLowerCase();
        // Specific Overload Logic
        if (lowerMsg.includes('overload')) return ['Reset the thermal overload relay', 'Check motor amperage draw', 'Inspect pump for mechanical binding'];
        
        if (lowerMsg.includes('valve')) return ['Inspect valve seating for obstructions', 'Check pressure calibration', 'Verify solenoid operation'];
        if (lowerMsg.includes('sensor')) return ['Clean sensor head', 'Check wiring harness for continuity', 'Recalibrate zero point'];
        if (lowerMsg.includes('network') || lowerMsg.includes('connectivity')) return ['Cycle power on modem', 'Check antenna signal strength', 'Verify static IP configuration'];
        if (lowerMsg.includes('pump')) return ['Check motor amperage draw', 'Inspect pump seals for leaks', 'Verify inlet pressure is within range'];
        if (lowerMsg.includes('vapor')) return ['Inspect pressure vacuum vent', 'Check tank seals for integrity', 'Monitor return line flow'];
        return ['Review system logs for error codes', 'Perform visual inspection of skid', 'Perform soft system restart'];
    };

    const filterDataByDate = (data: DailyRecord[]) => {
        return data.filter(d => d.date >= reportMeta.periodStart && d.date <= reportMeta.periodEnd);
    };

    // --- GENERATOR LOGIC FOR REGIONAL ANALYSIS ---
    const generateAnalysisText = () => {
        const regions = ['Central', 'Southern', 'Western', 'Eastern', 'Bahrain'];
        let fullText = "REGIONAL PERFORMANCE & DIAGNOSTICS REPORT\n\n";

        regions.forEach((region, rIdx) => {
            const regionUnits = installedFleet.filter(u => u.region === region);
            if (regionUnits.length === 0) return;

            fullText += `## SECTION ${rIdx + 1}: ${region.toUpperCase()} REGION\n`;
            
            regionUnits.forEach(unit => {
                const data = getMachineData(unit.id);
                
                // Get Metrics
                // 1. Current (Last 7 Days Avg)
                const recentRecs = data.daily.slice(-7);
                const currentAvg = recentRecs.length > 0 
                    ? Math.round(recentRecs.reduce((a, b) => a + b.recoveredLiters, 0) / recentRecs.length) 
                    : 0;

                // 2. Feb 2025 (Winter Proxy 1)
                const febRecs = data.daily.filter(d => d.date.startsWith('2025-02'));
                const febAvg = febRecs.length > 0 
                    ? Math.round(febRecs.reduce((a, b) => a + b.recoveredLiters, 0) / febRecs.length) 
                    : 0;

                // 3. Dec 2025 (Winter Proxy 2)
                const decRecs = data.daily.filter(d => d.date.startsWith('2025-12'));
                const decAvg = decRecs.length > 0 
                    ? Math.round(decRecs.reduce((a, b) => a + b.recoveredLiters, 0) / decRecs.length) 
                    : 0;

                fullText += `\n**${unit.name} (${unit.city})**\n`;
                fullText += `Status: ${unit.status}\n`;
                fullText += `- Current Output: ${currentAvg} L/day\n`;
                fullText += `- Feb '25 Baseline: ${febAvg} L/day\n`;
                fullText += `- Dec '25 Baseline: ${decAvg} L/day\n`;

                if (unit.status !== 'Running') {
                    fullText += `! CRITICAL: Unit is ${unit.status}. Zero recovery.\n`;
                } else if (currentAvg < (febAvg * 0.7) && febAvg > 0) {
                    fullText += `! OBSERVATION: Performance is ${Math.round((1 - currentAvg/febAvg)*100)}% below seasonal benchmark.\n`;
                }

                // Only include ACTIVE (unacknowledged) alerts in the report text
                const activeAlerts = unit.alerts.filter(a => !a.acknowledged);
                
                if (activeAlerts.length > 0) {
                    activeAlerts.forEach(alert => {
                        fullText += `  > ALERT: ${alert.message}\n`;
                        if (alert.message.includes('Pressure vacuum valve')) {
                            fullText += `  > ACTION: Install P/V valve (Model PV-S4) immediately.\n`;
                        } else if (alert.message.includes('overload')) {
                            fullText += `  > ACTION: Reset thermal relay and check amperage.\n`;
                        } else {
                            fullText += `  > ACTION: ${getRemediationSteps(alert.message)[0]}\n`;
                        }
                    });
                } else if (unit.status === 'Running' && currentAvg === 0) {
                     fullText += `  > ANOMALY: Running with 0L recovery. Check flow meter.\n`;
                }
            });
            fullText += "\n--------------------------------------------------\n";
        });

        return fullText;
    };

    const addSection = (type: ReportSection['type'], title: string) => {
        let config: any = {};
        
        if (type === 'units_with_alerts') config = { showResolution: true };
        else if (type === 'single_unit_detail') config = { unitId: installedFleet[0]?.id, showChart: true, showTechParams: true, showDiagnostics: true };
        else if (type === 'comparison_matrix') config = { unitId: installedFleet[0]?.id, unitId2: installedFleet[1]?.id };
        else if (type === 'custom_text') config = { textContent: 'Enter your custom report text here...' };
        else if (type === 'regional_analysis') config = { textContent: generateAnalysisText() };

        setSections([...sections, {
            id: `sec_${Date.now()}`,
            title,
            type,
            config,
            isCollapsed: false
        }]);
        setIsAddMenuOpen(false);
    };

    const bulkAddUnits = (status: 'Running' | 'Offline' | 'All') => {
        const targets = installedFleet.filter(u => status === 'All' ? true : u.status === status);
        const newSections = targets.map(u => ({
            id: `sec_bulk_${u.id}_${Date.now()}`,
            title: `Deep Dive: ${u.name}`,
            type: 'single_unit_detail' as const,
            config: { unitId: u.id, showChart: true, showTechParams: true, showDiagnostics: true },
            isCollapsed: true
        }));
        setSections([...sections, ...newSections]);
        setIsAddMenuOpen(false);
    };

    const removeSection = (id: string) => {
        setSections(sections.filter(s => s.id !== id));
    };

    const duplicateSection = (id: string) => {
        const originalIndex = sections.findIndex(s => s.id === id);
        if (originalIndex === -1) return;
        const original = sections[originalIndex];
        const newSection = {
            ...original,
            id: `sec_${Date.now()}`,
            title: `${original.title} (Copy)`,
            isCollapsed: false
        };
        const newSections = [...sections];
        newSections.splice(originalIndex + 1, 0, newSection);
        setSections(newSections);
    };

    const toggleCollapse = (id: string) => {
        setSections(sections.map(s => s.id === id ? { ...s, isCollapsed: !s.isCollapsed } : s));
    };

    const moveSection = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === sections.length - 1) return;
        
        const newSections = [...sections];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
        setSections(newSections);
    };

    const updateSectionConfig = (index: number, key: string, value: any) => {
        const newSections = [...sections];
        if (key === 'unitId' && newSections[index].type === 'single_unit_detail') {
            const unit = installedFleet.find(u => u.id === value);
            if (unit) newSections[index].title = `Deep Dive: ${unit.name}`;
        }
        newSections[index].config = { ...newSections[index].config, [key]: value };
        setSections(newSections);
    };

    const handleGeneratePDF = async () => {
        if (!printRef.current) return;
        setIsGenerating(true);

        try {
            const canvas = await html2canvas(printRef.current, {
                scale: 2, // Higher resolution
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const imgWidth = 210; // A4 width in mm
            const pageHeight = 297; // A4 height in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            let heightLeft = imgHeight;
            let position = 0;

            // Add first page
            pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            // Add subsequent pages if content overflows
            while (heightLeft > 0) {
                position = heightLeft - imgHeight; // Move the image up
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            pdf.save(`${reportMeta.clientName}_Report_${reportMeta.date}.pdf`);
        } catch (error) {
            console.error("PDF Generation failed", error);
            alert("Failed to generate PDF. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setReportMeta(prev => ({ ...prev, clientLogo: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    // --- Rendering Preview Logic ---

    const renderSectionPreview = (section: ReportSection) => {
        switch (section.type) {
            case 'page_break':
                return (
                    <div className="flex items-center justify-center p-6 border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 gap-2 rounded select-none">
                        <Scissors size={16} /> --- PAGE BREAK ---
                    </div>
                );

            case 'table_of_contents':
                return (
                    <div className="p-6 border border-slate-200 rounded-xl bg-white">
                        <h2 className="text-2xl font-bold mb-6 text-slate-800 border-b border-slate-100 pb-2">Table of Contents</h2>
                        <div className="space-y-3">
                            {sections.filter(s => s.type !== 'table_of_contents' && s.type !== 'page_break').map((s, i) => (
                                <div key={s.id} className="flex items-baseline justify-between border-b border-dotted border-slate-300 pb-1">
                                    <div className="flex items-center gap-3">
                                        <span className="text-slate-400 font-mono text-xs">{String(i + 1).padStart(2, '0')}</span>
                                        <span className="text-slate-700 font-medium">{s.title}</span>
                                    </div>
                                    <span className="text-slate-400 text-xs">Page {Math.ceil((i + 1) / 2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'custom_text':
            case 'regional_analysis':
                return (
                    <div className="p-6 border border-slate-200 rounded-xl bg-white">
                        <div className="prose prose-slate max-w-none text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-mono">
                            {section.config.textContent || "Enter your text content here..."}
                        </div>
                    </div>
                );

            case 'financial_impact': {
                // Calculate real aggregated financial data based on period
                let totalRev = 0;
                let totalRecovered = 0;
                let totalOpEx = 0;

                installedFleet.forEach(u => {
                    const data = getMachineData(u.id);
                    const filtered = filterDataByDate(data.daily);
                    const vol = filtered.reduce((acc, curr) => acc + curr.recoveredLiters, 0);
                    const rev = filtered.reduce((acc, curr) => acc + curr.salesAmount, 0);
                    // Estimate OpEx (approx 20% of revenue + fixed 100 per day)
                    const opEx = (rev * 0.2) + (filtered.length * 100); 
                    
                    totalRev += rev;
                    totalRecovered += vol;
                    totalOpEx += opEx;
                });

                const netProfit = totalRev - totalOpEx;
                const margin = totalRev > 0 ? (netProfit / totalRev) * 100 : 0;

                return (
                    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden p-6">
                        <h4 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Financial Performance Summary</h4>
                        <div className="grid grid-cols-2 gap-8 mb-6">
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <div className="text-sm text-slate-600 mb-1">Total Revenue</div>
                                <div className="text-2xl font-bold text-slate-800">{totalRev.toLocaleString(undefined, {style: 'currency', currency: fleet[0]?.id === 'VRU-BAH-01' ? 'BHD' : 'SAR'})}</div>
                            </div>
                            <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                                <div className="text-sm text-emerald-700 mb-1">Net Profit</div>
                                <div className="text-2xl font-bold text-emerald-700">{netProfit.toLocaleString(undefined, {style: 'currency', currency: fleet[0]?.id === 'VRU-BAH-01' ? 'BHD' : 'SAR'})}</div>
                                <div className="text-xs text-emerald-700 mt-1 font-bold">{margin.toFixed(1)}% Margin</div>
                            </div>
                        </div>
                        <table className="w-full text-sm">
                            <thead className="bg-slate-100 text-slate-600 font-bold">
                                <tr>
                                    <th className="px-3 py-2 text-left">Metric</th>
                                    <th className="px-3 py-2 text-right">Value</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                <tr><td className="px-3 py-2">Total Recovered Volume</td><td className="px-3 py-2 text-right font-mono">{totalRecovered.toLocaleString()} L</td></tr>
                                <tr><td className="px-3 py-2">Operational Expenses (Est.)</td><td className="px-3 py-2 text-right font-mono text-rose-700">{totalOpEx.toLocaleString(undefined, {style: 'currency', currency: fleet[0]?.id === 'VRU-BAH-01' ? 'BHD' : 'SAR'})}</td></tr>
                                <tr><td className="px-3 py-2">Avg. Revenue / Active Unit</td><td className="px-3 py-2 text-right font-mono">{(totalRev / (installedFleet.filter(f=>f.status==='Running').length || 1)).toLocaleString(undefined, {style: 'currency', currency: fleet[0]?.id === 'VRU-BAH-01' ? 'BHD' : 'SAR'})}</td></tr>
                            </tbody>
                        </table>
                    </div>
                );
            }

            case 'comparison_matrix': {
                const u1 = installedFleet.find(u => u.id === section.config.unitId);
                const u2 = installedFleet.find(u => u.id === section.config.unitId2);
                
                if (!u1 || !u2) return <div className="p-4 text-slate-400 italic text-center">Select two units to compare.</div>;

                return (
                    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3 text-left w-1/3">Metric</th>
                                    <th className="px-4 py-3 text-center w-1/3 border-l border-slate-200">{u1.name}</th>
                                    <th className="px-4 py-3 text-center w-1/3 border-l border-slate-200">{u2.name}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-600">
                                <tr>
                                    <td className="px-4 py-3 font-medium bg-slate-50">Status</td>
                                    <td className="px-4 py-3 text-center border-l border-slate-100">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${u1.status==='Running'?'bg-emerald-100 text-emerald-700':'bg-rose-100 text-rose-700'}`}>{u1.status}</span>
                                    </td>
                                    <td className="px-4 py-3 text-center border-l border-slate-100">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${u2.status==='Running'?'bg-emerald-100 text-emerald-700':'bg-rose-100 text-rose-700'}`}>{u2.status}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 font-medium bg-slate-50">Region</td>
                                    <td className="px-4 py-3 text-center border-l border-slate-100">{u1.region}</td>
                                    <td className="px-4 py-3 text-center border-l border-slate-100">{u2.region}</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 font-medium bg-slate-50">Total Recovery</td>
                                    <td className="px-4 py-3 text-center font-mono font-bold border-l border-slate-100">{u1.totalRecoveredAmount.toLocaleString()} L</td>
                                    <td className="px-4 py-3 text-center font-mono font-bold border-l border-slate-100">{u2.totalRecoveredAmount.toLocaleString()} L</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 font-medium bg-slate-50">Inlet Pressure</td>
                                    <td className="px-4 py-3 text-center border-l border-slate-100">{u1.pressurePSI} PSI</td>
                                    <td className="px-4 py-3 text-center border-l border-slate-100">{u2.pressurePSI} PSI</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 font-medium bg-slate-50">Daily Sales Vol</td>
                                    <td className="px-4 py-3 text-center border-l border-slate-100">{(u1.stationDetails?.dailySalesLiters || 0).toLocaleString()} L</td>
                                    <td className="px-4 py-3 text-center border-l border-slate-100">{(u2.stationDetails?.dailySalesLiters || 0).toLocaleString()} L</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                );
            }

            case 'single_unit_detail': {
                const unit = installedFleet.find(u => u.id === section.config.unitId);
                if (!unit) return <div className="text-rose-500 text-sm italic p-4">Unit configuration error: Unit not found.</div>;
                
                // --- REAL DATA FETCHING LOGIC ---
                const data = getMachineData(unit.id);
                
                // Apply Time Frame Filter
                const filteredData = filterDataByDate(data.daily);
                const chartData = filteredData.map(d => ({ date: d.date, value: d.recoveredLiters }));
                
                const periodVolume = filteredData.reduce((acc, curr) => acc + curr.recoveredLiters, 0);
                
                // Recovery Rate (Efficiency) vs Recovery Ratio (Sales)
                const sysEfficiency = (unit.recoveryRatePercentage * 100).toFixed(1); 
                const salesPerDay = unit.stationDetails?.dailySalesLiters || 50000;
                const periodPotential = salesPerDay * filteredData.length;
                const yieldRatio = periodPotential > 0 ? ((periodVolume / periodPotential) * 100).toFixed(2) : "0.00";

                const connectionStatus = unit.status === 'Running' ? 'STABLE' : unit.status === 'Offline' ? 'LOST SIGNAL' : 'UNSTABLE';
                const connectionColor = unit.status === 'Running' ? 'text-emerald-600' : 'text-rose-600';

                // Historical Comparisons Logic
                // Target Date: Use Period End (Usually Today)
                const targetDate = new Date(reportMeta.periodEnd);
                const currentMonthPrefix = targetDate.toISOString().slice(0, 7); // YYYY-MM
                
                const prevMonthDate = new Date(targetDate);
                prevMonthDate.setMonth(targetDate.getMonth() - 1);
                const prevMonthPrefix = prevMonthDate.toISOString().slice(0, 7);

                const lastYearDate = new Date(targetDate);
                lastYearDate.setFullYear(targetDate.getFullYear() - 1);
                const lastYearPrefix = lastYearDate.toISOString().slice(0, 7);

                const lastYearNextMonthDate = new Date(targetDate);
                lastYearNextMonthDate.setFullYear(targetDate.getFullYear() - 1);
                lastYearNextMonthDate.setMonth(targetDate.getMonth() + 1);
                const lastYearNextMonthPrefix = lastYearNextMonthDate.toISOString().slice(0, 7);

                const getMonthTotal = (prefix: string) => {
                    // Try to find in monthly aggregated data
                    const m = data.monthly.find(r => r.month === prefix);
                    if (m) return m.recoveredLiters;
                    // Fallback to summing daily if monthly record missing
                    return data.daily.filter(d => d.date.startsWith(prefix)).reduce((a, b) => a + b.recoveredLiters, 0);
                };

                const currentMonthTotal = getMonthTotal(currentMonthPrefix);
                const prevMonthTotal = getMonthTotal(prevMonthPrefix);
                const lastYearTotal = getMonthTotal(lastYearPrefix);
                const lastYearNextTotal = getMonthTotal(lastYearNextMonthPrefix);

                // --- ACTIVE ALERTS FILTER ---
                const activeAlerts = unit.alerts.filter(a => !a.acknowledged);

                return (
                    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm">
                        {/* Header */}
                        <div className="text-white p-6 flex justify-between items-center" style={{ backgroundColor: reportMeta.primaryColor }}>
                            <div>
                                <h4 className="text-2xl font-black tracking-tight">{unit.name}</h4>
                                <div className="text-xs text-slate-200 flex items-center gap-3 mt-1 font-mono opacity-80">
                                    <span className="bg-white/10 px-1.5 py-0.5 rounded">SN: {unit.id.replace('VRU-', '')}</span>
                                    <span className="flex items-center gap-1"><MapPin size={10} /> {unit.city}, {unit.region}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] uppercase font-bold text-slate-200 mb-1 opacity-80">Period Recovery</div>
                                <div className="text-2xl font-bold">{periodVolume.toLocaleString()} L</div>
                                <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${unit.status === 'Running' ? 'bg-emerald-500/20 text-emerald-100 border-emerald-500/30' : 'bg-rose-500/20 text-rose-100 border-rose-500/30'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${unit.status === 'Running' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></div>
                                    {unit.status}
                                </div>
                            </div>
                        </div>

                        {/* Chart Section */}
                        {section.config.showChart && (
                            <div className="p-6 border-b border-slate-100 bg-slate-50/30">
                                <div className="flex justify-between items-end mb-4">
                                    <div className="text-xs font-bold text-slate-600 uppercase flex items-center gap-2"><BarChart3 size={14} /> Output Log ({filteredData.length} Days)</div>
                                    <div className="flex gap-4 text-xs font-mono text-slate-500">
                                        <span>System Eff: <strong className="text-slate-800">{sysEfficiency}%</strong></span>
                                        <span>Recovery Rate (Sales %): <strong className="text-slate-800">{yieldRatio}%</strong></span>
                                    </div>
                                </div>
                                <div className="h-48 w-full">
                                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                        <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id={`colorVal-${unit.id}`} x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={reportMeta.primaryColor} stopOpacity={0.1}/>
                                                    <stop offset="95%" stopColor={reportMeta.primaryColor} stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis 
                                                dataKey="date" 
                                                axisLine={false} 
                                                tickLine={false} 
                                                tick={{fontSize: 10, fill: '#64748b'}} 
                                                tickFormatter={(v) => v.slice(5)} 
                                                minTickGap={20}
                                            />
                                            <YAxis 
                                                axisLine={false} 
                                                tickLine={false} 
                                                tick={{fontSize: 10, fill: '#64748b'}} 
                                                width={40}
                                            />
                                            <Tooltip 
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                labelStyle={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}
                                                itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: reportMeta.primaryColor }}
                                                formatter={(val: number) => [`${val} L`, 'Volume']}
                                                labelFormatter={(label) => `Date: ${label}`}
                                            />
                                            <Area type="monotone" dataKey="value" stroke={reportMeta.primaryColor} strokeWidth={2} fillOpacity={1} fill={`url(#colorVal-${unit.id})`} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* Tech Params & Diagnostics */}
                        <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100">
                            {section.config.showTechParams && (
                                <div className="p-6 flex-1 space-y-4">
                                    <div className="text-xs font-bold text-slate-800 uppercase flex items-center gap-2 mb-4">
                                        <Settings size={14} className="text-slate-400" /> Technical Parameters
                                    </div>
                                    <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                                        <div className="flex justify-between border-b border-slate-100 pb-1">
                                            <span className="text-slate-600">Connection</span>
                                            <span className={`font-bold ${connectionColor}`}>{connectionStatus}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-slate-100 pb-1">
                                            <span className="text-slate-600">Throughput/Day</span>
                                            <span className="font-mono text-slate-700">{(unit.stationDetails?.dailySalesLiters || 50000).toLocaleString()} L</span>
                                        </div>
                                        <div className="flex justify-between border-b border-slate-100 pb-1">
                                            <span className="text-slate-600">Unit Type</span>
                                            <span className="font-mono text-slate-700">Standard VRU-II</span>
                                        </div>
                                    </div>

                                    {/* Seasonal Context Table */}
                                    <div className="mt-6 pt-4 border-t border-slate-100">
                                        <div className="text-xs font-bold text-slate-800 uppercase mb-2 flex items-center gap-2">
                                            <Calendar size={14} className="text-slate-400" /> Seasonal Context
                                        </div>
                                        <table className="w-full text-xs">
                                            <tbody>
                                                <tr className="border-b border-slate-100">
                                                    <td className="py-1 text-slate-900 font-medium">Prev. Month</td>
                                                    <td className="py-1 text-right font-mono text-slate-900 font-bold">{prevMonthTotal.toLocaleString()} L</td>
                                                </tr>
                                                <tr className="border-b border-slate-100">
                                                    <td className="py-1 text-slate-900 font-medium">Same Month (Last Year)</td>
                                                    <td className="py-1 text-right font-mono text-slate-900 font-bold">{lastYearTotal.toLocaleString()} L</td>
                                                </tr>
                                                <tr>
                                                    <td className="py-1 text-slate-900 font-medium">Next Month (Last Year Trend)</td>
                                                    <td className="py-1 text-right font-mono text-slate-600 font-bold">{lastYearNextTotal.toLocaleString()} L</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                            {section.config.showDiagnostics && (
                                <div className="p-6 flex-1 bg-slate-50/50">
                                    <div className="text-xs font-bold text-slate-800 uppercase flex items-center gap-2 mb-4">
                                        <Activity size={14} className="text-slate-400" /> Diagnostic Assessment
                                    </div>
                                    {activeAlerts.length > 0 ? (
                                        <div className="space-y-3">
                                            <div className="flex gap-3 items-start">
                                                <AlertTriangle size={16} className="text-rose-500 mt-0.5" />
                                                <div>
                                                    <div className="text-sm font-bold text-rose-700">Active Alert Detected</div>
                                                    <p className="text-xs text-slate-600 mt-1 mb-2">{activeAlerts[0].message}</p>
                                                    
                                                    {/* Remediation Block */}
                                                    <div className="bg-white rounded border border-rose-100 p-2.5">
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><Wrench size={10} /> Recommended Action</div>
                                                        <ul className="list-disc list-inside text-[10px] text-slate-600 leading-relaxed">
                                                            {getRemediationSteps(activeAlerts[0].message).map((step, idx) => (
                                                                <li key={idx}>{step}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex gap-3 items-start">
                                            <CheckCircle size={16} className="text-emerald-500 mt-0.5" />
                                            <div className="text-sm font-bold text-emerald-700">System Operating Normally</div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );
            }

            case 'fleet_status_matrix': {
                return (
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 uppercase font-bold tracking-wider">
                                <tr>
                                    <th className="px-4 py-3">Unit Name</th>
                                    <th className="px-4 py-3">SN</th>
                                    <th className="px-4 py-3">Location</th>
                                    <th className="px-4 py-3 text-right">System Efficiency</th>
                                    <th className="px-4 py-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {installedFleet.slice(0, 10).map(unit => (
                                    <tr key={unit.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-bold text-slate-800">{unit.name}</td>
                                        <td className="px-4 py-3 font-mono text-slate-500">{unit.id.replace('VRU-', '')}</td>
                                        <td className="px-4 py-3 text-slate-600">{unit.city}</td>
                                        <td className="px-4 py-3 text-right font-bold text-slate-800">{(unit.recoveryRatePercentage * 100).toFixed(2)}%</td>
                                        <td className="px-4 py-3 text-center"><span className={`inline-block w-2 h-2 rounded-full ${unit.status==='Running'?'bg-emerald-500':'bg-rose-500'}`}></span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            }
            
            case 'fleet_summary':
                const activeUnits = installedFleet.filter(f => f.status === 'Running').length;
                const totalVol = installedFleet.reduce((acc, curr) => acc + curr.totalRecoveredAmount, 0);
                const totalCO2 = Math.floor(totalVol * 2.31); 
                
                // Only count ACTIVE (unacknowledged) alerts
                const criticalActiveAlerts = installedFleet.filter(f => f.alerts.some(a => !a.acknowledged)).length;

                return (
                    <div className="grid grid-cols-4 gap-4 mb-4">
                        <div className="bg-blue-50 p-4 rounded-lg text-center border border-blue-100"><div className="text-2xl font-bold text-blue-700">{installedFleet.length}</div><div className="text-xs text-blue-600 uppercase font-bold">Total Assets</div></div>
                        <div className="bg-emerald-50 p-4 rounded-lg text-center border border-emerald-100"><div className="text-2xl font-bold text-emerald-700">{activeUnits}</div><div className="text-xs text-emerald-600 uppercase font-bold">Units Active</div></div>
                        <div className="bg-rose-50 p-4 rounded-lg text-center border border-rose-100"><div className="text-2xl font-bold text-rose-700">{criticalActiveAlerts}</div><div className="text-xs text-rose-600 uppercase font-bold">Critical Alerts</div></div>
                        <div className="bg-slate-50 p-4 rounded-lg text-center border border-slate-200"><div className="text-2xl font-bold text-slate-700">{totalCO2.toLocaleString()}</div><div className="text-xs text-slate-500 uppercase font-bold">Lifetime Kg CO2</div></div>
                    </div>
                );
            
            case 'roi_certificate':
                const totalVolRoi = installedFleet.reduce((acc, u) => acc + u.totalRecoveredAmount, 0);
                const revenue = totalVolRoi * (fleet[0]?.id === 'VRU-BAH-01' ? 0.140 : 2.4); 
                return (
                    <div className="border-4 border-double border-slate-200 rounded-xl p-8 bg-slate-50 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><ShieldCheck size={120} /></div>
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-widest border-b-2 inline-block pb-2 mb-2" style={{ borderColor: reportMeta.primaryColor }}>Certificate of Value</h2>
                            <p className="text-slate-500 text-sm">MasarZero Performance Verification</p>
                        </div>
                        <div className="grid grid-cols-3 gap-8 text-center relative z-10">
                            <div><div className="text-xs text-slate-500 uppercase font-bold mb-1">Savings Generated</div><div className="text-4xl font-black text-emerald-600">{revenue.toLocaleString(undefined, {style: 'currency', currency: fleet[0]?.id === 'VRU-BAH-01' ? 'BHD' : 'SAR'})}</div></div>
                            <div><div className="text-xs text-slate-500 uppercase font-bold mb-1">Lifetime ROI</div><div className="text-4xl font-black text-blue-600">142%</div></div>
                            <div><div className="text-xs text-slate-500 uppercase font-bold mb-1">Volume Recovered</div><div className="text-4xl font-black text-teal-600">{totalVolRoi.toLocaleString()} L</div></div>
                        </div>
                    </div>
                );

            case 'esg_impact':
                const totalVolEsg = installedFleet.reduce((acc, curr) => acc + curr.totalRecoveredAmount, 0);
                const totalCo2Esg = totalVolEsg * 2.31;
                const trees = Math.floor(totalCo2Esg / 20); 

                return (
                    <div className="bg-[#ecfdf5] border border-emerald-200 rounded-lg p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-emerald-100 rounded-full text-emerald-600">
                                <Leaf size={32} />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-emerald-800 uppercase tracking-wider">Environmental Impact Certified</div>
                                <div className="text-3xl font-black text-emerald-700 mt-1">{totalCo2Esg.toLocaleString(undefined, {maximumFractionDigits: 0})} <span className="text-lg font-medium text-emerald-600">kg CO₂ Saved</span></div>
                                <div className="text-[10px] text-emerald-600/70 italic mt-1">Based on standard gasoline combustion equivalent (2.31kg/L)</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-emerald-600 font-bold uppercase mb-1">Equivalent to planting</div>
                            <div className="text-2xl font-bold text-emerald-800">{trees.toLocaleString()} Trees</div>
                        </div>
                    </div>
                );

            default: return <div className="p-4 border border-dashed border-slate-300 rounded text-slate-400 text-center italic">Section Preview: {section.type}</div>;
        }
    };

    return (
        <div className="h-full flex flex-col space-y-4 animate-in fade-in duration-500">
            {/* ... styles for print removed as we are using jsPDF now ... */}

            <div className="flex justify-between items-center no-print">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Smart Report Builder</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Compose dynamic reports with filtered fleet sections.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setSections([])} className="flex items-center gap-2 bg-white dark:bg-scada-800 border border-slate-200 dark:border-scada-600 hover:bg-slate-50 dark:hover:bg-scada-700 text-slate-700 dark:text-white px-4 py-2 rounded-lg transition-colors">
                        <RefreshCw size={16} /> Reset
                    </button>
                    <button 
                        onClick={handleGeneratePDF} 
                        disabled={isGenerating}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white px-4 py-2 rounded-lg transition-colors shadow-lg shadow-emerald-900/20"
                    >
                        {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />}
                        {isGenerating ? 'Generating...' : 'Export PDF'}
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row gap-6 h-[calc(100vh-12rem)] min-h-[600px]">
                
                {/* LEFT COLUMN: Section Manager & Branding */}
                <div className="w-full lg:w-1/3 xl:w-1/4 flex flex-col gap-4 no-print h-full overflow-y-auto custom-scrollbar pr-1 pb-10">
                    {/* Meta & Branding Card */}
                    <Card title="Report Metadata" className="shrink-0">
                        <div className="space-y-3">
                            {/* Logo Upload */}
                            <div className="pb-3 border-b border-slate-100 dark:border-scada-700">
                                <label className="text-[10px] text-slate-600 dark:text-slate-500 uppercase font-bold block mb-2">Client Logo</label>
                                <div className="flex items-center gap-3">
                                    <label className="flex items-center justify-center w-12 h-12 rounded-lg border-2 border-dashed border-slate-300 dark:border-scada-600 hover:border-scada-accent cursor-pointer bg-slate-50 dark:bg-scada-900 overflow-hidden">
                                        {reportMeta.clientLogo ? (
                                            <img src={reportMeta.clientLogo} alt="Logo" className="w-full h-full object-contain p-1" />
                                        ) : (
                                            <Upload size={16} className="text-slate-400" />
                                        )}
                                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                                    </label>
                                    <div className="text-[10px] text-slate-400 flex-1 leading-tight">
                                        Upload a PNG/JPG to display on right side and watermark.
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] text-slate-600 dark:text-slate-500 uppercase font-bold">Client Name</label>
                                    <input 
                                        value={reportMeta.clientName}
                                        onChange={(e) => setReportMeta({...reportMeta, clientName: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-scada-900 border border-slate-200 dark:border-scada-600 rounded p-2 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-600 dark:text-slate-500 uppercase font-bold">Report Date</label>
                                    <input 
                                        type="date"
                                        value={reportMeta.date}
                                        onChange={(e) => setReportMeta({...reportMeta, date: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-scada-900 border border-slate-200 dark:border-scada-600 rounded p-2 text-xs"
                                    />
                                </div>
                            </div>

                            {/* Time Frame Configuration */}
                            <div className="pt-2 border-t border-slate-100 dark:border-scada-700">
                                <label className="text-[10px] text-slate-600 dark:text-slate-500 uppercase font-bold mb-1 block">Report Time Period</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="relative">
                                        <label className="text-[9px] text-slate-400 absolute top-1 left-2">Start</label>
                                        <input 
                                            type="date"
                                            value={reportMeta.periodStart}
                                            onChange={(e) => setReportMeta({...reportMeta, periodStart: e.target.value})}
                                            className="w-full bg-slate-50 dark:bg-scada-900 border border-slate-200 dark:border-scada-600 rounded p-2 pt-4 text-xs"
                                        />
                                    </div>
                                    <div className="relative">
                                        <label className="text-[9px] text-slate-400 absolute top-1 left-2">End</label>
                                        <input 
                                            type="date"
                                            value={reportMeta.periodEnd}
                                            onChange={(e) => setReportMeta({...reportMeta, periodEnd: e.target.value})}
                                            className="w-full bg-slate-50 dark:bg-scada-900 border border-slate-200 dark:border-scada-600 rounded p-2 pt-4 text-xs"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] text-slate-600 dark:text-slate-500 uppercase font-bold">Title</label>
                                <input 
                                    value={reportMeta.reportTitle}
                                    onChange={(e) => setReportMeta({...reportMeta, reportTitle: e.target.value})}
                                    className="w-full bg-slate-50 dark:bg-scada-900 border border-slate-200 dark:border-scada-600 rounded p-2 text-xs"
                                />
                            </div>
                            
                            {/* Branding Options */}
                            <div className="pt-3 mt-3 border-t border-slate-100 dark:border-scada-700">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1"><Palette size={12}/> Branding</span>
                                </div>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="flex-1">
                                        <label className="text-[10px] text-slate-600 dark:text-slate-500 uppercase font-bold block mb-1">Brand Color</label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="color" 
                                                value={reportMeta.primaryColor}
                                                onChange={(e) => setReportMeta({...reportMeta, primaryColor: e.target.value})}
                                                className="h-8 w-10 p-0 border-0 rounded cursor-pointer"
                                            />
                                            <input 
                                                type="text" 
                                                value={reportMeta.primaryColor}
                                                onChange={(e) => setReportMeta({...reportMeta, primaryColor: e.target.value})}
                                                className="flex-1 bg-slate-50 dark:bg-scada-900 border border-slate-200 dark:border-scada-600 rounded p-1.5 text-xs font-mono"
                                            />
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="p-2 bg-slate-50 dark:bg-scada-900 rounded border border-slate-100 dark:border-scada-700">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-[10px] text-slate-600 dark:text-slate-500 uppercase font-bold">Watermark</label>
                                        <button 
                                            onClick={() => setReportMeta(m => ({...m, showWatermark: !m.showWatermark}))}
                                            className={`w-8 h-4 rounded-full p-0.5 transition-colors ${reportMeta.showWatermark ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                        >
                                            <div className={`w-3 h-3 bg-white rounded-full shadow-sm transform transition-transform ${reportMeta.showWatermark ? 'translate-x-4' : ''}`}></div>
                                        </button>
                                    </div>
                                    
                                    {reportMeta.showWatermark && (
                                        <div className="space-y-2">
                                            <div className="flex gap-2 mb-2">
                                                <button 
                                                    onClick={() => setReportMeta(m => ({...m, watermarkType: 'text'}))}
                                                    className={`flex-1 py-1 text-[10px] rounded border ${reportMeta.watermarkType === 'text' ? 'bg-white shadow text-scada-accent border-slate-200' : 'text-slate-400 border-transparent hover:bg-slate-100'}`}
                                                >
                                                    Text
                                                </button>
                                                <button 
                                                    onClick={() => setReportMeta(m => ({...m, watermarkType: 'logo'}))}
                                                    className={`flex-1 py-1 text-[10px] rounded border ${reportMeta.watermarkType === 'logo' ? 'bg-white shadow text-scada-accent border-slate-200' : 'text-slate-400 border-transparent hover:bg-slate-100'}`}
                                                >
                                                    Logo
                                                </button>
                                            </div>
                                            {reportMeta.watermarkType === 'text' ? (
                                                <input 
                                                    value={reportMeta.watermarkText}
                                                    onChange={(e) => setReportMeta({...reportMeta, watermarkText: e.target.value})}
                                                    placeholder="e.g. CONFIDENTIAL"
                                                    className="w-full bg-white dark:bg-scada-800 border border-slate-200 dark:border-scada-600 rounded p-1.5 text-xs"
                                                />
                                            ) : (
                                                <div className="text-[10px] text-slate-400 text-center italic py-1">
                                                    {reportMeta.clientLogo ? "Using Client Logo" : "Upload logo above"}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Document Structure (Scrollable) */}
                    <Card title="Document Structure" className="flex flex-col">
                        <div className="flex flex-col -m-5">
                            <div className="p-3 border-b border-slate-100 dark:border-scada-700 bg-slate-50 dark:bg-scada-900/50 text-[10px] text-slate-500 uppercase font-bold tracking-wider flex justify-between">
                                <span>Sections ({sections.length})</span>
                                <span>Drag to Reorder</span>
                            </div>
                            <div className="space-y-2 p-3">
                                {sections.map((section, idx) => (
                                    <div key={section.id} className={`bg-white dark:bg-scada-900 border rounded-lg group transition-colors shadow-sm relative overflow-hidden flex-shrink-0 ${section.type === 'page_break' ? 'border-dashed border-slate-300 dark:border-scada-600 bg-slate-50' : 'border-slate-200 dark:border-scada-700 hover:border-scada-accent'}`}>
                                        {/* Section Header Row */}
                                        <div className="flex items-center gap-2 p-2 bg-slate-50/50 dark:bg-scada-800/50">
                                            <div className="flex flex-col gap-0.5 text-slate-300">
                                                <button onClick={() => moveSection(idx, 'up')} disabled={idx === 0} className="hover:text-slate-600 disabled:opacity-0"><GripVertical size={10} className="rotate-180" /></button>
                                                <button onClick={() => moveSection(idx, 'down')} disabled={idx === sections.length - 1} className="hover:text-slate-600 disabled:opacity-0"><GripVertical size={10} /></button>
                                            </div>
                                            
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    {section.type === 'page_break' ? (
                                                        <span className="font-bold text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2"><Scissors size={12}/> Page Break</span>
                                                    ) : (
                                                        <input 
                                                            value={section.title} 
                                                            onChange={(e) => {
                                                                const newSections = [...sections];
                                                                newSections[idx].title = e.target.value;
                                                                setSections(newSections);
                                                            }}
                                                            className="font-bold text-xs text-slate-700 dark:text-slate-200 bg-transparent outline-none w-full truncate"
                                                        />
                                                    )}
                                                </div>
                                                <div className="text-[9px] text-slate-400 uppercase font-bold mt-0.5 flex items-center gap-2">
                                                    <span>{section.type.replace(/_/g, ' ')}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1">
                                                <button onClick={() => duplicateSection(section.id)} className="p-1 text-slate-400 hover:text-blue-500 transition-colors" title="Duplicate"><Copy size={12} /></button>
                                                {section.type !== 'page_break' && (
                                                    <button onClick={() => toggleCollapse(section.id)} className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
                                                        {section.isCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                                                    </button>
                                                )}
                                                <button onClick={() => removeSection(section.id)} className="p-1 text-slate-400 hover:text-rose-500 transition-colors"><Trash2 size={12} /></button>
                                            </div>
                                        </div>
                                        
                                        {/* Config Area (Collapsible) */}
                                        {!section.isCollapsed && section.type !== 'page_break' && (
                                            <div className="p-2 border-t border-slate-100 dark:border-scada-800 bg-white dark:bg-scada-900">
                                                {/* Single Unit Selection */}
                                                {section.type === 'single_unit_detail' && (
                                                    <div className="space-y-2">
                                                        <select 
                                                            value={section.config.unitId}
                                                            onChange={(e) => updateSectionConfig(idx, 'unitId', e.target.value)}
                                                            className="w-full bg-slate-50 dark:bg-scada-800 border border-slate-200 dark:border-scada-600 rounded p-1.5 text-[10px]"
                                                        >
                                                            {installedFleet.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                                        </select>
                                                        <div className="flex flex-wrap gap-2">
                                                            {['showChart', 'showTechParams', 'showDiagnostics'].map(k => (
                                                                <label key={k} className="flex items-center gap-1 text-[10px] text-slate-600 dark:text-slate-500 cursor-pointer bg-slate-100 px-1.5 py-0.5 rounded">
                                                                    <input 
                                                                        type="checkbox" 
                                                                        checked={(section.config as any)[k] || false} 
                                                                        onChange={(e) => updateSectionConfig(idx, k, e.target.checked)}
                                                                        className="rounded border-slate-300 text-scada-accent focus:ring-0 w-3 h-3"
                                                                    /> {k.replace('show', '')}
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                {/* Custom Text Content / Regional Analysis */}
                                                {(section.type === 'custom_text' || section.type === 'regional_analysis') && (
                                                    <textarea 
                                                        value={section.config.textContent || ''}
                                                        onChange={(e) => updateSectionConfig(idx, 'textContent', e.target.value)}
                                                        placeholder={section.type === 'regional_analysis' ? "Analysis content..." : "Enter report text..."}
                                                        className="w-full h-32 bg-slate-50 dark:bg-scada-800 border border-slate-200 dark:border-scada-600 rounded p-2 text-xs font-mono"
                                                    />
                                                )}

                                                {/* Comparison Unit Selectors */}
                                                {section.type === 'comparison_matrix' && (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <select 
                                                            value={section.config.unitId}
                                                            onChange={(e) => updateSectionConfig(idx, 'unitId', e.target.value)}
                                                            className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-[10px]"
                                                        >
                                                            {installedFleet.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                                        </select>
                                                        <select 
                                                            value={section.config.unitId2}
                                                            onChange={(e) => updateSectionConfig(idx, 'unitId2', e.target.value)}
                                                            className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-[10px]"
                                                        >
                                                            {installedFleet.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                                        </select>
                                                    </div>
                                                )}

                                                {/* Alerts Options */}
                                                {section.type === 'units_with_alerts' && (
                                                    <label className="flex items-center gap-2 text-[10px] text-slate-500 cursor-pointer">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={section.config.showResolution || false} 
                                                            onChange={(e) => updateSectionConfig(idx, 'showResolution', e.target.checked)}
                                                            className="rounded border-slate-300 w-3 h-3"
                                                        /> Include Resolution Steps
                                                    </label>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="p-3 border-t border-slate-100 dark:border-scada-700 flex-shrink-0 bg-slate-50 dark:bg-scada-900/50 relative">
                                <button 
                                    onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                                    className="w-full py-2.5 bg-scada-accent hover:bg-sky-400 text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-bold text-xs shadow-sm"
                                >
                                    <Plus size={16} /> Add Section
                                </button>

                                {isAddMenuOpen && (
                                    <div className="absolute bottom-16 left-0 w-full bg-white dark:bg-scada-800 border border-slate-200 dark:border-scada-600 rounded-xl shadow-xl p-2 z-20 h-72 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                                        {/* ... (Menu Items remain same) ... */}
                                        <div className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1 bg-slate-50 dark:bg-scada-700/50 rounded mt-1">General</div>
                                        <button onClick={() => addSection('fleet_summary', 'Executive Summary')} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-scada-700 rounded text-xs text-slate-700 dark:text-slate-200 flex items-center gap-2"><BarChart3 size={12}/> Summary KPI</button>
                                        <button onClick={() => addSection('financial_impact', 'Financial Overview')} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-scada-700 rounded text-xs text-slate-700 dark:text-slate-200 flex items-center gap-2"><DollarSign size={12}/> Financial</button>
                                        <button onClick={() => addSection('table_of_contents', 'Table of Contents')} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-scada-700 rounded text-xs text-slate-700 dark:text-slate-200 flex items-center gap-2"><ListIcon size={12}/> Table of Contents</button>
                                        
                                        <div className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1 bg-slate-50 dark:bg-scada-700/50 rounded mt-2">Analysis</div>
                                        <button onClick={() => addSection('single_unit_detail', 'Single Unit Deep Dive')} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-scada-700 rounded text-xs text-slate-700 dark:text-slate-200 flex items-center gap-2"><Activity size={12}/> Single Unit</button>
                                        <button onClick={() => addSection('comparison_matrix', 'Asset Comparison')} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-scada-700 rounded text-xs text-slate-700 dark:text-slate-200 flex items-center gap-2"><ArrowRightLeft size={12}/> Comparison</button>
                                        <button onClick={() => addSection('regional_analysis', 'Regional Detailed Analysis')} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-scada-700 rounded text-xs text-slate-700 dark:text-slate-200 flex items-center gap-2"><Sparkles size={12} className="text-purple-500"/> Auto-Generate Analysis</button>
                                        
                                        <div className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1 bg-slate-50 dark:bg-scada-700/50 rounded mt-2">Bulk Actions</div>
                                        <button onClick={() => bulkAddUnits('Running')} className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2"><Layers size={12}/> Add All Active Units</button>
                                        <button onClick={() => bulkAddUnits('Offline')} className="w-full text-left px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2"><Layers size={12}/> Add All Offline Units</button>
                                        
                                        <div className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1 bg-slate-50 dark:bg-scada-700/50 rounded mt-2">Misc</div>
                                        <button onClick={() => addSection('custom_text', 'Notes / Observations')} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-scada-700 rounded text-xs text-slate-700 dark:text-slate-200 flex items-center gap-2"><FileText size={12}/> Free Text</button>
                                        <button onClick={() => addSection('page_break', 'Page Break')} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-scada-700 rounded text-xs text-slate-700 dark:text-slate-200 flex items-center gap-2"><Scissors size={12}/> Page Break</button>
                                        <button onClick={() => addSection('roi_certificate', 'ROI Certificate')} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-scada-700 rounded text-xs text-slate-700 dark:text-slate-200 flex items-center gap-2"><ShieldCheck size={12}/> Certificate</button>
                                        <button onClick={() => addSection('esg_impact', 'ESG Report')} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-scada-700 rounded text-xs text-slate-700 dark:text-slate-200 flex items-center gap-2"><Leaf size={12}/> Environmental</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>

                {/* RIGHT COLUMN: Canvas */}
                <div className="flex-1 bg-slate-200 dark:bg-slate-900/50 border border-slate-300 dark:border-scada-600 rounded-xl p-8 overflow-y-auto flex justify-center items-start shadow-inner">
                    <div ref={printRef} className="print-container w-[210mm] min-h-[297mm] bg-white text-slate-900 shadow-2xl p-10 flex flex-col gap-8 scale-100 origin-top relative overflow-hidden">
                         
                         {/* Watermark Overlay */}
                         {reportMeta.showWatermark && (
                             <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-50 overflow-hidden mix-blend-multiply opacity-10">
                                 {reportMeta.watermarkType === 'text' && reportMeta.watermarkText ? (
                                     <div className="text-[120px] font-black text-slate-900 -rotate-45 whitespace-nowrap select-none">
                                         {reportMeta.watermarkText}
                                     </div>
                                 ) : reportMeta.watermarkType === 'logo' && reportMeta.clientLogo ? (
                                     <img src={reportMeta.clientLogo} alt="Watermark" className="w-[80%] opacity-50 transform -rotate-12 grayscale" />
                                 ) : null}
                             </div>
                         )}

                         {/* Report Header */}
                         <div className="border-b-4 pb-6 mb-2 flex justify-between items-center relative z-10" style={{ borderColor: reportMeta.primaryColor }}>
                             {/* Left: MasarZero Logo (Fixed) */}
                             <div className="flex-shrink-0">
                                 <img src="https://i.ibb.co/Lzf6K7nG/masarzerologo.png" alt="MasarZero" className="h-16 w-auto object-contain" />
                             </div>

                             {/* Center: Title */}
                             <div className="flex-1 text-center px-4">
                                 <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none" style={{ color: reportMeta.primaryColor }}>{reportMeta.reportTitle}</h2>
                                 <div className="flex justify-center gap-4 mt-2 text-sm text-slate-500 font-medium">
                                     <span>Prepared For: {reportMeta.clientName}</span>
                                     <span>•</span>
                                     <span>{formatDateFriendly(reportMeta.periodStart)} - {formatDateFriendly(reportMeta.periodEnd)}</span>
                                 </div>
                             </div>

                             {/* Right: Client Logo (Configurable) */}
                             <div className="flex-shrink-0">
                                 {reportMeta.clientLogo && (
                                     <img src={reportMeta.clientLogo} alt="Client Logo" className="h-16 w-auto object-contain max-w-[150px]" />
                                 )}
                             </div>
                         </div>

                         {sections.length === 0 && (
                             <div className="flex-1 flex flex-col items-center justify-center text-slate-300 italic border-2 border-dashed border-slate-100 rounded-xl m-10 relative z-10">
                                 <p>Add sections from the left menu to build your report.</p>
                             </div>
                         )}

                         {sections.map((section, index) => (
                             <div key={section.id} className={`${section.type === 'page_break' ? 'print-break-always' : 'print-break'} mb-8 last:mb-0 relative z-10`}>
                                 {section.type !== 'page_break' && (
                                     <div className="flex items-center gap-2 mb-4 border-b-2 pb-2" style={{ borderColor: reportMeta.primaryColor }}>
                                         <span className="text-white text-xs font-bold px-2 py-1 rounded-sm" style={{ backgroundColor: reportMeta.primaryColor }}>SECTION {String(index + 1).padStart(2, '0')}</span>
                                         <h3 className="text-lg font-bold uppercase tracking-wider" style={{ color: reportMeta.primaryColor }}>{section.title}</h3>
                                     </div>
                                 )}
                                 <div className="text-sm text-slate-600">
                                     {renderSectionPreview(section)}
                                 </div>
                             </div>
                         ))}
                         
                         {/* Footer */}
                         <div className="mt-auto pt-8 border-t border-slate-200 flex justify-between text-[10px] text-slate-400 uppercase font-bold tracking-widest relative z-10">
                             <span>Confidential - {reportMeta.clientName} Use Only</span>
                             <span>Generated by MasarZero SCADA</span>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
