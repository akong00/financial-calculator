
export interface HistoricalDataPoint {
    year: number;
    sp500: number; // Annual Return (decimal)
    inflation: number; // Annual Rate (decimal)
    treasuryYield: number; // 10-Year Yield (decimal)
    bondReturn?: number; // Calculated Total Return (decimal)
}

export const HISTORICAL_DATA: HistoricalDataPoint[] = [
    { year: 1928, sp500: 0.3788, inflation: -0.0170, treasuryYield: 0.0345 },
    { year: 1929, sp500: -0.1191, inflation: 0.0000, treasuryYield: 0.0346 },
    { year: 1930, sp500: -0.2848, inflation: -0.0230, treasuryYield: 0.0331 },
    { year: 1931, sp500: -0.4707, inflation: -0.0900, treasuryYield: 0.0350 },
    { year: 1932, sp500: -0.1515, inflation: -0.0990, treasuryYield: 0.0351 },
    { year: 1933, sp500: 0.4659, inflation: -0.0510, treasuryYield: 0.0322 },
    { year: 1934, sp500: -0.0594, inflation: 0.0310, treasuryYield: 0.0297 },
    { year: 1935, sp500: 0.4137, inflation: 0.0220, treasuryYield: 0.0273 },
    { year: 1936, sp500: 0.2792, inflation: 0.0150, treasuryYield: 0.0266 },
    { year: 1937, sp500: -0.3859, inflation: 0.0360, treasuryYield: 0.0262 },
    { year: 1938, sp500: 0.2521, inflation: -0.0210, treasuryYield: 0.0247 },
    { year: 1939, sp500: -0.0545, inflation: -0.0140, treasuryYield: 0.0229 },
    { year: 1940, sp500: -0.1529, inflation: 0.0070, treasuryYield: 0.0209 },
    { year: 1941, sp500: -0.1786, inflation: 0.0500, treasuryYield: 0.0218 },
    { year: 1942, sp500: 0.1243, inflation: 0.1090, treasuryYield: 0.0246 },
    { year: 1943, sp500: 0.1945, inflation: 0.0900, treasuryYield: 0.0247 },
    { year: 1944, sp500: 0.1380, inflation: 0.0230, treasuryYield: 0.0243 },
    { year: 1945, sp500: 0.3072, inflation: 0.0220, treasuryYield: 0.0229 },
    { year: 1946, sp500: -0.1187, inflation: 0.1810, treasuryYield: 0.0221 },
    { year: 1947, sp500: 0.0000, inflation: 0.0880, treasuryYield: 0.0234 },
    { year: 1948, sp500: -0.0065, inflation: 0.0300, treasuryYield: 0.0238 },
    { year: 1949, sp500: 0.1026, inflation: -0.0210, treasuryYield: 0.0231 },
    { year: 1950, sp500: 0.2178, inflation: 0.0590, treasuryYield: 0.0243 },
    { year: 1951, sp500: 0.1646, inflation: 0.0600, treasuryYield: 0.0262 },
    { year: 1952, sp500: 0.1178, inflation: 0.0080, treasuryYield: 0.0275 },
    { year: 1953, sp500: -0.0662, inflation: 0.0070, treasuryYield: 0.0284 },
    { year: 1954, sp500: 0.4502, inflation: -0.0070, treasuryYield: 0.0240 },
    { year: 1955, sp500: 0.2640, inflation: 0.0040, treasuryYield: 0.0282 },
    { year: 1956, sp500: 0.0262, inflation: 0.0300, treasuryYield: 0.0318 },
    { year: 1957, sp500: -0.1431, inflation: 0.0290, treasuryYield: 0.0365 },
    { year: 1958, sp500: 0.3806, inflation: 0.0180, treasuryYield: 0.0332 },
    { year: 1959, sp500: 0.0848, inflation: 0.0170, treasuryYield: 0.0433 },
    { year: 1960, sp500: -0.0297, inflation: 0.0140, treasuryYield: 0.0412 },
    { year: 1961, sp500: 0.2313, inflation: 0.0070, treasuryYield: 0.0388 },
    { year: 1962, sp500: -0.1181, inflation: 0.0130, treasuryYield: 0.0395 },
    { year: 1963, sp500: 0.1889, inflation: 0.0160, treasuryYield: 0.0400 },
    { year: 1964, sp500: 0.1297, inflation: 0.0100, treasuryYield: 0.0419 },
    { year: 1965, sp500: 0.0906, inflation: 0.0190, treasuryYield: 0.0428 },
    { year: 1966, sp500: -0.1309, inflation: 0.0350, treasuryYield: 0.0492 },
    { year: 1967, sp500: 0.2009, inflation: 0.0300, treasuryYield: 0.0507 },
    { year: 1968, sp500: 0.0766, inflation: 0.0470, treasuryYield: 0.0565 },
    { year: 1969, sp500: -0.1136, inflation: 0.0620, treasuryYield: 0.0667 },
    { year: 1970, sp500: 0.0010, inflation: 0.0560, treasuryYield: 0.0735 },
    { year: 1971, sp500: 0.1079, inflation: 0.0330, treasuryYield: 0.0616 },
    { year: 1972, sp500: 0.1563, inflation: 0.0340, treasuryYield: 0.0621 },
    { year: 1973, sp500: -0.1737, inflation: 0.0870, treasuryYield: 0.0684 },
    { year: 1974, sp500: -0.2972, inflation: 0.1230, treasuryYield: 0.0756 },
    { year: 1975, sp500: 0.3155, inflation: 0.0690, treasuryYield: 0.0799 },
    { year: 1976, sp500: 0.1915, inflation: 0.0490, treasuryYield: 0.0761 },
    { year: 1977, sp500: -0.1150, inflation: 0.0670, treasuryYield: 0.0742 },
    { year: 1978, sp500: 0.0106, inflation: 0.0900, treasuryYield: 0.0841 },
    { year: 1979, sp500: 0.1231, inflation: 0.1330, treasuryYield: 0.0944 },
    { year: 1980, sp500: 0.2577, inflation: 0.1250, treasuryYield: 0.1146 },
    { year: 1981, sp500: -0.0973, inflation: 0.0890, treasuryYield: 0.1391 },
    { year: 1982, sp500: 0.1476, inflation: 0.0380, treasuryYield: 0.1300 },
    { year: 1983, sp500: 0.1727, inflation: 0.0380, treasuryYield: 0.1111 },
    { year: 1984, sp500: 0.0140, inflation: 0.0390, treasuryYield: 0.1244 },
    { year: 1985, sp500: 0.2633, inflation: 0.0380, treasuryYield: 0.1062 },
    { year: 1986, sp500: 0.1462, inflation: 0.0110, treasuryYield: 0.0768 },
    { year: 1987, sp500: 0.0203, inflation: 0.0440, treasuryYield: 0.0838 },
    { year: 1988, sp500: 0.1240, inflation: 0.0440, treasuryYield: 0.0885 },
    { year: 1989, sp500: 0.2725, inflation: 0.0460, treasuryYield: 0.0850 },
    { year: 1990, sp500: -0.0656, inflation: 0.0610, treasuryYield: 0.0855 },
    { year: 1991, sp500: 0.2631, inflation: 0.0310, treasuryYield: 0.0786 },
    { year: 1992, sp500: 0.0446, inflation: 0.0290, treasuryYield: 0.0701 },
    { year: 1993, sp500: 0.0706, inflation: 0.0270, treasuryYield: 0.0587 },
    { year: 1994, sp500: -0.0154, inflation: 0.0270, treasuryYield: 0.0708 },
    { year: 1995, sp500: 0.3411, inflation: 0.0250, treasuryYield: 0.0658 },
    { year: 1996, sp500: 0.2026, inflation: 0.0330, treasuryYield: 0.0644 },
    { year: 1997, sp500: 0.3101, inflation: 0.0170, treasuryYield: 0.0635 },
    { year: 1998, sp500: 0.2667, inflation: 0.0160, treasuryYield: 0.0526 },
    { year: 1999, sp500: 0.1953, inflation: 0.0270, treasuryYield: 0.0564 },
    { year: 2000, sp500: -0.1014, inflation: 0.0340, treasuryYield: 0.0603 },
    { year: 2001, sp500: -0.1304, inflation: 0.0160, treasuryYield: 0.0502 },
    { year: 2002, sp500: -0.2337, inflation: 0.0240, treasuryYield: 0.0461 },
    { year: 2003, sp500: 0.2638, inflation: 0.0190, treasuryYield: 0.0401 },
    { year: 2004, sp500: 0.0899, inflation: 0.0330, treasuryYield: 0.0427 },
    { year: 2005, sp500: 0.0300, inflation: 0.0340, treasuryYield: 0.0429 },
    { year: 2006, sp500: 0.1362, inflation: 0.0250, treasuryYield: 0.0479 },
    { year: 2007, sp500: 0.0353, inflation: 0.0410, treasuryYield: 0.0463 },
    { year: 2008, sp500: -0.3849, inflation: 0.0010, treasuryYield: 0.0367 },
    { year: 2009, sp500: 0.2345, inflation: 0.0270, treasuryYield: 0.0326 },
    { year: 2010, sp500: 0.1278, inflation: 0.0150, treasuryYield: 0.0321 },
    { year: 2011, sp500: 0.0000, inflation: 0.0300, treasuryYield: 0.0279 },
    { year: 2012, sp500: 0.1341, inflation: 0.0170, treasuryYield: 0.0180 },
    { year: 2013, sp500: 0.2960, inflation: 0.0150, treasuryYield: 0.0235 },
    { year: 2014, sp500: 0.1139, inflation: 0.0080, treasuryYield: 0.0254 },
    { year: 2015, sp500: -0.0073, inflation: 0.0073, treasuryYield: 0.0213 },
    { year: 2016, sp500: 0.0954, inflation: 0.0207, treasuryYield: 0.0184 },
    { year: 2017, sp500: 0.1942, inflation: 0.0211, treasuryYield: 0.0233 },
    { year: 2018, sp500: -0.0624, inflation: 0.0191, treasuryYield: 0.0291 },
    { year: 2019, sp500: 0.2888, inflation: 0.0229, treasuryYield: 0.0214 },
    { year: 2020, sp500: 0.1626, inflation: 0.0136, treasuryYield: 0.0089 },
    { year: 2021, sp500: 0.2689, inflation: 0.0704, treasuryYield: 0.0144 },
    { year: 2022, sp500: -0.1944, inflation: 0.0645, treasuryYield: 0.0295 },
    { year: 2023, sp500: 0.2423, inflation: 0.0335, treasuryYield: 0.0396 },
    { year: 2024, sp500: 0.2300, inflation: 0.0295, treasuryYield: 0.0400 },
    { year: 2025, sp500: 0.1639, inflation: 0.0270, treasuryYield: 0.0410 },
];

