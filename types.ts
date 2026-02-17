
export type ViewState = 
  | 'dashboard' 
  | 'maps' 
  | 'machines' 
  | 'machine-detail'
  | 'yield-calendar'
  | 'financial' 
  | 'comparison'
  | 'esg' 
  | 'maintenance' 
  | 'alerts' 
  | 'settings'
  | 'report-builder'
  | 'telemetry'
  | 'knowledge-base';

export interface StationDetails {
  pumps: number;
  tanks91: number;
  tanks95: number;
  trucksPerDay: number;
  dailySalesLiters: number;
}

export interface VRU {
  id: string;
  name: string;
  owner: 'Sasco' | 'GECO' | 'Bapco' | 'MasarZero'; // Added Owner Field
  status: 'Running' | 'Stopped' | 'Maintenance' | 'Pending_Install' | 'Offline';
  country: string;
  city: string; // Specific focus on KSA cities
  region: string;
  address?: string; // Exact address string
  latitude: number;
  longitude: number;
  installDate?: string;
  recoveryRateLitersPerHour: number; // Flow rate
  recoveryRatePercentage: number; // Efficiency: 0.1% - 1.0%
  totalRecoveredAmount: number; // Total Volume in Liters
  co2ReducedKg: number;
  pressurePSI: number;
  temperatureC: number;
  revenueSAR: number;
  lastMaintenanceDate: string;
  nextMaintenanceDate: string;
  healthScore: number; // 0-100
  alerts: Alert[];
  // New Fields from Screenshot requirements
  stationDetails?: StationDetails;
  uptimePercentage?: number;
  tankFillLevelPercentage?: number;
}

// --- NEW ROBUST DATA STRUCTURES ---

export interface HourlyRecord {
    timestamp: string;      // ISO String
    recoveredLiters: number;
    temperatureC: number;
    pressurePSI: number;
    efficiency: number;
}

export interface DailyRecord {
    date: string;           // YYYY-MM-DD
    recoveredLiters: number;
    avgTemperatureC: number;
    salesAmount: number;    // Calculated based on station settings
    efficiency: number;
    outageReason?: string;
}

export interface MonthlyRecord {
    month: string;          // YYYY-MM
    recoveredLiters: number;
    salesAmount: number;
    avgTemperatureC: number;
}

export interface StationConfig {
    salesPricePerLiter: number;
    currency: string;
    targetDailyYield: number;
    // New Financial Variables
    vatRate: number; // e.g. 0.15
    electricityConsumptionKwPerL: number; // e.g. 0.0952
    electricityCostPerKw: number; // e.g. 0.32
}

export interface MachineExtendedData {
    id: string;
    config: StationConfig;
    hourly: HourlyRecord[];  // Last 48-72 hours
    daily: DailyRecord[];    // Last 365 days
    monthly: MonthlyRecord[];// Last 24 months
}

// ----------------------------------

export interface Alert {
  id: string;
  severity: 'Critical' | 'Warning' | 'Info';
  message: string;
  timestamp: string;
  acknowledged: boolean;
  machineId?: string; // Enhanced for global alert view
  machineName?: string;
  evidence?: string; // Base64 string of uploaded image
}

export interface AuditLogEntry {
    id: string;
    timestamp: string;
    user: string;
    action: string;
    details: string;
    category: 'Security' | 'Config' | 'System' | 'User';
}

export interface FinancialMetric {
  date: string;
  revenue: number;
  expenses: number;
  profit: number;
  recoveredLiters: number; // Added for accurate volume tracking
}

export interface MaintenanceTask {
  id: string;
  vruId: string;
  description: string;
  status: 'Open' | 'In_Progress' | 'Completed';
  priority: 'High' | 'Medium' | 'Low';
  assignedTo: string;
  dueDate: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  minThreshold: number;
  category: string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
}

export interface KnowledgeDoc {
  id: string;
  title: string;
  category: string;
  type: 'PDF' | 'Video' | 'Text';
  size: string;
  lastUpdated: string;
}

export interface ClientBranding {
    name: string;
    logoUrl: string;
    primaryColor: string; // Hex code
}

export interface AppState {
  currentView: ViewState;
  selectedMachineId?: string;
  isSidebarOpen: boolean;
  language: 'en' | 'ar' | 'zh' | 'ko';
  currency: 'SAR' | 'USD' | 'CNY' | 'BHD' | 'KRW';
  theme: 'dark' | 'light' | 'high-contrast';
  notifications: Alert[];
  auditLog: AuditLogEntry[];
  user: {
    name: string;
    role: 'Admin' | 'Operator' | 'Viewer' | 'Site Manager' | 'Super Admin';
    avatar: string;
  };
  client: ClientBranding; // Added Client Branding
  viewProps?: any; 
  showPendingUnits?: boolean;
  isKioskMode: boolean; 
  autoTheme: boolean;   
}