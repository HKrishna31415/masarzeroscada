
// Helper to distribute a monthly total into roughly even daily amounts with some variance
const distribute = (total: number, days: number): number[] => {
    if (total <= 0) return Array(days).fill(0);
    
    const baseAvg = Math.floor(total / days);
    const remainder = total % days;
    const data = [];

    for (let i = 0; i < days; i++) {
        // Add random variance +/- 20%
        let val = baseAvg;
        if (baseAvg > 5) {
            const variance = Math.floor(baseAvg * 0.2);
            val = baseAvg + Math.floor(Math.random() * (variance * 2 + 1)) - variance;
        }
        // Ensure non-negative
        val = Math.max(0, val);
        data.push(val);
    }

    // Adjust to match exact total
    let currentSum = data.reduce((a, b) => a + b, 0);
    let diff = total - currentSum;

    // Distribute difference
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
// Jan: 487, Feb: 530, Mar: 1622, Apr: 1755, May: 56, Jun-Nov: 0, Dec: 1263
export const SEOIL_2025_DATA: Record<string, number[]> = {
    '01': distribute(487, 31),
    '02': distribute(530, 28),
    '03': distribute(1622, 31),
    '04': distribute(1755, 30),
    '05': distribute(56, 31),
    '06': distribute(0, 30),
    '07': distribute(0, 31),
    '08': distribute(0, 31),
    '09': distribute(0, 30),
    '10': distribute(0, 31),
    '11': distribute(0, 30),
    '12': distribute(1263, 31),
};

// GECO452 Monthly Totals (from screenshot)
// Jan: 244, Feb-Jul: 0, Aug: 238, Sep: 1044, Oct: 30, Nov: 0, Dec: 1263
export const GECO452_2025_DATA: Record<string, number[]> = {
    '01': distribute(244, 31),
    '02': distribute(0, 28),
    '03': distribute(0, 31),
    '04': distribute(0, 30),
    '05': distribute(0, 31),
    '06': distribute(0, 30),
    '07': distribute(0, 31),
    '08': distribute(238, 31),
    '09': distribute(1044, 30),
    '10': distribute(30, 31),
    '11': distribute(0, 30),
    '12': distribute(1263, 31),
};

// HUYNDAIPULAS001 Monthly Totals (from screenshot)
// Jan: 274, Feb: 339, Mar: 524, Apr: 764, May: 769, Jun: 853, Jul: 347, Aug: 352, Sep: 160, Oct: 0, Nov: 79, Dec: 164
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
    '10': distribute(0, 31),
    '11': distribute(79, 30),
    '12': distribute(164, 31),
};
