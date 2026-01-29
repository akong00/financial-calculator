
import { FilingStatus } from './taxes';

export const FULL_RETIREMENT_AGE = 67; // Simplified for those born 1960+

export interface SocialSecurityInput {
    pia: number; // Primary Insurance Amount (Monthly benefit at FRA)
    claimingAge: number; // Age user intends to claim start
    currentAge: number;
    birthYear: number;
}

export interface SocialSecurityResult {
    monthlyBenefit: number;
    annualBenefit: number;
    startYear: number;
}

/**
 * Calculates the monthly benefit based on claiming age relative to FRA (67).
 */
export function calculateSocialSecurityBenefit(input: SocialSecurityInput): SocialSecurityResult {
    const { pia, claimingAge, birthYear } = input;

    // Reduction factors:
    // First 36 months early: 5/9 of 1% per month (approx 0.555%)
    // Additional months early: 5/12 of 1% per month (approx 0.416%)
    // Delayed credits: 8% per year (2/3 of 1% per month) until age 70.

    const monthsDifference = (claimingAge - FULL_RETIREMENT_AGE) * 12;

    let adjustmentFactor = 1.0;

    if (monthsDifference < 0) { // Early claiming
        const earlyMonths = Math.abs(monthsDifference);
        if (earlyMonths <= 36) {
            adjustmentFactor -= earlyMonths * (5 / 9 / 100);
        } else {
            adjustmentFactor -= (36 * (5 / 9 / 100)) + ((earlyMonths - 36) * (5 / 12 / 100));
        }
    } else if (monthsDifference > 0) { // Delayed claiming
        // Max delay credit is until age 70
        const creditableMonths = Math.min(monthsDifference, (70 - FULL_RETIREMENT_AGE) * 12);
        adjustmentFactor += creditableMonths * (8 / 12 / 100);
    }

    const monthlyBenefit = pia * adjustmentFactor;

    return {
        monthlyBenefit,
        annualBenefit: monthlyBenefit * 12,
        startYear: birthYear + claimingAge
    };
}

/**
 * Calculates the TAXABLE portion of Social Security benefits.
 * Based on "Provisional Income" = MAGI + 50% of SS Benefit.
 */
export function calculateTaxableSocialSecurity(
    ssAnnualBenefit: number,
    otherIncome: number, // MAGI excluding SS
    filingStatus: FilingStatus
): number {
    if (ssAnnualBenefit === 0) return 0;

    const provisionalIncome = otherIncome + (0.5 * ssAnnualBenefit);

    let base1 = 0;
    let base2 = 0;

    if (filingStatus === 'married_joint') {
        base1 = 32000;
        base2 = 44000;
    } else if (filingStatus === 'single' || filingStatus === 'head_household') {
        base1 = 25000;
        base2 = 34000;
    } else { // married_separate
        // If you lived with spouse at any time, base is 0. Assuming typical case = 0.
        base1 = 0;
        base2 = 0;
    }

    let taxableAmount = 0;

    if (provisionalIncome > base2) {
        // 85% of amount > base2 + 50% of amount between base1 and base2
        // BUT max taxable is 85% of total benefit
        taxableAmount = (0.85 * (provisionalIncome - base2)) + (0.5 * (base2 - base1));
    } else if (provisionalIncome > base1) {
        taxableAmount = 0.5 * (provisionalIncome - base1);
    } else {
        return 0;
    }

    // Taxable portion cannot exceed 85% of the total benefit
    return Math.min(taxableAmount, 0.85 * ssAnnualBenefit);
}
