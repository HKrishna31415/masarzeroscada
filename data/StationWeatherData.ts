
// Detailed Daily Weather Data for Specific Station Coordinates
// Simulating real historical data pulled from an API like Open-Meteo

export interface StationClimateProfile {
    id: string;
    lat: number;
    lng: number;
    monthlyMeans: number[]; // Jan-Dec average temps
    variance: number; // Day-to-day volatility
}

// Exact Climate Profiles for our 11 specific locations
const STATIONS: StationClimateProfile[] = [
    // 1. Riyadh Airport (VRU-A03) - Hot Desert
    { id: 'VRU-A03', lat: 24.957640, lng: 46.698820, monthlyMeans: [14, 17, 22, 28, 34, 39, 41, 40, 36, 29, 21, 16], variance: 3.5 },
    // 2. Wasiya (VRU-WAS) - Inland Desert, similar to Riyadh
    { id: 'VRU-WAS', lat: 25.122639, lng: 47.509861, monthlyMeans: [13, 16, 21, 27, 33, 38, 40, 39, 35, 28, 20, 15], variance: 4.0 },
    // 3. Raffaya (VRU-RAF) - Al Kharj, very hot
    { id: 'VRU-RAF', lat: 24.314167, lng: 47.165500, monthlyMeans: [15, 18, 23, 29, 35, 40, 42, 41, 37, 30, 22, 17], variance: 3.0 },
    // 4. King Salman 3 (VRU-KS3) - Buraydah, continental desert
    { id: 'VRU-KS3', lat: 26.345722, lng: 43.951028, monthlyMeans: [12, 15, 20, 26, 32, 37, 39, 39, 35, 27, 19, 14], variance: 4.5 },
    // 5. King Abdullah (VRU-KRA) - Abha, High Altitude, Mild/Cool
    { id: 'VRU-KRA', lat: 18.225500, lng: 42.535000, monthlyMeans: [13, 14, 16, 18, 21, 23, 23, 23, 21, 18, 15, 13], variance: 2.0 },
    // 6. King Faisal (VRU-KFR) - Jizan, Coastal Tropical, Hot/Stable
    { id: 'VRU-KFR', lat: 16.897000, lng: 42.570000, monthlyMeans: [26, 27, 29, 31, 33, 34, 34, 33, 32, 31, 29, 27], variance: 1.2 },
    // 7. Thaneem (VRU-THM) - Makkah, Hot
    { id: 'VRU-THM', lat: 21.464400, lng: 39.805000, monthlyMeans: [24, 25, 28, 32, 36, 39, 40, 39, 38, 34, 30, 26], variance: 2.5 },
    // 8. Zaidy (VRU-ZDY) - Makkah, Hot
    { id: 'VRU-ZDY', lat: 21.392700, lng: 39.733300, monthlyMeans: [24, 25, 29, 33, 37, 40, 41, 40, 39, 35, 30, 26], variance: 2.5 },
    // 9. Al Muzani (VRU-MZN) - Madinah, Hot dry
    { id: 'VRU-MZN', lat: 24.425000, lng: 39.550000, monthlyMeans: [18, 20, 24, 29, 34, 38, 39, 39, 37, 31, 24, 19], variance: 3.0 },
    // 10. Airport 2 (VRU-A02) - Dammam, Humid/Hot
    { id: 'VRU-A02', lat: 26.435000, lng: 49.785000, monthlyMeans: [16, 18, 22, 27, 33, 37, 39, 38, 35, 30, 23, 17], variance: 3.0 },
    // 11. Layan (VRU-LYN) - Dammam, Humid/Hot
    { id: 'VRU-LYN', lat: 26.540000, lng: 50.015000, monthlyMeans: [16, 18, 23, 28, 34, 38, 40, 39, 36, 31, 24, 18], variance: 3.0 },
    // 12. Hamad Town (VRU-BAH-01) - Bahrain, Similar to Dammam
    { id: 'VRU-BAH-01', lat: 26.115300, lng: 50.506400, monthlyMeans: [17, 18, 22, 27, 32, 36, 38, 38, 36, 32, 25, 19], variance: 2.8 },
];

// Seeded random for consistency
const getSeededRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
};

const generateDailyData = (profile: StationClimateProfile) => {
    const dailyData: Record<string, number> = {}; // Date -> Temp
    const start2025 = new Date('2025-01-01');
    const end2026 = new Date('2026-12-31');
    const daysInMonths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    let currentDate = new Date(start2025);
    let dayCount = 0;

    // Generate for 2 full years
    while (currentDate <= end2026) {
        const monthIdx = currentDate.getMonth();
        const dayInMonth = currentDate.getDate();
        const totalDaysInMonth = daysInMonths[monthIdx];
        
        // Base monthly mean
        const currentMonthMean = profile.monthlyMeans[monthIdx];
        
        // Interpolate towards next month for smoothness
        const nextMonthMean = profile.monthlyMeans[(monthIdx + 1) % 12];
        const progress = dayInMonth / totalDaysInMonth;
        const trend = (nextMonthMean - currentMonthMean) * progress;
        
        // Add Noise
        // Unique seed per station per day to ensure stability but randomness
        const seed = profile.lat + profile.lng + dayCount;
        const randomVal = getSeededRandom(seed); // 0-1
        const noise = (randomVal * profile.variance * 2) - profile.variance;

        // Anomaly Injection (Heatwaves/Cold Snaps)
        let anomaly = 0;
        if (getSeededRandom(seed * 2) > 0.95) {
            anomaly = profile.variance * 1.5; // Spike
        } else if (getSeededRandom(seed * 3) > 0.95) {
            anomaly = -profile.variance * 1.5; // Dip
        }

        const temp = parseFloat((currentMonthMean + trend + noise + anomaly).toFixed(1));
        
        dailyData[currentDate.toISOString().split('T')[0]] = temp;

        currentDate.setDate(currentDate.getDate() + 1);
        dayCount++;
    }
    return dailyData;
};

// LAZY GENERATION: Only generate when requested, store in memory
let _cachedStationData: Record<string, Record<string, number>> | null = null;

const getAllStationData = () => {
    if (_cachedStationData) {
        return _cachedStationData;
    }
    
    // Performance: Generate on demand
    const data: Record<string, Record<string, number>> = {};
    STATIONS.forEach(station => {
        data[station.id] = generateDailyData(station);
    });
    
    _cachedStationData = data;
    return data;
};

// Export helper to find nearest station and get data
export const getStationSpecificData = (lat: number, lng: number) => {
    // Find nearest station
    let minDist = Infinity;
    let nearestStationId = STATIONS[0].id;

    STATIONS.forEach(station => {
        const dist = Math.sqrt(Math.pow(station.lat - lat, 2) + Math.pow(station.lng - lng, 2));
        if (dist < minDist) {
            minDist = dist;
            nearestStationId = station.id;
        }
    });

    return {
        stationId: nearestStationId,
        // Call lazy getter
        data: getAllStationData()[nearestStationId]
    };
};
