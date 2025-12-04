// Chart Formatters Index

import { E_UNIT_OUT_FORMAT, UnitItem } from '../AxisConstants';
import { generateDurationFormatterFunction, generateScaleFormatterFunction, generateStringFormatterFunction, generateTimeFormatterFunction } from './scaleFormatter';
import { generateTooltipAxisFunction, generateTooltipItemFunction } from './tooltipFormatter';

// Central export point for all formatter utilities
// export { generateScaleFormatterFunction, generateTimeFormatterFunction, generateDurationFormatterFunction, generateStringFormatterFunction } from './scaleFormatter';

export const unitFormatter = (aUnit: UnitItem, aDecimals: any, aType: 'TICK' | 'TOOLTIP' = 'TICK', opt?: any) => {
    let sFormatter: any = { formatter: '' };
    const sIsNumber = Number.isFinite(parseInt(aDecimals));
    const decimalsValue = sIsNumber ? aDecimals : undefined;

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
            sFormatter = generateTooltipAxisFunction(opt.opt, opt.panelType, sFormatter.formatter);
        }
    }
    return sFormatter;
};
