
export type FilingStatus = 'single' | 'married_joint' | 'married_separate' | 'head_household';

export interface TaxConstants {
    standardDeduction: Record<FilingStatus, number>;
    brackets: Record<FilingStatus, { limit: number; rate: number }[]>;
    longTermCapGains: Record<FilingStatus, { limit: number; rate: number }[]>;
    niitThreshold: Record<FilingStatus, number>;
    socialSecurity: {
        wageBase: number;
        rate: number;
    };
    medicare: {
        rate: number;
        additionalRate: number;
        basePremiumB: number;
        additionalThreshold: Record<FilingStatus, number>;
    };
    irmaa: {
        partB: { minIncome: number; surcharge: number }[];
        partD: { minIncome: number; surcharge: number }[]; // Monthly surcharge
    };
}

// 2025 Tax Data
export const TAX_DATA_2025: TaxConstants = {
    standardDeduction: {
        single: 15000,
        married_joint: 30000,
        married_separate: 15000,
        head_household: 22500,
    },
    brackets: {
        single: [
            { limit: 11925, rate: 0.10 },
            { limit: 48475, rate: 0.12 },
            { limit: 103350, rate: 0.22 },
            { limit: 197300, rate: 0.24 },
            { limit: 250525, rate: 0.32 },
            { limit: 626350, rate: 0.35 },
            { limit: Infinity, rate: 0.37 },
        ],
        married_joint: [
            { limit: 23850, rate: 0.10 },
            { limit: 96950, rate: 0.12 },
            { limit: 206700, rate: 0.22 },
            { limit: 394600, rate: 0.24 },
            { limit: 501050, rate: 0.32 },
            { limit: 751600, rate: 0.35 },
            { limit: Infinity, rate: 0.37 },
        ],
        married_separate: [
            { limit: 11925, rate: 0.10 },
            { limit: 48475, rate: 0.12 },
            { limit: 103350, rate: 0.22 },
            { limit: 197300, rate: 0.24 },
            { limit: 250525, rate: 0.32 },
            { limit: 375800, rate: 0.35 },
            { limit: Infinity, rate: 0.37 },
        ],
        head_household: [
            { limit: 17000, rate: 0.10 },
            { limit: 64850, rate: 0.12 },
            { limit: 103350, rate: 0.22 },
            { limit: 197300, rate: 0.24 },
            { limit: 250525, rate: 0.32 },
            { limit: 626350, rate: 0.35 },
            { limit: Infinity, rate: 0.37 },
        ],
    },
    longTermCapGains: {
        single: [
            { limit: 48350, rate: 0.0 },
            { limit: 533400, rate: 0.15 },
            { limit: Infinity, rate: 0.20 },
        ],
        married_joint: [
            { limit: 96700, rate: 0.0 },
            { limit: 600050, rate: 0.15 },
            { limit: Infinity, rate: 0.20 },
        ],
        married_separate: [
            { limit: 48350, rate: 0.0 },
            { limit: 300025, rate: 0.15 },
            { limit: Infinity, rate: 0.20 },
        ],
        head_household: [
            { limit: 64750, rate: 0.0 },
            { limit: 566700, rate: 0.15 },
            { limit: Infinity, rate: 0.20 },
        ],
    },
    niitThreshold: {
        single: 200000,
        married_joint: 250000,
        married_separate: 125000,
        head_household: 200000,
    },
    socialSecurity: {
        wageBase: 176100,
        rate: 0.062,
    },
    medicare: {
        rate: 0.0145,
        additionalRate: 0.009,
        basePremiumB: 185.00,
        additionalThreshold: {
            single: 200000,
            married_joint: 250000,
            married_separate: 125000,
            head_household: 200000,
        },
    },
    irmaa: {
        partB: [
            { minIncome: 106000, surcharge: 0 },
            { minIncome: 133000, surcharge: 70.80 },
            { minIncome: 161000, surcharge: 177.00 },
            { minIncome: 193000, surcharge: 283.20 },
            { minIncome: 500000, surcharge: 389.40 },
            { minIncome: Infinity, surcharge: 424.80 },
        ],
        partD: [
            { minIncome: 106000, surcharge: 0 },
            { minIncome: 133000, surcharge: 13.70 },
            { minIncome: 161000, surcharge: 35.30 },
            { minIncome: 193000, surcharge: 56.80 },
            { minIncome: 500000, surcharge: 78.40 },
            { minIncome: Infinity, surcharge: 85.80 },
        ]
    }
};

