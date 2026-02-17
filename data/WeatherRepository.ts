
import { getStationSpecificData } from './StationWeatherData';

// Cache key for LocalStorage
const STORAGE_KEY = 'lasoil_weather_cache_v3';

export interface WeatherDataPoint {
    date: string;
    maxTemp: number;
    minTemp: number;
    meanTemp: number;
}

// Load cache from storage on initialization
let weatherCache: Record<string, any> = {};
try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        weatherCache = JSON.parse(stored);
    }
} catch (e) {
    console.warn("Failed to load weather cache", e);
}

const saveCache = () => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(weatherCache));
    } catch (e) {
        console.warn("Failed to save weather cache (quota exceeded?)", e);
    }
};

/**
 * Fetches historical daily weather.
 * Logic:
 * 1. Identify specific station via Lat/Lng proximity (Nearest Neighbor).
 * 2. Retrieve detailed pre-generated daily data for that station.
 * 3. Construct DataPoint objects with realistic High/Low derived from Mean.
 */
export const getHistoricalWeather = async (
    lat: number, 
    lng: number, 
    startDate: string, 
    endDate: string
): Promise<WeatherDataPoint[]> => {
    // Round coords to 2 decimals for cache key stability
    const coordKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;
    const cacheKey = `v3_${coordKey}_${startDate}_${endDate}`;
    
    if (weatherCache[cacheKey]) {
        return weatherCache[cacheKey];
    }

    const { data: stationDailyTemps } = getStationSpecificData(lat, lng);
    const results: WeatherDataPoint[] = [];
    
    const curr = new Date(startDate);
    const end = new Date(endDate);

    while (curr <= end) {
        const dStr = curr.toISOString().split('T')[0];
        
        // Fetch specific daily mean
        // If date out of range (e.g. 2024), default to 25 or look for same day in 2025
        let mean = stationDailyTemps[dStr];
        
        if (mean === undefined) {
            // Fallback Logic: Try to find the same Month-Day in 2025
            const fallbackDate = `2025-${dStr.substring(5)}`;
            mean = stationDailyTemps[fallbackDate] || 25; 
        }

        // Generate High/Low relative to the specific daily mean
        // Desert climates often have larger diurnal swings (High - Low) than coastal.
        // We can approximate this swing based on the mean (hotter days often have wider swings in deserts).
        const swing = mean > 30 ? 12 : 8; 
        const maxTemp = parseFloat((mean + (swing / 2) + Math.random()).toFixed(1));
        const minTemp = parseFloat((mean - (swing / 2) - Math.random()).toFixed(1));

        results.push({
            date: dStr,
            meanTemp: mean,
            maxTemp,
            minTemp
        });

        curr.setDate(curr.getDate() + 1);
    }

    // Cache results
    weatherCache[cacheKey] = results;
    saveCache();

    return results;
};

/**
 * Fetches current weather conditions.
 * Uses Open-Meteo Forecast API for LIVE data only (Dashboard Widget).
 */
export const getCurrentWeather = async (lat: number, lng: number) => {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`;
        const response = await fetch(url);
        return await response.json();
    } catch (error) {
        // Fallback for offline mode using our static data
        const { data: stationDailyTemps } = getStationSpecificData(lat, lng);
        const todayStr = new Date().toISOString().split('T')[0];
        const mean = stationDailyTemps[todayStr] || 30;
        
        return {
            current_weather: {
                temperature: mean,
                windspeed: 12 + Math.random() * 5,
                weathercode: 0
            }
        };
    }
};
