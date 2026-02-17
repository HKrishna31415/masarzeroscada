
// Business Logic Constants
// Single Source of Truth for GA Release

export const ENV_METRICS = {
    CO2_KG_PER_LITER: 2.31,        // Standard combustion equivalent
    TREE_ABSORPTION_KG_YEAR: 20,   // Avg kg CO2 absorbed by mature tree/year
    CAR_EMISSION_KG_YEAR: 4600     // Avg kg CO2 emitted by car/year
};

export const FINANCIAL_DEFAULTS = {
    PRICE_PER_LITER_SAR: 2.18,     // Updated market rate
    VAT_RATE: 0.15,                // 15% VAT
    ELEC_COST_PER_KW: 0.32,        // Tier 2 Commercial Rate (SAR/kWh)
    KW_PER_LITER: 0.0952,          // Efficiency baseline
    CURRENCY: 'SAR'
};

export const UI_CONFIG = {
    ANIMATION_DURATION: 500,
    CHART_MAX_POINTS: 100,
    REFRESH_RATE_MS: 30000
};

export const THRESHOLDS = {
    EFFICIENCY_GOOD: 0.95,
    EFFICIENCY_WARN: 0.80,
    UPTIME_GOOD: 98.0
};