export function getHistoricalData() {
    // Fill in bond returns
    // Approximation: Return ~ Yield_prev - Duration * (Yield_curr - Yield_prev)
    // Using Duration = 9 as a rough average for 10Y Treasuries
    const D = 8.5;

    return HISTORICAL_DATA.map((d, i, arr) => {
        if (d.bondReturn !== undefined) return d; // already set

        // For first year, assume yield is return (no price change known from prev)
        // Or if we have data, use formula.
        // We have yield from 1928, so we can calc 1929 return.

        let bondRet = d.treasuryYield; // Fallback

        if (i > 0) {
            const prevYield = arr[i - 1].treasuryYield;
            const currYield = d.treasuryYield;
            // Total Return = Yield_income + Price_change
            // Price_change approx = -Duration * (Delta_yield)
            // But yield applies to the *purchase* price?
            // Simpler: Return for Year T is roughly Coupon(T-1) + PriceChange(T)
            // Coupon(T-1) ~ PrevYield (assuming buying at par prev year)
            // PriceChange ~ -D * (CurrYield - PrevYield)
            // So Ret = PrevYield - D * (CurrYield - PrevYield)

            bondRet = prevYield - (D * (currYield - prevYield));
        }

        return {
            ...d,
            bondReturn: bondRet
        }
    });
}
