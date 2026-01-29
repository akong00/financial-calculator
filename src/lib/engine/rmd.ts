
/**
 * RMD (Required Minimum Distribution) Logic
 * Uses Uniform Lifetime Table III (Ref: IRS Pub 590-B)
 */

export const RMD_START_AGE_1960_PLUS = 75;
export const RMD_START_AGE_PRE_1960 = 73;

// IRS Uniform Lifetime Table (for Unmarried Owners or Owners with Spouses Not >10 Years Younger)
// Age -> Distribution Period
const UNIFORM_LIFETIME_TABLE: Record<number, number> = {
    72: 27.4,
    73: 26.5,
    74: 25.5,
    75: 24.6,
    76: 23.7,
    77: 22.9,
    78: 22.0,
    79: 21.1,
    80: 20.2,
    81: 19.4,
    82: 18.5,
    83: 17.7,
    84: 16.8,
    85: 16.0,
    86: 15.2,
    87: 14.4,
    88: 13.7,
    89: 12.9,
    90: 12.2,
    91: 11.5,
    92: 10.8,
    93: 10.1,
    94: 9.5,
    95: 8.9,
    96: 8.4,
    97: 7.8,
    98: 7.3,
    99: 6.8,
    100: 6.4,
    101: 6.0,
    102: 5.6,
    103: 5.2,
    104: 4.9,
    105: 4.6,
    106: 4.3,
    107: 4.1,
    108: 3.9,
    109: 3.7,
    110: 3.5,
    111: 3.4,
    112: 3.3,
    113: 3.1,
    114: 3.0,
    115: 2.9, // 115 and older
};

export function getRmdStartAge(birthYear: number): number {
    return birthYear >= 1960 ? RMD_START_AGE_1960_PLUS : RMD_START_AGE_PRE_1960;
}

export function calculateRMD(
    age: number,
    preTaxBalance: number, // Balance at END of PRIOR year
    birthYear: number
): number {
    const startAge = getRmdStartAge(birthYear);

    if (age < startAge || preTaxBalance <= 0) {
        return 0;
    }

    // Use the table factor. If age > 115, use 2.9 (cap) or follow table logic (usually 2.0 at 120+)
    // For safety, clamp to max key or handle older.
    // The table actually goes up to 120+, but simplified here. 
    // Let's fallback to 2.0 for extremely old age to be safe.

    const factor = UNIFORM_LIFETIME_TABLE[age] ?? (age > 115 ? 2.0 : 0);

    if (factor === 0) return 0; // Should not happen given age check

    return preTaxBalance / factor;
}
