// Helper to distribute a monthly total into roughly even daily amounts with some variance
const distribute = (total: number, days: number): number[] => {
    if (total <= 0) return Array(days).fill(0);
    
    const baseAvg = Math.floor(total / days);
    const data = [];

    for (let i = 0; i < days; i++) {
        let val = baseAvg;
        if (baseAvg > 5) {
            const variance = Math.floor(baseAvg * 0.2);
            val = baseAvg + Math.floor(Math.random() * (variance * 2 + 1)) - variance;
        }
        val = Math.max(0, val);
        data.push(val);
    }

    let currentSum = data.reduce((a, b) => a + b, 0);
    let diff = total - currentSum;
    let i = 0;
    while (diff !== 0) {
        if (diff > 0) {
            data[i]++;
            diff--;
        } else {
            if (data[i] > 0) {
                data[i]--;
                diff++;
            }
        }
        i = (i + 1) % days;
    }
    return data;
};

// SEOIL-01 Monthly Totals (from screenshot)
export const SEOIL_2025_DATA: Record<string, number[]> = {
    '01': distribute(487, 31),
    '02': distribute(530, 28),
    '03': distribute(1622, 31),
    '04': distribute(1755, 30),
    '05': distribute(56, 31),
    '12': distribute(1263, 31),
};

// GECO452 Monthly Totals (from screenshot)
export const GECO452_2025_DATA: Record<string, number[]> = {
    '01': distribute(244, 31),
    '08': distribute(238, 31),
    '09': distribute(1044, 30),
    '10': distribute(30, 31),
    '12': distribute(1263, 31),
};

// HUYNDAIPULAS001 Monthly Totals (from screenshot)
export const HUYNDAI_2025_DATA: Record<string, number[]> = {
    '01': distribute(274, 31),
    '02': distribute(339, 28),
    '03': distribute(524, 31),
    '04': distribute(764, 30),
    '05': distribute(769, 31),
    '06': distribute(853, 30),
    '07': distribute(347, 31),
    '08': distribute(352, 31),
    '09': distribute(160, 30),
    '11': distribute(79, 30),
    '12': distribute(164, 31),
};

// ASENG Monthly Totals
export const ASENG_2025_DATA: Record<string, number[]> = {
    '01': Array(31).fill(0),
    '02': Array(28).fill(0),
    '03': Array(31).fill(0),
    '04': Array(30).fill(0),
    '05': Array(31).fill(0),
    '06': Array(30).fill(0),
    '07': Array(31).fill(0),
    '08': Array(31).fill(0),
    '09': Array(30).fill(0),
    '10': Array(31).fill(0),
    '11': distribute(1590, 30),
    '12': distribute(1262, 31),
};

// ARIRANG Monthly Totals
export const ARIRANG_2025_DATA: Record<string, number[]> = {
    '01': Array(31).fill(0),
    '02': Array(28).fill(0),
    '03': Array(31).fill(0),
    '04': Array(30).fill(0),
    '05': Array(31).fill(0),
    '06': Array(30).fill(0),
    '07': Array(31).fill(0),
    '08': Array(31).fill(0),
    '09': Array(30).fill(0),
    '10': Array(31).fill(0),
    '11': distribute(2097, 30),
    '12': Array(31).fill(0),
};

// S-OIL-CLOVER Monthly Totals
export const SOILCLOVER_2025_DATA: Record<string, number[]> = {
    '01': Array(31).fill(0),
    '02': Array(28).fill(0),
    '03': Array(31).fill(0),
    '04': Array(30).fill(0),
    '05': Array(31).fill(0),
    '06': Array(30).fill(0),
    '07': Array(31).fill(0),
    '08': Array(31).fill(0),
    '09': Array(30).fill(0),
    '10': Array(31).fill(0),
    '11': distribute(1442, 30),
    '12': Array(31).fill(0),
};

// IRONMAN Monthly Totals
export const IRONMAN_2025_DATA: Record<string, number[]> = {
    '01': Array(31).fill(0),
    '02': Array(28).fill(0),
    '03': Array(31).fill(0),
    '04': Array(30).fill(0),
    '05': Array(31).fill(0),
    '06': Array(30).fill(0),
    '07': Array(31).fill(0),
    '08': Array(31).fill(0),
    '09': Array(30).fill(0),
    '10': distribute(1948, 31),
    '11': Array(30).fill(0),
    '12': Array(31).fill(0),
};

// BAEK-JE Monthly Totals
export const BAEKJE_2025_DATA: Record<string, number[]> = {
    '01': Array(31).fill(0),
    '02': Array(28).fill(0),
    '03': Array(31).fill(0),
    '04': Array(30).fill(0),
    '05': Array(31).fill(0),
    '06': Array(30).fill(0),
    '07': Array(31).fill(0),
    '08': Array(31).fill(0),
    '09': Array(30).fill(0),
    '10': distribute(1209, 31),
    '11': Array(30).fill(0),
    '12': Array(31).fill(0),
};

// MYONG-POOM Monthly Totals
export const MYONGPOOM_2025_DATA: Record<string, number[]> = {
    '01': Array(31).fill(0),
    '02': Array(28).fill(0),
    '03': Array(31).fill(0),
    '04': Array(30).fill(0),
    '05': Array(31).fill(0),
    '06': Array(30).fill(0),
    '07': Array(31).fill(0),
    '08': Array(31).fill(0),
    '09': Array(30).fill(0),
    '10': distribute(1339, 31),
    '11': Array(30).fill(0),
    '12': Array(31).fill(0),
};

// NEW-TOWN Monthly Totals
export const NEWTOWN_2025_DATA: Record<string, number[]> = {
    '01': Array(31).fill(0),
    '02': Array(28).fill(0),
    '03': Array(31).fill(0),
    '04': Array(30).fill(0),
    '05': Array(31).fill(0),
    '06': Array(30).fill(0),
    '07': Array(31).fill(0),
    '08': Array(31).fill(0),
    '09': Array(30).fill(0),
    '10': distribute(2241, 31),
    '11': Array(30).fill(0),
    '12': Array(31).fill(0),
};

// BETMAN01 Monthly Totals
export const BETMAN01_2025_DATA: Record<string, number[]> = {
    '01': Array(31).fill(0),
    '02': Array(28).fill(0),
    '03': Array(31).fill(0),
    '04': Array(30).fill(0),
    '05': Array(31).fill(0),
    '06': Array(30).fill(0),
    '07': Array(31).fill(0),
    '08': Array(31).fill(0),
    '09': Array(30).fill(0),
    '10': distribute(1220, 31),
    '11': Array(30).fill(0),
    '12': Array(31).fill(0),
};

// BETMAN-02 Monthly Totals
export const BETMAN02_2025_DATA: Record<string, number[]> = {
    '01': Array(31).fill(0),
    '02': Array(28).fill(0),
    '03': Array(31).fill(0),
    '04': Array(30).fill(0),
    '05': Array(31).fill(0),
    '06': Array(30).fill(0),
    '07': Array(31).fill(0),
    '08': Array(31).fill(0),
    '09': Array(30).fill(0),
    '10': distribute(1361, 31),
    '11': Array(30).fill(0),
    '12': Array(31).fill(0),
};
