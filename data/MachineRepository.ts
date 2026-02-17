
// ... imports
import {
    MachineExtendedData,
    HourlyRecord,
    DailyRecord,
    MonthlyRecord,
    StationConfig,
    VRU // Imported VRU type
} from '../types';
import { FINANCIAL_DEFAULTS } from '../utils/constants';

// Import Static Data
import { AIRPORT3_2024_DATA, AIRPORT3_2025_DATA, AIRPORT3_2026_DATA } from './Airport3Data';
import { WASIYA_2025_DATA, WASIYA_2026_DATA } from './WasiyaData';
import { RAFFAYA_2025_DATA, RAFFAYA_2026_DATA } from './RaffayaData';
import { KINGSALMAN3_2025_DATA, KINGSALMAN3_2026_DATA } from './KingSalman3Data';
import { KINGABDULLAH_2025_DATA, KINGABDULLAH_2026_DATA } from './KingAbdullahData';
import { KINGFAISAL_2025_DATA, KINGFAISAL_2026_DATA } from './KingFaisalData';
import { THANEEM_2025_DATA, THANEEM_2026_DATA } from './ThaneemData';
import { ZAIDY_2025_DATA, ZAIDY_2026_DATA } from './ZaidyData';
import { ALMUZANI_2025_DATA, ALMUZANI_2026_DATA } from './AlMuzaniData';
import { AIRPORT2_2025_DATA, AIRPORT2_2026_DATA } from './Airport2Data';
import { LAYAN_2025_DATA, LAYAN_2026_DATA } from './LayanData';
import { SEOIL_2025_DATA, GECO452_2025_DATA, HUYNDAI_2025_DATA } from './GecoSpecificData';

// In-memory "Database" simulating file storage
// FORCE CLEAR CACHE ON RELOAD TO FIX STALE PRICING & DOUBLE COUNTING
let machineDatabase: Record < string, MachineExtendedData > = {};

// --- PERFORMANCE CACHE ---
// Cache aggregated results to prevent expensive re-looping on every dashboard render
let _cachedAggregatedData: Record<string, any[]> = {};
let _isCacheDirty = true;

// Centralized Financial Variables
const DEFAULT_CONFIG: StationConfig = {
    salesPricePerLiter: 2.18, // STRICTLY 2.18 SAR
    currency: 'SAR',
    targetDailyYield: 600,
    vatRate: 0.15,
    electricityConsumptionKwPerL: 0.0952,
    electricityCostPerKw: 0.32
};

// STATIC EXCHANGE RATES TO SAR (BASE CURRENCY)
const TO_SAR_RATES: Record<string, number> = {
    'SAR': 1,
    'USD': 3.75, // Exchange rate only, NOT price
    'BHD': 9.95, // 1 BHD approx 9.95 SAR
    'KRW': 0.0027, // 1 KRW approx 0.0027 SAR (or 1 SAR = 365 KRW)
    'CNY': 0.52 // 1 CNY approx 0.52 SAR
};

// CUTOFF DATE - Uses actual system date (UTC for consistency)
// MODIFIED: Extended to 2026-12-31 to ensure simulated future data is visible in totals
export const TODAY_CUTOFF = '2026-12-31';

// --- Helper Functions ---

const generateHourlyData = (baseTemp: number, targetFlowPerHour: number, isOffline: boolean = false): HourlyRecord[] => {
    const data: HourlyRecord[] = [];
    const now = new Date(); // Use actual current time for hourly to make it look "live"
    
    // Performance Optimization: If unit is strictly offline
    if (isOffline) {
        for (let i = 24; i >= 0; i--) {
            const time = new Date(now.getTime() - i * 60 * 60 * 1000);
            data.push({
                timestamp: time.toISOString(),
                recoveredLiters: 0,
                temperatureC: baseTemp,
                pressurePSI: 0,
                efficiency: 0
            });
        }
        return data;
    }

    for (let i = 48; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60 * 60 * 1000);
        const hour = time.getHours();
        
        // Temperature Cycle: Lowest at 4 AM, Highest at 4 PM
        const tempMod = Math.sin((hour - 4) / 24 * 2 * Math.PI) * 5;
        
        // Flow Cycle: Higher during day (8 AM - 8 PM), Lower at night
        // Peak at 10 AM and 6 PM (Rush hours)
        let timeMultiplier = 0.3; // Base night flow
        if (hour >= 6 && hour <= 22) {
            timeMultiplier = 0.8; // Day base
            if ((hour >= 8 && hour <= 11) || (hour >= 17 && hour <= 20)) {
                timeMultiplier = 1.1; // Peak hours
            }
        }

        let recoveredLiters = 0;
        if (targetFlowPerHour > 0) {
            const variance = targetFlowPerHour * 0.2; // 20% random variance
            const baseFlow = targetFlowPerHour * timeMultiplier;
            recoveredLiters = Math.max(0, baseFlow + (Math.random() * variance * 2 - variance));
            
            // Occasional "idle" moments (pump stopped briefly)
            if (Math.random() > 0.95) recoveredLiters = 0;
        }

        data.push({
            timestamp: time.toISOString(),
            recoveredLiters: parseFloat(recoveredLiters.toFixed(1)),
            temperatureC: parseFloat((baseTemp + tempMod + (Math.random() * 2 - 1)).toFixed(1)), // Add slight noise
            pressurePSI: recoveredLiters > 0 ? parseFloat((12 + Math.random() * 2).toFixed(2)) : 0,
            efficiency: recoveredLiters > 0 ? parseFloat((0.92 + Math.random() * 0.07).toFixed(2)) : 0
        });
    }
    return data;
};