// State income tax rates (flat/top marginal rates for 2025)
// Using simplified flat rates for retirement income estimation
export const STATE_TAX_RATES: Record<string, { name: string; rate: number }> = {
    'none': { name: 'No State Tax', rate: 0 },
    'AK': { name: 'Alaska', rate: 0 },
    'FL': { name: 'Florida', rate: 0 },
    'NV': { name: 'Nevada', rate: 0 },
    'SD': { name: 'South Dakota', rate: 0 },
    'TN': { name: 'Tennessee', rate: 0 },
    'TX': { name: 'Texas', rate: 0 },
    'WA': { name: 'Washington', rate: 0 },
    'WY': { name: 'Wyoming', rate: 0 },
    'NH': { name: 'New Hampshire', rate: 0 },
    'AL': { name: 'Alabama', rate: 0.05 },
    'AZ': { name: 'Arizona', rate: 0.025 },
    'AR': { name: 'Arkansas', rate: 0.039 },
    'CA': { name: 'California', rate: 0.133 },
    'CO': { name: 'Colorado', rate: 0.044 },
    'CT': { name: 'Connecticut', rate: 0.0699 },
    'DE': { name: 'Delaware', rate: 0.066 },
    'GA': { name: 'Georgia', rate: 0.0549 },
    'HI': { name: 'Hawaii', rate: 0.11 },
    'ID': { name: 'Idaho', rate: 0.058 },
    'IL': { name: 'Illinois', rate: 0.0495 },
    'IN': { name: 'Indiana', rate: 0.03 },
    'IA': { name: 'Iowa', rate: 0.038 },
    'KS': { name: 'Kansas', rate: 0.057 },
    'KY': { name: 'Kentucky', rate: 0.04 },
    'LA': { name: 'Louisiana', rate: 0.03 },
    'ME': { name: 'Maine', rate: 0.0715 },
    'MD': { name: 'Maryland', rate: 0.0575 },
    'MA': { name: 'Massachusetts', rate: 0.09 },
    'MI': { name: 'Michigan', rate: 0.0425 },
    'MN': { name: 'Minnesota', rate: 0.0985 },
    'MS': { name: 'Mississippi', rate: 0.05 },
    'MO': { name: 'Missouri', rate: 0.048 },
    'MT': { name: 'Montana', rate: 0.059 },
    'NE': { name: 'Nebraska', rate: 0.0584 },
    'NJ': { name: 'New Jersey', rate: 0.1075 },
    'NM': { name: 'New Mexico', rate: 0.049 },
    'NY': { name: 'New York', rate: 0.109 },
    'NC': { name: 'North Carolina', rate: 0.045 },
    'ND': { name: 'North Dakota', rate: 0.0225 },
    'OH': { name: 'Ohio', rate: 0.0375 },
    'OK': { name: 'Oklahoma', rate: 0.0475 },
    'OR': { name: 'Oregon', rate: 0.099 },
    'PA': { name: 'Pennsylvania', rate: 0.0307 },
    'RI': { name: 'Rhode Island', rate: 0.0599 },
    'SC': { name: 'South Carolina', rate: 0.064 },
    'UT': { name: 'Utah', rate: 0.0465 },
    'VT': { name: 'Vermont', rate: 0.0875 },
    'VA': { name: 'Virginia', rate: 0.0575 },
    'WV': { name: 'West Virginia', rate: 0.0512 },
    'WI': { name: 'Wisconsin', rate: 0.0765 },
    'DC': { name: 'Washington D.C.', rate: 0.1075 },
};

