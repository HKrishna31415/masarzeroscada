
// Detailed Daily Mean Temperature Data (Celsius) for KSA Regions
// Source: Simulation based on historical averages (Open-Meteo baselines)

// Helper to expand compressed seasonal data into daily variance
const generateDaily = (baseTemps: number[], variance: number = 2): number[] => {
    const daily: number[] = [];
    // baseTemps is expected to be 12 monthly averages
    const daysInMonths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    
    baseTemps.forEach((avg, mIdx) => {
        const days = daysInMonths[mIdx];
        for(let i=0; i<days; i++) {
            // Add some noise and trend within the month
            // Early month is closer to prev month avg, late month closer to next
            const progress = i / days;
            const nextMonthAvg = baseTemps[(mIdx + 1) % 12];
            const trend = (nextMonthAvg - avg) * progress;
            const noise = (Math.random() * variance * 2) - variance;
            daily.push(parseFloat((avg + trend + noise).toFixed(1)));
        }
    });
    return daily;
};

// 1. Central Region (Riyadh, Al Kharj, Wasiya)
// Winter: ~14C, Summer: ~43C
const CENTRAL_MONTHLY_2025 = [14, 17, 22, 28, 34, 39, 41, 40, 36, 29, 21, 16];
export const CENTRAL_DAILY_2025 = generateDaily(CENTRAL_MONTHLY_2025);
export const CENTRAL_DAILY_2026 = generateDaily(CENTRAL_MONTHLY_2025); // Simulating similar year

// 2. Qassim Region (Buraydah)
// Slightly cooler nights than Riyadh
const QASSIM_MONTHLY_2025 = [13, 16, 21, 27, 33, 37, 39, 39, 35, 28, 20, 15];
export const QASSIM_DAILY_2025 = generateDaily(QASSIM_MONTHLY_2025);
export const QASSIM_DAILY_2026 = generateDaily(QASSIM_MONTHLY_2025);

// 3. Western Region (Makkah, Jeddah) - Zaidy, Thaneem
// Very hot, warmer winters
const MAKKAH_MONTHLY_2025 = [24, 25, 28, 32, 36, 39, 40, 39, 38, 34, 30, 26];
export const MAKKAH_DAILY_2025 = generateDaily(MAKKAH_MONTHLY_2025);
export const MAKKAH_DAILY_2026 = generateDaily(MAKKAH_MONTHLY_2025);

// 4. Madinah Region (Al Muzani)
// Hot summers, but cooler winters than Makkah
const MADINAH_MONTHLY_2025 = [18, 20, 24, 29, 34, 38, 39, 39, 37, 31, 24, 19];
export const MADINAH_DAILY_2025 = generateDaily(MADINAH_MONTHLY_2025);
export const MADINAH_DAILY_2026 = generateDaily(MADINAH_MONTHLY_2025);

// 5. Eastern Region (Dammam, Jubail) - Airport 2, Layan
// Humid, similar temps to Riyadh but less extreme variance
const EASTERN_MONTHLY_2025 = [16, 18, 22, 27, 33, 37, 39, 38, 35, 30, 23, 17];
export const EASTERN_DAILY_2025 = generateDaily(EASTERN_MONTHLY_2025);
export const EASTERN_DAILY_2026 = generateDaily(EASTERN_MONTHLY_2025);

// 6. Southern Highland (Abha) - King Abdullah
// Unique mild climate
const ABHA_MONTHLY_2025 = [13, 14, 16, 18, 21, 23, 23, 23, 21, 18, 15, 13];
export const ABHA_DAILY_2025 = generateDaily(ABHA_MONTHLY_2025, 1.5); // Less variance
export const ABHA_DAILY_2026 = generateDaily(ABHA_MONTHLY_2025, 1.5);

// 7. Southern Coastal (Jizan) - King Faisal
// Hot and stable
const JIZAN_MONTHLY_2025 = [26, 27, 29, 31, 33, 34, 34, 33, 32, 31, 29, 27];
export const JIZAN_DAILY_2025 = generateDaily(JIZAN_MONTHLY_2025, 1); // Very stable
export const JIZAN_DAILY_2026 = generateDaily(JIZAN_MONTHLY_2025, 1);

// Map of Regions to their Data
export const REGIONAL_WEATHER_MAP: Record<string, { '2025': number[], '2026': number[] }> = {
    'Central': { '2025': CENTRAL_DAILY_2025, '2026': CENTRAL_DAILY_2026 }, // Riyadh
    'Qassim': { '2025': QASSIM_DAILY_2025, '2026': QASSIM_DAILY_2026 },   // Buraydah
    'Western': { '2025': MAKKAH_DAILY_2025, '2026': MAKKAH_DAILY_2026 },  // Makkah
    'Madinah': { '2025': MADINAH_DAILY_2025, '2026': MADINAH_DAILY_2026 },// Madinah
    'Eastern': { '2025': EASTERN_DAILY_2025, '2026': EASTERN_DAILY_2026 },// Dammam
    'Abha': { '2025': ABHA_DAILY_2025, '2026': ABHA_DAILY_2026 },         // Abha
    'Jizan': { '2025': JIZAN_DAILY_2025, '2026': JIZAN_DAILY_2026 },      // Jizan
};
