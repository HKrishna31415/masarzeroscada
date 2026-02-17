
import { VRU, Alert, MaintenanceTask, InventoryItem } from './types';

// Helper to generate alerts based on unit ID
const generateAlertsForUnit = (u: VRU): Alert[] => {
    const alerts: Alert[] = [];
    
    // Correction: Evaporator Overload is on Airport 2 (VRU-A02)
    if (u.id === 'VRU-A02') {
        alerts.push({
            id: 'ALT-A02-EVAP',
            severity: 'Critical',
            message: 'Evaporator overload',
            timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
            acknowledged: false,
            machineId: u.id,
            machineName: u.name
        });
    }

    // Correction: Layan is Offline
    if (u.id === 'VRU-LYN') {
        alerts.push({
            id: 'ALT-LYN-OFF',
            severity: 'Warning',
            message: 'Unit Offline - Signal Lost',
            timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3 hours ago
            acknowledged: false,
            machineId: u.id,
            machineName: u.name
        });
    }

    return alerts;
};

export const generateFleet = (): VRU[] => {
    const units: VRU[] = [
        {
            id: 'VRU-A03',
            name: 'Airport Unit 3',
            owner: 'Sasco',
            status: 'Running',
            country: 'KSA',
            city: 'Riyadh',
            region: 'Central',
            latitude: 24.957640,
            longitude: 46.698820,
            recoveryRateLitersPerHour: 32,
            recoveryRatePercentage: 0.99,
            totalRecoveredAmount: 0, // Calculated in Repo
            co2ReducedKg: 0,
            pressurePSI: 14.2,
            temperatureC: 29,
            revenueSAR: 0,
            lastMaintenanceDate: '2025-01-15',
            nextMaintenanceDate: '2025-04-15',
            healthScore: 98,
            alerts: [],
            stationDetails: { pumps: 12, tanks91: 2, tanks95: 2, trucksPerDay: 4, dailySalesLiters: 45000 }
        },
        {
            id: 'VRU-WAS',
            name: 'Wasiya Station',
            owner: 'Sasco',
            status: 'Running',
            country: 'KSA',
            city: 'Riyadh',
            region: 'Central',
            latitude: 25.122639,
            longitude: 47.509861,
            recoveryRateLitersPerHour: 28,
            recoveryRatePercentage: 0.95,
            totalRecoveredAmount: 0,
            co2ReducedKg: 0,
            pressurePSI: 13.8,
            temperatureC: 28,
            revenueSAR: 0,
            lastMaintenanceDate: '2025-02-01',
            nextMaintenanceDate: '2025-05-01',
            healthScore: 96,
            alerts: [],
            stationDetails: { pumps: 8, tanks91: 1, tanks95: 1, trucksPerDay: 2, dailySalesLiters: 28000 }
        },
        {
            id: 'VRU-RAF',
            name: 'Raffaya',
            owner: 'Sasco',
            status: 'Stopped',
            country: 'KSA',
            city: 'Al Kharj',
            region: 'Central',
            latitude: 24.314167,
            longitude: 47.165500,
            recoveryRateLitersPerHour: 0,
            recoveryRatePercentage: 0,
            totalRecoveredAmount: 0,
            co2ReducedKg: 0,
            pressurePSI: 0,
            temperatureC: 28,
            revenueSAR: 0,
            lastMaintenanceDate: '2025-01-20',
            nextMaintenanceDate: '2025-02-20', // Due soon
            healthScore: 85,
            alerts: [],
            stationDetails: { pumps: 6, tanks91: 1, tanks95: 1, trucksPerDay: 1, dailySalesLiters: 15000 }
        },
        {
            id: 'VRU-KS3',
            name: 'King Salman Rd 3',
            owner: 'Sasco',
            status: 'Running',
            country: 'KSA',
            city: 'Buraydah',
            region: 'Central', // Consolidated from Qassim
            latitude: 26.345722,
            longitude: 43.951028,
            recoveryRateLitersPerHour: 30,
            recoveryRatePercentage: 0.97,
            totalRecoveredAmount: 0,
            co2ReducedKg: 0,
            pressurePSI: 14.5,
            temperatureC: 26,
            revenueSAR: 0,
            lastMaintenanceDate: '2024-12-10',
            nextMaintenanceDate: '2025-03-10',
            healthScore: 92,
            alerts: [],
            stationDetails: { pumps: 10, tanks91: 2, tanks95: 1, trucksPerDay: 3, dailySalesLiters: 38000 }
        },
        {
            id: 'VRU-KRA',
            name: 'King Abdullah Rd',
            owner: 'Sasco',
            status: 'Running',
            country: 'KSA',
            city: 'Abha',
            region: 'Southern', // Consolidated from Abha
            latitude: 18.225500,
            longitude: 42.535000,
            recoveryRateLitersPerHour: 25,
            recoveryRatePercentage: 0.94,
            totalRecoveredAmount: 0,
            co2ReducedKg: 0,
            pressurePSI: 13.2,
            temperatureC: 20,
            revenueSAR: 0,
            lastMaintenanceDate: '2025-01-05',
            nextMaintenanceDate: '2025-04-05',
            healthScore: 95,
            alerts: [],
            stationDetails: { pumps: 8, tanks91: 2, tanks95: 1, trucksPerDay: 2, dailySalesLiters: 32000 }
        },
        {
            id: 'VRU-KFR',
            name: 'King Faisal Rd',
            owner: 'Sasco',
            status: 'Running',
            country: 'KSA',
            city: 'Jizan',
            region: 'Southern', // Consolidated from Jizan
            latitude: 16.897000,
            longitude: 42.570000,
            recoveryRateLitersPerHour: 35,
            recoveryRatePercentage: 0.98,
            totalRecoveredAmount: 0,
            co2ReducedKg: 0,
            pressurePSI: 14.8,
            temperatureC: 32,
            revenueSAR: 0,
            lastMaintenanceDate: '2025-02-10',
            nextMaintenanceDate: '2025-05-10',
            healthScore: 99,
            alerts: [],
            stationDetails: { pumps: 14, tanks91: 3, tanks95: 2, trucksPerDay: 5, dailySalesLiters: 55000 }
        },
        {
            id: 'VRU-THM',
            name: 'Thaneem',
            owner: 'Sasco',
            status: 'Running',
            country: 'KSA',
            city: 'Makkah',
            region: 'Western',
            latitude: 21.464400,
            longitude: 39.805000,
            recoveryRateLitersPerHour: 33,
            recoveryRatePercentage: 0.96,
            totalRecoveredAmount: 0,
            co2ReducedKg: 0,
            pressurePSI: 14.0,
            temperatureC: 34,
            revenueSAR: 0,
            lastMaintenanceDate: '2025-01-25',
            nextMaintenanceDate: '2025-04-25',
            healthScore: 97,
            alerts: [],
            stationDetails: { pumps: 12, tanks91: 2, tanks95: 2, trucksPerDay: 4, dailySalesLiters: 48000 }
        },
        {
            id: 'VRU-ZDY',
            name: 'Zaidy',
            owner: 'Sasco',
            status: 'Running',
            country: 'KSA',
            city: 'Makkah',
            region: 'Western',
            latitude: 21.392700,
            longitude: 39.733300,
            recoveryRateLitersPerHour: 31,
            recoveryRatePercentage: 0.95,
            totalRecoveredAmount: 0,
            co2ReducedKg: 0,
            pressurePSI: 13.9,
            temperatureC: 33,
            revenueSAR: 0,
            lastMaintenanceDate: '2025-01-10',
            nextMaintenanceDate: '2025-04-10',
            healthScore: 96,
            alerts: [],
            stationDetails: { pumps: 10, tanks91: 2, tanks95: 1, trucksPerDay: 3, dailySalesLiters: 42000 }
        },
        {
            id: 'VRU-MZN',
            name: 'Al Muzani',
            owner: 'Sasco',
            status: 'Running',
            country: 'KSA',
            city: 'Madinah',
            region: 'Western', // Consolidated from Madinah
            latitude: 24.425000,
            longitude: 39.550000,
            recoveryRateLitersPerHour: 29,
            recoveryRatePercentage: 0.93,
            totalRecoveredAmount: 0,
            co2ReducedKg: 0,
            pressurePSI: 13.5,
            temperatureC: 30,
            revenueSAR: 0,
            lastMaintenanceDate: '2024-12-20',
            nextMaintenanceDate: '2025-03-20',
            healthScore: 94,
            alerts: [],
            stationDetails: { pumps: 8, tanks91: 2, tanks95: 1, trucksPerDay: 2, dailySalesLiters: 35000 }
        },
        {
            id: 'VRU-A02',
            name: 'Airport Unit 2',
            owner: 'Sasco',
            status: 'Running',
            country: 'KSA',
            city: 'Dammam',
            region: 'Eastern',
            latitude: 26.435000,
            longitude: 49.785000,
            recoveryRateLitersPerHour: 30,
            recoveryRatePercentage: 0.96,
            totalRecoveredAmount: 0,
            co2ReducedKg: 0,
            pressurePSI: 14.1,
            temperatureC: 29,
            revenueSAR: 0,
            lastMaintenanceDate: '2025-01-30',
            nextMaintenanceDate: '2025-04-30',
            healthScore: 97,
            alerts: [],
            stationDetails: { pumps: 10, tanks91: 2, tanks95: 2, trucksPerDay: 3, dailySalesLiters: 40000 }
        },
        {
            id: 'VRU-LYN',
            name: 'Layan',
            owner: 'Sasco',
            status: 'Offline', // Layan is now Offline as requested
            country: 'KSA',
            city: 'Dammam',
            region: 'Eastern',
            latitude: 26.540000,
            longitude: 50.015000,
            recoveryRateLitersPerHour: 0,
            recoveryRatePercentage: 0,
            totalRecoveredAmount: 0,
            co2ReducedKg: 0,
            pressurePSI: 0,
            temperatureC: 28,
            revenueSAR: 0,
            lastMaintenanceDate: '2025-02-05',
            nextMaintenanceDate: '2025-05-05',
            healthScore: 0,
            alerts: [],
            stationDetails: { pumps: 8, tanks91: 1, tanks95: 1, trucksPerDay: 2, dailySalesLiters: 30000 }
        },
        {
            id: 'VRU-BAH-01',
            name: 'Hamad Town Unit',
            owner: 'Bapco',
            status: 'Pending_Install',
            country: 'Bahrain',
            city: 'Hamad Town',
            region: 'Bahrain',
            latitude: 26.115300,
            longitude: 50.506400,
            recoveryRateLitersPerHour: 0,
            recoveryRatePercentage: 0,
            totalRecoveredAmount: 0,
            co2ReducedKg: 0,
            pressurePSI: 0,
            temperatureC: 28,
            revenueSAR: 0,
            lastMaintenanceDate: '-',
            nextMaintenanceDate: '-',
            healthScore: 100,
            alerts: [],
            stationDetails: { pumps: 6, tanks91: 1, tanks95: 1, trucksPerDay: 1, dailySalesLiters: 25000 }
        }
    ];

    // Inject Alerts
    return units.map(u => {
        u.alerts = generateAlertsForUnit(u);
        return u;
    });
};