export function calculateStateTax(agi: number, state: string): number {
    const stateData = STATE_TAX_RATES[state];
    if (!stateData) return 0;
    return Math.max(0, agi) * stateData.rate;
}

export interface TaxInput {
    wages: number;
    shortTermCapGains: number;
    longTermCapGains: number;
    qualifiedDividends: number;
    otherOrdinaryIncome: number; // Interest, Pensions, Traditional IRA withdrawal
    preTaxContributions: number;
    filingStatus: FilingStatus;
}

export interface TaxResult {
    federalTax: number;
    ficaTax: number;
    stateTax: number;
    totalTax: number;
    effectiveRate: number;
    marginalRate: number;
    incomeSummary: {
        agi: number;
        taxableIncome: number;
        ordinaryIncome: number;
        preferentialIncome: number;
    };
    details: {
        ordinaryTax: number;
        preferentialTax: number;
        niit: number;
        additionalMedicare: number;
    }
}

export function calculateFederalTax(input: TaxInput, yearData = TAX_DATA_2025): TaxResult {
    const {
        wages, shortTermCapGains, longTermCapGains, qualifiedDividends, otherOrdinaryIncome, preTaxContributions, filingStatus
    } = input;

    const totalOrdinaryIncome = Math.max(0, wages - preTaxContributions) + shortTermCapGains + otherOrdinaryIncome;
    const totalPreferentialIncome = longTermCapGains + qualifiedDividends;
    const agi = totalOrdinaryIncome + totalPreferentialIncome;

    const deduction = yearData.standardDeduction[filingStatus];
    const taxableIncome = Math.max(0, agi - deduction);

    // Stack income: Ordinary first, then Preferential
    const taxableOrdinary = Math.max(0, totalOrdinaryIncome - deduction);
    const deductionRemaining = Math.max(0, deduction - totalOrdinaryIncome);
    const taxablePreferential = Math.max(0, totalPreferentialIncome - deductionRemaining);

    // Calculate Ordinary Income Tax
    let ordinaryTax = 0;
    let currentBracketRate = 0;
    let previousLimit = 0;

    for (const bracket of yearData.brackets[filingStatus]) {
        if (taxableOrdinary <= previousLimit) break;

        const amountInBracket = Math.min(taxableOrdinary, bracket.limit) - previousLimit;
        ordinaryTax += amountInBracket * bracket.rate;
        currentBracketRate = bracket.rate;
        previousLimit = bracket.limit;
    }

    // Calculate Preferential Tax (LTCG / Qual Divs)
    let preferentialTax = 0;
    let capitalGainsStack = taxableOrdinary;
    let capGainRemaining = taxablePreferential;
    let previousCGLimit = 0;

    if (capGainRemaining > 0) {
        for (const bracket of yearData.longTermCapGains[filingStatus]) {
            const bracketStart = Math.max(previousCGLimit, capitalGainsStack);
            const bracketEnd = bracket.limit;

            if (bracketStart >= bracketEnd) {
                previousCGLimit = bracket.limit;
                continue;
            }

            const availableRoom = Math.max(0, bracketEnd - bracketStart);
            const taxAmount = Math.min(capGainRemaining, availableRoom);

            preferentialTax += taxAmount * bracket.rate;
            capGainRemaining -= taxAmount;
            capitalGainsStack += taxAmount;
            previousCGLimit = bracket.limit;

            if (capGainRemaining <= 0) break;
        }
    }

    // NIIT (Net Investment Income Tax)
    const nii = shortTermCapGains + longTermCapGains + qualifiedDividends + otherOrdinaryIncome;
    const niitBase = Math.min(nii, Math.max(0, agi - yearData.niitThreshold[filingStatus]));
    const niit = niitBase * 0.038;

    // FICA
    const ssTax = Math.min(wages, yearData.socialSecurity.wageBase) * yearData.socialSecurity.rate;
    let medicareTax = wages * yearData.medicare.rate;
    if (wages > yearData.medicare.additionalThreshold[filingStatus]) {
        medicareTax += (wages - yearData.medicare.additionalThreshold[filingStatus]) * yearData.medicare.additionalRate;
    }

    return {
        federalTax: ordinaryTax + preferentialTax,
        ficaTax: ssTax + medicareTax,
        stateTax: 0,
        totalTax: ordinaryTax + preferentialTax + niit + ssTax + medicareTax,
        effectiveRate: agi > 0 ? (ordinaryTax + preferentialTax + niit + ssTax + medicareTax) / agi : 0,
        marginalRate: currentBracketRate || 0,
        incomeSummary: {
            agi,
            taxableIncome, ordinaryIncome: totalOrdinaryIncome,
            preferentialIncome: totalPreferentialIncome
        },
        details: {
            ordinaryTax,
            preferentialTax,
            niit,
            additionalMedicare: wages > yearData.medicare.additionalThreshold[filingStatus] ? (wages - yearData.medicare.additionalThreshold[filingStatus]) * yearData.medicare.additionalRate : 0
        }
    };
}

