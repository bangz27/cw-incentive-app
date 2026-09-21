/**
 * CW Incentive — 2W Progressive Tier Configuration
 *
 * This file is intentionally separate from config.js. config.js remains the
 * existing 4W Size S/L configuration and is not changed by Phase 1.
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.CW_TWO_W_TIERS = factory();
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    return {
        'Zone 1': [
            { min: 0, max: 4, rate: 0 },
            { min: 5, max: 14, rate: 8 },
            { min: 15, max: 49, rate: 9 },
            { min: 50, max: 64, rate: 11 },
            { min: 65, max: Infinity, rate: 12 }
        ],
        'Zone 2': [
            { min: 0, max: 9, rate: 0 },
            { min: 10, max: 59, rate: 8 },
            { min: 60, max: 89, rate: 9 },
            { min: 90, max: Infinity, rate: 11 }
        ],
        'Zone 3': [
            { min: 0, max: 14, rate: 0 },
            { min: 15, max: 54, rate: 7 },
            { min: 55, max: 94, rate: 8 },
            { min: 95, max: Infinity, rate: 10 }
        ],
        'Zone 4': [
            { min: 0, max: 19, rate: 0 },
            { min: 20, max: 39, rate: 6 },
            { min: 40, max: 79, rate: 7 },
            { min: 80, max: 99, rate: 8 },
            { min: 100, max: Infinity, rate: 9 }
        ],
        'Zone 5': [
            { min: 0, max: 29, rate: 0 },
            { min: 30, max: 49, rate: 6 },
            { min: 50, max: 89, rate: 7 },
            { min: 90, max: 109, rate: 8 },
            { min: 110, max: Infinity, rate: 9 }
        ],
        'Zone 6': [
            { min: 0, max: 29, rate: 0 },
            { min: 30, max: 59, rate: 6 },
            { min: 60, max: 99, rate: 7 },
            { min: 100, max: Infinity, rate: 8 }
        ],
        'Zone 7': [
            { min: 0, max: 49, rate: 0 },
            { min: 50, max: 69, rate: 6 },
            { min: 70, max: 129, rate: 7 },
            { min: 130, max: Infinity, rate: 8 }
        ],
        'Zone 8': [
            { min: 0, max: 59, rate: 0 },
            { min: 60, max: 79, rate: 6 },
            { min: 80, max: 139, rate: 7 },
            { min: 140, max: Infinity, rate: 8 }
        ],
        'Zone 9': [
            { min: 0, max: 69, rate: 0 },
            { min: 70, max: 89, rate: 6 },
            { min: 90, max: 179, rate: 7 },
            { min: 180, max: Infinity, rate: 8 }
        ],
        'Zone 10': [
            { min: 0, max: 69, rate: 0 },
            { min: 70, max: 89, rate: 5 },
            { min: 90, max: 159, rate: 6 },
            { min: 160, max: Infinity, rate: 7 }
        ],
        'Zone 11': [
            { min: 0, max: 69, rate: 0 },
            { min: 70, max: 149, rate: 5 },
            { min: 150, max: 209, rate: 6 },
            { min: 210, max: Infinity, rate: 7 }
        ],
        'Zone 12': [
            { min: 0, max: 69, rate: 0 },
            { min: 70, max: 119, rate: 4 },
            { min: 120, max: 159, rate: 5 },
            { min: 160, max: Infinity, rate: 6 }
        ],
        'Zone 13': [
            { min: 0, max: 69, rate: 0 },
            { min: 70, max: 169, rate: 4 },
            { min: 170, max: 209, rate: 5 },
            { min: 210, max: Infinity, rate: 6 }
        ],
        'Zone 14': [
            { min: 0, max: 69, rate: 0 },
            { min: 70, max: 109, rate: 3 },
            { min: 110, max: 179, rate: 4 },
            { min: 180, max: Infinity, rate: 5 }
        ],
        'Zone 15': [
            { min: 0, max: 69, rate: 0 },
            { min: 70, max: 149, rate: 3 },
            { min: 150, max: 189, rate: 4 },
            { min: 190, max: Infinity, rate: 5 }
        ],
        'Zone 16': [
            { min: 0, max: 69, rate: 0 },
            { min: 70, max: 189, rate: 3 },
            { min: 190, max: 239, rate: 4 },
            { min: 240, max: Infinity, rate: 5 }
        ]
    };
});