export const generateGecoFleet = (): VRU[] => {
    return [
        {
            id: 'SEOIL-01',
            name: 'Seoil Station 1',
            owner: 'GECO',
            status: 'Running',
            country: 'South Korea',
            city: 'Seoul',
            region: 'Gangnam',
            latitude: 37.5665,
            longitude: 126.9780,
            recoveryRateLitersPerHour: 22,
            recoveryRatePercentage: 0.98,
            totalRecoveredAmount: 0,
            co2ReducedKg: 0,
            pressurePSI: 14.0,
            temperatureC: 15,
            revenueSAR: 0,
            lastMaintenanceDate: '2025-01-10',
            nextMaintenanceDate: '2025-04-10',
            healthScore: 99,
            alerts: [],
            stationDetails: { pumps: 8, tanks91: 2, tanks95: 2, trucksPerDay: 3, dailySalesLiters: 35000 }
        },
        {
            id: 'GECO452',
            name: 'GECO #452',
            owner: 'GECO',
            status: 'Running',
            country: 'South Korea',
            city: 'Busan',
            region: 'Busan Port',
            latitude: 35.1796,
            longitude: 129.0756,
            recoveryRateLitersPerHour: 18,
            recoveryRatePercentage: 0.96,
            totalRecoveredAmount: 0,
            co2ReducedKg: 0,
            pressurePSI: 13.8,
            temperatureC: 18,
            revenueSAR: 0,
            lastMaintenanceDate: '2025-02-01',
            nextMaintenanceDate: '2025-05-01',
            healthScore: 97,
            alerts: [],
            stationDetails: { pumps: 6, tanks91: 2, tanks95: 1, trucksPerDay: 2, dailySalesLiters: 28000 }
        },
        {
            id: 'HUYNDAIPULAS001',
            name: 'Hyundai Pulas',
            owner: 'GECO',
            status: 'Running',
            country: 'South Korea',
            city: 'Incheon',
            region: 'Incheon',
            latitude: 37.4563,
            longitude: 126.7052,
            recoveryRateLitersPerHour: 25,
            recoveryRatePercentage: 0.97,
            totalRecoveredAmount: 0,
            co2ReducedKg: 0,
            pressurePSI: 14.1,
            temperatureC: 14,
            revenueSAR: 0,
            lastMaintenanceDate: '2025-01-20',
            nextMaintenanceDate: '2025-04-20',
            healthScore: 98,
            alerts: [],
            stationDetails: { pumps: 10, tanks91: 2, tanks95: 2, trucksPerDay: 4, dailySalesLiters: 42000 }
        },
        {
            id: 'GECO-OMAN-01',
            name: 'Oman Pilot Unit',
            owner: 'GECO',
            status: 'Pending_Install',
            country: 'Oman',
            city: 'Muscat',
            region: 'Muscat',
            latitude: 23.5880,
            longitude: 58.3829,
            recoveryRateLitersPerHour: 0,
            recoveryRatePercentage: 0,
            totalRecoveredAmount: 0,
            co2ReducedKg: 0,
            pressurePSI: 0,
            temperatureC: 30,
            revenueSAR: 0,
            lastMaintenanceDate: '-',
            nextMaintenanceDate: '-',
            healthScore: 100,
            alerts: [],
            stationDetails: { pumps: 6, tanks91: 1, tanks95: 1, trucksPerDay: 1, dailySalesLiters: 20000 }
        }
    ];
};

export const generateMasterFleet = (): VRU[] => {
    return [...generateFleet(), ...generateGecoFleet()];
};

export const generateMaintenanceTasks = (fleet: VRU[]): MaintenanceTask[] => {
    return [];
};

export const generateInventory = (): InventoryItem[] => {
    return [
        { id: 'INV-VP-11', name: 'Vacuum Pump', sku: 'VP-2025-X', quantity: 11, minThreshold: 3, category: 'Major Components', status: 'In Stock' }
    ];
};