export function calculateIRMAA(magi: number, filingStatus: FilingStatus, yearData = TAX_DATA_2025): number {
    const multiplier = filingStatus === 'married_joint' ? 2 : 1;
    let partBSurcharge = 0;
    let partDSurcharge = 0;

    // MAGI thresholds are doubled for joint filers except for the top tier
    for (const bracket of yearData.irmaa.partB) {
        let limit = bracket.minIncome * multiplier;
        if (filingStatus === 'married_joint' && bracket.minIncome === 500000) limit = 750000;

        if (magi > limit) {
            partBSurcharge = bracket.surcharge;
        }
    }

    for (const bracket of yearData.irmaa.partD) {
        let limit = bracket.minIncome * multiplier;
        if (filingStatus === 'married_joint' && bracket.minIncome === 500000) limit = 750000;

        if (magi > limit) {
            partDSurcharge = bracket.surcharge;
        }
    }

    return (partBSurcharge + partDSurcharge) * 12;
}

/**
 * Creates an inflation-adjusted copy of the tax constants.
 * Scales all dollar-denominated thresholds and surcharges by the given factor.
 */
export function scaleTaxConstants(data: TaxConstants, factor: number): TaxConstants {
    const scaleList = (list: { limit: number; rate: number }[]) =>
        list.map(b => ({ ...b, limit: b.limit === Infinity ? Infinity : b.limit * factor }));

    const scaleMap = (map: Record<FilingStatus, { limit: number; rate: number }[]>) => {
        const result: any = {};
        for (const k in map) {
            result[k] = scaleList(map[k as FilingStatus]);
        }
        return result;
    };

    const scaleRecord = (record: Record<FilingStatus, number>) => {
        const result: any = {};
        for (const k in record) {
            result[k] = record[k as FilingStatus] * factor;
        }
        return result;
    };

    return {
        ...data,
        standardDeduction: scaleRecord(data.standardDeduction),
        brackets: scaleMap(data.brackets),
        longTermCapGains: scaleMap(data.longTermCapGains),
        niitThreshold: scaleRecord(data.niitThreshold),
        socialSecurity: {
            ...data.socialSecurity,
            wageBase: data.socialSecurity.wageBase * factor,
        },
        medicare: {
            ...data.medicare,
            basePremiumB: data.medicare.basePremiumB * factor,
            additionalThreshold: scaleRecord(data.medicare.additionalThreshold),
        },
        irmaa: {
            partB: data.irmaa.partB.map(b => ({
                ...b,
                minIncome: b.minIncome === Infinity ? Infinity : b.minIncome * factor,
                surcharge: b.surcharge * factor
            })),
            partD: data.irmaa.partD.map(b => ({
                ...b,
                minIncome: b.minIncome === Infinity ? Infinity : b.minIncome * factor,
                surcharge: b.surcharge * factor
            }))
        }
    };
}