// Generic builder for static data maps
const buildFromStaticData = (config: StationConfig, baseTemp: number, dataMap: Record < string, Record < string, number[] >> ): DailyRecord[] => {
    const data: DailyRecord[] = [];
    const processedDates = new Set<string>(); // Prevent duplicate dates
    const years = ['2024', '2025', '2026'];
    const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

    years.forEach(year => {
        const yearData = dataMap[year];
        if (!yearData) return;

        months.forEach((month, mIdx) => {
            const dailyVols = yearData[month];
            if (!dailyVols) return;

            // Determine days in month to iterate correctly
            const daysInMonth = new Date(parseInt(year), mIdx + 1, 0).getDate();
            for (let i = 0; i < daysInMonth; i++) {
                // Use value if present, else 0
                const vol = dailyVols[i] !== undefined ? dailyVols[i] : 0;
                const dayStr = String(i + 1).padStart(2, '0');
                const dateStr = `${year}-${month}-${dayStr}`;
                
                // STRICT CUTOFF: Do not include data Future relative to Simulation Time
                // ALLOW TODAY ( > instead of >= ) to show 0L or partial data for current day
                if (dateStr > TODAY_CUTOFF) continue;
                
                // Prevent duplicate dates (safety check)
                if (processedDates.has(dateStr)) continue;
                processedDates.add(dateStr);

                data.push({
                    date: dateStr,
                    recoveredLiters: vol,
                    avgTemperatureC: parseFloat((baseTemp + Math.random() * 3 - 1.5).toFixed(1)),
                    salesAmount: vol * config.salesPricePerLiter,
                    efficiency: vol > 0 ? parseFloat((0.9 + Math.random() * 0.09).toFixed(2)) : 0,
                    outageReason: vol === 0 ? "System Idle / Offline" : undefined
                });
            }
        });
    });
    return data;
};

// Generic daily generator for units without static map
// For Bapco, modified to always return 0 to reflect Pending/Offline status
const generateBapcoDaily = (config: StationConfig, baseTemp: number, avgDailyVol: number): DailyRecord[] => {
    const data: DailyRecord[] = [];
    // Start generating data from 2025-01-01 to fill historical gap with zeros
    const start = new Date('2025-01-01');
    const end = new Date(TODAY_CUTOFF);
    // Include Today
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        
        // Strictly return 0 for Bapco until further notice
        const vol = 0;
        const efficiency = 0;
        const reason = "Pre-Installation";
        
        data.push({
            date: dateStr,
            recoveredLiters: vol,
            avgTemperatureC: parseFloat((baseTemp + Math.random() * 4 - 2).toFixed(1)),
            salesAmount: 0, // No sales if no volume
            efficiency: efficiency,
            outageReason: reason
        });
    }
    return data;
};

// Generic daily generator for standard fallback
const generateDynamicDaily = (config: StationConfig, baseTemp: number, avgDailyVol: number): DailyRecord[] => {
    const data: DailyRecord[] = [];
    const start = new Date('2025-01-01');
    const end = new Date(TODAY_CUTOFF);
    // Include Today

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        // Random volume around average
        const variance = avgDailyVol * 0.3;
        const vol = Math.max(0, Math.floor(avgDailyVol + (Math.random() * variance * 2 - variance)));
        
        data.push({
            date: dateStr,
            recoveredLiters: vol,
            avgTemperatureC: parseFloat((baseTemp + Math.random() * 4 - 2).toFixed(1)),
            salesAmount: vol * config.salesPricePerLiter,
            efficiency: vol > 0 ? 0.95 : 0,
            outageReason: vol === 0 ? "Maintenance" : undefined
        });
    }
    return data;
};

