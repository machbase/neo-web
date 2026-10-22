// Chart Formatters Index

import { E_UNIT_OUT_FORMAT, UnitItem } from '../AxisConstants';
import { generateDurationFormatterFunction, generateScaleFormatterFunction, generateStringFormatterFunction, generateTimeFormatterFunction } from './scaleFormatter';
import { generateTooltipAxisFunction, generateTooltipItemFunction } from './tooltipFormatter';

/** The most digits Number.prototype.toFixed() accepts. */
const TO_FIXED_MAX_DIGITS = 100;

/**
 * `.toFixed(n)` as source for an older (< 1.0.1) panel's axis label, or '' to leave the value as it is.
 * Those labels set no rounding for 0 or an empty value; a negative or non-numeric one used to reach
 * toFixed() and throw, and so did anything past 100 — now skipped and capped like the current
 * formatters (#1563).
 */
export const legacyToFixedSource = (aDecimals: unknown): string => {
    if (!aDecimals) return '';
    const sDigits = Number(aDecimals);
    if (!Number.isFinite(sDigits) || sDigits < 0) return '';
    return `.toFixed(${Math.min(sDigits, TO_FIXED_MAX_DIGITS)})`;
};

// Central export point for all formatter utilities
// export { generateScaleFormatterFunction, generateTimeFormatterFunction, generateDurationFormatterFunction, generateStringFormatterFunction } from './scaleFormatter';

export const unitFormatter = (aUnit: UnitItem, aDecimals: any, aType: 'TICK' | 'TOOLTIP' = 'TICK', opt?: any) => {
    let sFormatter: any = { formatter: '' };
    const sIsNumber = Number.isFinite(parseInt(aDecimals));
    // toFixed() throws past 100 digits, and the generated formatter calls it on every label and tooltip,
    // so a saved Decimals of 101 left the panel without either (#1561). Larger values are capped there;
    // anything else reaches the formatter as before.
    const decimalsValue = sIsNumber ? (Number(aDecimals) > TO_FIXED_MAX_DIGITS ? TO_FIXED_MAX_DIGITS : aDecimals) : undefined;

    switch (aUnit?.outFormat) {
        case E_UNIT_OUT_FORMAT.SI:
        case E_UNIT_OUT_FORMAT.IEC:
        case E_UNIT_OUT_FORMAT.SHORT: {
            sFormatter.formatter = generateScaleFormatterFunction(aUnit?.outFormat, aUnit?.suffix, decimalsValue);
            break;
        }
        case E_UNIT_OUT_FORMAT.TIME: {
            sFormatter.formatter = generateTimeFormatterFunction(aUnit?.sourceScale || 1, aUnit?.suffix || '', decimalsValue);
            break;
        }
        case E_UNIT_OUT_FORMAT.DURATION: {
            const sourceScaleToMs = (aUnit?.sourceScale || 1) * 1000;
            sFormatter.formatter = generateDurationFormatterFunction('duration', decimalsValue, sourceScaleToMs);
            break;
        }
        case E_UNIT_OUT_FORMAT.DURATION_D:
        case E_UNIT_OUT_FORMAT.DURATION_H: {
            const sourceScaleToMs = (aUnit?.sourceScale || 1) * 1000;
            sFormatter.formatter = generateDurationFormatterFunction(aUnit?.outFormat, decimalsValue, sourceScaleToMs);
            break;
        }
        case E_UNIT_OUT_FORMAT.PERCENT:
        case E_UNIT_OUT_FORMAT.TEMPERATURE:
        default: {
            sFormatter.formatter = generateStringFormatterFunction(aUnit?.sourceScale ?? 1, aUnit?.suffix ?? '', decimalsValue);
            break;
        }
    }

    // Handle tooltip generation with formatter
    if (aType === 'TOOLTIP') {
        if (opt?.type?.toUpperCase() === 'ITEM') {
            sFormatter = generateTooltipItemFunction(opt.opt, opt.panelType, sFormatter.formatter);
        }
        if (opt?.type?.toUpperCase() === 'AXIS') {
            sFormatter = generateTooltipAxisFunction(opt.opt, opt.panelType, sFormatter.formatter, opt.aliasList, opt.enabledSeriesMeta);
        }
    }
    return sFormatter;
};
