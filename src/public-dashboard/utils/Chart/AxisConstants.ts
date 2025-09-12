export type CHART_AXIS_UNITS = {
    [key: string]: number | string | undefined;
    name: string;
    key: string;
    title: string;
    unit: string;
    decimals: number | undefined;
    squared: number;
};

// {
//     [key: string]: number | string | undefined;
//     name: string;
//     key: string;
//     title: string;
//     unit: string;
//     decimals: number | undefined;
//     squared: number;
// }
export const ChartAxisUnits: CHART_AXIS_UNITS[] = [
    { name: 'value', key: 'value', title: '', unit: '', decimals: undefined, squared: 0 },
    // °C
    { name: 'temperature', key: 'temperature', title: '', unit: '', decimals: 0, squared: 0 },
    // %H
    { name: 'humidity', key: 'humidity', title: '', unit: '', decimals: 0, squared: 0 },
    { name: 'percent', key: 'percent', title: '', unit: '%', decimals: undefined, squared: -2 },
    // International Electrotechnical Commission
    { name: 'byte', key: 'byte (IEC)', title: '', unit: '', decimals: undefined, squared: 0 },
    // International System Units
    { name: 'byte', key: 'byte (SI)', title: '', unit: '', decimals: undefined, squared: 0 },

    { name: 'milli', key: 'milli (m)', title: '', unit: 'm', decimals: undefined, squared: -3 },
    { name: 'micro', key: 'micro (μ)', title: '', unit: 'μ', decimals: undefined, squared: -6 },
    { name: 'nano', key: 'nano (n)', title: '', unit: 'n', decimals: undefined, squared: -9 },
    { name: 'pico', key: 'pico (p)', title: '', unit: 'p', decimals: undefined, squared: -12 },
    // { name: 'femto', key: 'femto (f)', unit: 'f', decimals: undefined, squared: -15 },
    // { name: 'atto', key: 'atto (a)', unit: 'a', decimals: undefined, squared: -18 },
    // { name: 'zepto', key: 'zepto (z)', unit: 'z', decimals: undefined, squared: -21 },
    // { name: 'yocto', key: 'yocto (y)', unit: 'y', decimals: undefined, squared: -24 },

    { name: 'kilo', key: 'kilo (K)', title: '', unit: 'K', decimals: undefined, squared: 3 },
    { name: 'mega', key: 'mega (M)', title: '', unit: 'M', decimals: undefined, squared: 6 },
    { name: 'giga', key: 'giga (G)', title: '', unit: 'G', decimals: undefined, squared: 9 },
    { name: 'tera', key: 'tera (T)', title: '', unit: 'T', decimals: undefined, squared: 12 },
    // { name: 'peta', key: 'peta (P)', unit: 'P', decimals: undefined, squared: 15 },
    // { name: 'exa', key: 'exa (E)', unit: 'E', decimals: undefined, squared: 18 },
    // { name: 'zetta', key: 'zetta (Z)', unit: 'Z', decimals: undefined, squared: 21 },
    // { name: 'yotta', key: 'yotta (Y)', unit: 'Y', decimals: undefined, squared: 24 },
];