// Fallback generator for pending/unknown units
const generatePendingData = (config: StationConfig, baseTemp: number): DailyRecord[] => {
    const data: DailyRecord[] = [];
    // Just a placeholder entry
    data.push({
        date: '2024-01-01',
        recoveredLiters: 0,
        avgTemperatureC: 0,
        salesAmount: 0,
        efficiency: 0,
        outageReason: "Pending Installation"
    });
    return data;
};

const generateMonthlyData = (dailyData: DailyRecord[]): MonthlyRecord[] => {
    const grouped: Record < string, {
        vol: number,
        sales: number,
        tempSum: number,
        count: number
    } > = {};

    dailyData.forEach(day => {
        const monthKey = day.date.substring(0, 7);
        if (!grouped[monthKey]) {
            grouped[monthKey] = {
                vol: 0,
                sales: 0,
                tempSum: 0,
                count: 0
            };
        }
        grouped[monthKey].vol += day.recoveredLiters;
        grouped[monthKey].sales += day.salesAmount;
        grouped[monthKey].tempSum += day.avgTemperatureC;
        grouped[monthKey].count++;
    });

    return Object.keys(grouped).sort().map(m => ({
        month: m,
        recoveredLiters: grouped[m].vol,
        salesAmount: grouped[m].sales,
        avgTemperatureC: parseFloat((grouped[m].tempSum / grouped[m].count).toFixed(1))
    }));
};

// --- Repository Methods ---

