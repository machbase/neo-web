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

export enum E_UNIT_OUT_FORMAT {
    PERCENT = 'percent',
    TEMPERATURE = 'temperature',
    TIME = 'time',
    DURATION = 'duration',
    DURATION_H = 'duration_h',
    DURATION_D = 'duration_d',
    SHORT = 'short',
    SI = 'SI',
    IEC = 'IEC',
}

export interface UnitItem {
    id: string;
    label: string;
    suffix: string;
    sourceScale: number;
    outFormat: E_UNIT_OUT_FORMAT;
}
interface UnitType {
    id: string;
    label: string;
    items?: UnitItem[];
}

export const UNITS: UnitType[] = [
    {
        id: 'misc',
        label: 'Misc',
        items: [
            { id: 'short', label: 'short', suffix: '', sourceScale: 1, outFormat: E_UNIT_OUT_FORMAT.SHORT },
            { id: 'SI_short', label: 'SI short', suffix: '', sourceScale: 1, outFormat: E_UNIT_OUT_FORMAT.SI },
            { id: 'percent_0_1', label: 'Percent (0_1)', suffix: '%', sourceScale: 0.01, outFormat: E_UNIT_OUT_FORMAT.PERCENT },
            { id: 'percent_0_100', label: 'Percent (0_100)', suffix: '%', sourceScale: 1, outFormat: E_UNIT_OUT_FORMAT.PERCENT },
        ],
    },
    {
        id: 'temperature',
        label: 'Temperature',
        items: [
            { id: 'celsius', label: 'Celsius (°C)', suffix: '°C', sourceScale: 1, outFormat: E_UNIT_OUT_FORMAT.TEMPERATURE },
            { id: 'fahrenheit', label: 'Fahrenheit (°F)', suffix: '°F', sourceScale: 1, outFormat: E_UNIT_OUT_FORMAT.TEMPERATURE },
            { id: 'kelvin', label: 'Kelvin (K)', suffix: 'K', sourceScale: 1, outFormat: E_UNIT_OUT_FORMAT.TEMPERATURE },
        ],
    },
    {
        id: 'time',
        label: 'Time',
        items: [
            { id: 'ns', label: 'nanoseconds (ns)', suffix: '', sourceScale: 0.000000001, outFormat: E_UNIT_OUT_FORMAT.TIME },
            { id: 'μs', label: 'microseconds (μs)', suffix: '', sourceScale: 0.000001, outFormat: E_UNIT_OUT_FORMAT.TIME },
            { id: 'ms', label: 'milliseconds (ms)', suffix: '', sourceScale: 0.001, outFormat: E_UNIT_OUT_FORMAT.TIME },
            { id: 's', label: 'seconds (s)', suffix: '', sourceScale: 1, outFormat: E_UNIT_OUT_FORMAT.TIME },
            { id: 'duration_ms', label: 'duration (ms)', suffix: '', sourceScale: 0.001, outFormat: E_UNIT_OUT_FORMAT.DURATION },
            { id: 'duration_s', label: 'duration (s)', suffix: '', sourceScale: 1, outFormat: E_UNIT_OUT_FORMAT.DURATION },
            { id: 'duration_hh_mm_ss', label: 'duration (hh:mm:ss)', suffix: '', sourceScale: 1, outFormat: E_UNIT_OUT_FORMAT.DURATION_H },
            { id: 'duration_d_hh_mm_ss', label: 'duration (d hh:mm:ss)', suffix: '', sourceScale: 1, outFormat: E_UNIT_OUT_FORMAT.DURATION_D },
        ],
    },
    {
        id: 'data',
        label: 'Data',
        items: [
            { id: 'bytes_IEC', label: 'bytes (IEC)', suffix: 'B/s', sourceScale: 1, outFormat: E_UNIT_OUT_FORMAT.IEC },
            { id: 'bytes_SI', label: 'bytes (SI)', suffix: 'B/s', sourceScale: 1, outFormat: E_UNIT_OUT_FORMAT.SI },
            { id: 'bits_IEC', label: 'bits (IEC)', suffix: 'b/s', sourceScale: 1, outFormat: E_UNIT_OUT_FORMAT.IEC },
            { id: 'bits_SI', label: 'bits (SI)', suffix: 'b/s', sourceScale: 1, outFormat: E_UNIT_OUT_FORMAT.SI },
        ],
    },
    {
        id: 'data_rate',
        label: 'Data rate',
        items: [
            { id: 'packets_sec', label: 'packets/sec', suffix: 'p/s', sourceScale: 1, outFormat: E_UNIT_OUT_FORMAT.SI },
            { id: 'bytes_sec_IEC', label: 'bytes/sec (IEC)', suffix: 'B/s', sourceScale: 1, outFormat: E_UNIT_OUT_FORMAT.IEC },
            { id: 'bytes_sec_SI', label: 'bytes/sec (SI)', suffix: 'B/s', sourceScale: 1, outFormat: E_UNIT_OUT_FORMAT.SI },
            { id: 'bits_sec_IEC', label: 'bits/sec (IEC)', suffix: 'b/s', sourceScale: 1, outFormat: E_UNIT_OUT_FORMAT.IEC },
            { id: 'bits_sec_SI', label: 'bits/sec (SI)', suffix: 'b/s', sourceScale: 1, outFormat: E_UNIT_OUT_FORMAT.SI },
        ],
    },
];

// Find unit item by id from UNITS array
export const findUnitById = (id: string): UnitItem | undefined => {
    for (const unitGroup of UNITS) {
        if (unitGroup.items) {
            const foundUnit = unitGroup.items.find((item) => item.id === id);
            if (foundUnit) {
                return foundUnit;
            }
        }
    }
    return undefined;
};