export const getMachineData = (id: string, baseTemp: number = 25): MachineExtendedData => {
    if (machineDatabase[id]) {
        return machineDatabase[id];
    }

    _isCacheDirty = true; // Mark global cache as dirty since new data is being generated

    let daily: DailyRecord[] = [];
    let hourly: HourlyRecord[] = [];
    
    // Default to the strict 2.18 SAR configuration
    let effectiveConfig = { ...DEFAULT_CONFIG };
    
    // Bahrain Override
    if (id === 'VRU-BAH-01') {
        effectiveConfig = {
            salesPricePerLiter: 0.140, // BHD
            currency: 'BHD',
            targetDailyYield: 450,
            vatRate: 0.10, // 10%
            electricityConsumptionKwPerL: FINANCIAL_DEFAULTS.KW_PER_LITER, 
            electricityCostPerKw: 0.016 // BHD approx
        };
    }

    // GECO UNITS CONFIG - USD Normalized
    if (['SEOIL-01', 'GECO452', 'HUYNDAIPULAS001', 'GECO-OMAN-01'].includes(id) || id.startsWith('GECO')) {
        effectiveConfig = {
            salesPricePerLiter: 1.0, // 1 USD (Not 3.75)
            currency: 'USD',         // Explicit USD
            targetDailyYield: 100,
            vatRate: 0.1,
            electricityConsumptionKwPerL: FINANCIAL_DEFAULTS.KW_PER_LITER,
            electricityCostPerKw: 0.12 
        };
    }

    // SASCO Specific Enforcement - Double check to prevent drift
    if (id.startsWith('VRU-') && id !== 'VRU-BAH-01') {
        effectiveConfig = {
            salesPricePerLiter: 2.18, // Locked to 2.18 SAR
            currency: 'SAR',
            targetDailyYield: 600,
            vatRate: 0.15,
            electricityConsumptionKwPerL: 0.0952,
            electricityCostPerKw: 0.32
        };
    }

    // Handle Pending Units (VRU-P*)
    if (id.startsWith('VRU-P')) {
        hourly = generateHourlyData(baseTemp, 0, true).map(h => ({
            ...h,
            recoveredLiters: 0
        }));
        daily = generatePendingData(effectiveConfig, baseTemp);
    }
    // Specific Units - Using Static Data Maps
    else if (id === 'VRU-A03') {
        daily = buildFromStaticData(effectiveConfig, 29, {
            '2024': AIRPORT3_2024_DATA,
            '2025': AIRPORT3_2025_DATA,
            '2026': AIRPORT3_2026_DATA
        });
        hourly = generateHourlyData(baseTemp, 29);
    } else if (id === 'VRU-WAS') {
        daily = buildFromStaticData(effectiveConfig, 28, {
            '2025': WASIYA_2025_DATA,
            '2026': WASIYA_2026_DATA
        });
        hourly = generateHourlyData(baseTemp, 7);
    } else if (id === 'VRU-RAF') {
        daily = buildFromStaticData(effectiveConfig, 28, {
            '2025': RAFFAYA_2025_DATA,
            '2026': RAFFAYA_2026_DATA
        });
        hourly = generateHourlyData(baseTemp, 10, true);
    } else if (id === 'VRU-KS3') {
        daily = buildFromStaticData(effectiveConfig, 26, {
            '2025': KINGSALMAN3_2025_DATA,
            '2026': KINGSALMAN3_2026_DATA
        });
        hourly = generateHourlyData(baseTemp, 28);
    } else if (id === 'VRU-KRA') {
        daily = buildFromStaticData(effectiveConfig, 30, {
            '2025': KINGABDULLAH_2025_DATA,
            '2026': KINGABDULLAH_2026_DATA
        });
        hourly = generateHourlyData(baseTemp, 12);
    } else if (id === 'VRU-KFR') {
        daily = buildFromStaticData(effectiveConfig, 32, {
            '2025': KINGFAISAL_2025_DATA,
            '2026': KINGFAISAL_2026_DATA
        });
        hourly = generateHourlyData(baseTemp, 9);
    } else if (id === 'VRU-THM') {
        daily = buildFromStaticData(effectiveConfig, 29, {
            '2025': THANEEM_2025_DATA,
            '2026': THANEEM_2026_DATA
        });
        hourly = generateHourlyData(baseTemp, 28);
    } else if (id === 'VRU-ZDY') {
        daily = buildFromStaticData(effectiveConfig, 29, {
            '2025': ZAIDY_2025_DATA,
            '2026': ZAIDY_2026_DATA
        });
        hourly = generateHourlyData(baseTemp, 16);
    } else if (id === 'VRU-MZN') {
        daily = buildFromStaticData(effectiveConfig, 28, {
            '2025': ALMUZANI_2025_DATA,
            '2026': ALMUZANI_2026_DATA
        });
        hourly = generateHourlyData(baseTemp, 12);
    } else if (id === 'VRU-A02') {
        daily = buildFromStaticData(effectiveConfig, 27, {
            '2025': AIRPORT2_2025_DATA,
            '2026': AIRPORT2_2026_DATA
        });
        hourly = generateHourlyData(baseTemp, 24, true);
    } else if (id === 'VRU-LYN') {
        daily = buildFromStaticData(effectiveConfig, 27, {
            '2025': LAYAN_2025_DATA,
            '2026': LAYAN_2026_DATA
        });
        hourly = generateHourlyData(baseTemp, 26, true);
    } else if (id === 'VRU-BAH-01') {
        // Force 0 for pending unit
        daily = generateBapcoDaily(effectiveConfig, 28, 0); 
        hourly = generateHourlyData(baseTemp, 0, true);
    } 
    // --- GECO SPECIFIC UNITS ---
    else if (id === 'SEOIL-01') {
        daily = buildFromStaticData(effectiveConfig, 12, { '2025': SEOIL_2025_DATA });
        hourly = generateHourlyData(baseTemp, 18); // Active flow
    } else if (id === 'GECO452') {
        daily = buildFromStaticData(effectiveConfig, 14, { '2025': GECO452_2025_DATA });
        hourly = generateHourlyData(baseTemp, 15); // Active flow
    } else if (id === 'HUYNDAIPULAS001') {
        daily = buildFromStaticData(effectiveConfig, 15, { '2025': HUYNDAI_2025_DATA });
        hourly = generateHourlyData(baseTemp, 22); // Active flow
    }
    // ---------------------------
    else {
        // Fallback for unknown ID - generate realistic data anyway for demo
        hourly = generateHourlyData(baseTemp, 10); 
        daily = generatePendingData(effectiveConfig, baseTemp);
    }

    // Generate Aggregates
    const monthly = generateMonthlyData(daily);

    const newData: MachineExtendedData = {
        id,
        config: effectiveConfig,
        hourly,
        daily,
        monthly
    };

    machineDatabase[id] = newData;
    return newData;
};

export const updateMachineConfig = (id: string, newConfig: Partial < StationConfig > ): MachineExtendedData => {
    const data = getMachineData(id);
    data.config = {
        ...data.config,
        ...newConfig
    };
    // Recalculate Sales based on new price
    data.daily = data.daily.map(d => ({
        ...d,
        salesAmount: d.recoveredLiters * data.config.salesPricePerLiter
    }));
    // Re-aggregate monthly data to reflect new sales prices
    data.monthly = generateMonthlyData(data.daily);

    machineDatabase[id] = data;
    _isCacheDirty = true; // Invalidate cache on config update
    return data;
};

/**
 * Aggregates fleet data.
 * Optimized with Caching.
 * 
 * IMPORTANT: Normalizes all revenue to SAR (Saudi Riyal) before summing.
 * The display layer (FinancialView) is responsible for converting the final SAR total 
 * to the user's preferred display currency.
 */
export const getAggregatedFleetData = (year: string = '2025', currentFleet?: VRU[]): any[] => {
    
    // Ensure all units in the current fleet are initialized in the repository
    if (currentFleet && currentFleet.length > 0) {
        let anyNew = false;
        currentFleet.forEach(vru => {
            // Only initialize if not already present
            if (!machineDatabase[vru.id]) {
                getMachineData(vru.id, vru.temperatureC);
                anyNew = true;
            }
        });
        if (anyNew) _isCacheDirty = true;
    } else if (Object.keys(machineDatabase).length === 0) {
        // Fallback priming for initial load if no fleet passed
        const knownIds = ['VRU-A03', 'VRU-WAS', 'VRU-RAF', 'VRU-KS3', 'VRU-KRA', 'VRU-KFR', 'VRU-THM', 'VRU-ZDY', 'VRU-MZN', 'VRU-A02', 'VRU-LYN', 'VRU-BAH-01'];
        knownIds.forEach(id => getMachineData(id));
        _isCacheDirty = true;
    }

    // Return Cached Data if valid
    if (!currentFleet && !_isCacheDirty && _cachedAggregatedData[year]) {
        return _cachedAggregatedData[year];
    }

    const totals: Record < string, {
        date: string;recoveredLiters: number;revenue: number;expenses: number;profit: number
    } > = {};

    // Get the list of IDs to aggregate
    let targetMachines: MachineExtendedData[] = [];
    if (currentFleet) {
        // Use Set to ensure UNIQUENESS of IDs to prevent double counting
        const fleetIds = new Set(currentFleet.map(f => f.id));
        targetMachines = Object.values(machineDatabase).filter(m => fleetIds.has(m.id));
    } else {
        targetMachines = Object.values(machineDatabase);
    }

    targetMachines.forEach(machine => {
        const config = machine.config;
        
        // Filter: If 'year' is specific, filter by it. If 'all', take everything up to the defined CUTOFF date.
        const relevantData = machine.daily.filter(d => {
            if (year === 'all') return true;
            return d.date.startsWith(year);
        });
        
        relevantData.forEach(day => {
            if (!totals[day.date]) {
                totals[day.date] = {
                    date: day.date,
                    recoveredLiters: 0,
                    revenue: 0,
                    expenses: 0,
                    profit: 0
                };
            }
            
            // 1. Gross Revenue (in Local Currency)
            // Note: day.salesAmount is calculated in buildFromStaticData using config.salesPricePerLiter
            const dailyRevenueLocal = day.salesAmount;
            
            // 2. VAT Deduction (Calculated per machine config in Local Currency)
            const vatPortionLocal = dailyRevenueLocal - (dailyRevenueLocal / (1 + config.vatRate));
            
            // 3. Electricity Cost (in Local Currency)
            const elecCostLocal = day.recoveredLiters * config.electricityConsumptionKwPerL * config.electricityCostPerKw;
            
            // 4. Total Expenses (Local)
            const dailyExpensesLocal = vatPortionLocal + elecCostLocal;

            // --- NORMALIZE TO SAR BEFORE AGGREGATION ---
            // Determine normalization rate for this machine's currency to Base SAR
            const exchangeRateToSAR = TO_SAR_RATES[config.currency] || 1;

            totals[day.date].recoveredLiters += day.recoveredLiters;
            totals[day.date].revenue += (dailyRevenueLocal * exchangeRateToSAR);
            totals[day.date].expenses += (dailyExpensesLocal * exchangeRateToSAR);
        });
    });
    
    // Calculate final profit
    Object.values(totals).forEach(t => {
        t.profit = t.revenue - t.expenses;
    });

    const result = Object.values(totals).sort((a, b) => a.date.localeCompare(b.date));
    
    if (!currentFleet) {
        _cachedAggregatedData[year] = result;
        _isCacheDirty = false;
    }

    return result;
};
