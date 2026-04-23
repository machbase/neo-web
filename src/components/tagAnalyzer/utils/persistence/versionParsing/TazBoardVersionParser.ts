import { DEFAULT_VALUE_RANGE } from '../../../TagAnalyzerCommonConstants';
import type { BoardInfo } from '../../boardTypes';
import type { PanelInfo } from '../../panelModelTypes';
import type { TimeRangePair } from '../../time/types/TimeTypes';
import {
    normalizeLegacyTimeRangeBoundary,
} from '../../legacy/LegacyTimeAdapter';
import {
    createPanelInfoFromPersistedV200,
    createPanelInfoFromPersistedV201,
    createPanelInfoFromPersistedV202,
    createPanelInfoFromPersistedV203,
    createPanelInfoFromPersistedV204,
    createPanelInfoFromPersistedV205,
    isPersistedPanelInfoV200,
    isPersistedPanelInfoV201,
    isPersistedPanelInfoV202,
    isPersistedPanelInfoV203,
    isPersistedPanelInfoV204,
    isPersistedPanelInfoV205,
} from './TazPanelVersionParser';
import type {
    PersistedPanelInfoV200,
    PersistedPanelInfoV201,
    PersistedPanelInfoV202,
    PersistedPanelInfoV203,
    PersistedPanelInfoV204,
    PersistedPanelInfoV205,
    PersistedSeriesInfoV200,
    PersistedSeriesInfoV201,
    PersistedSeriesInfoV204,
} from '../TazPanelPersistenceTypes';
import type { PersistedTazBoardInfo } from '../TazPersistenceTypes';
import { createPanelInfoFromLegacyFlatPanelInfo } from '../legacy/LegacyFlatPanelMapper';
import type { LegacyFlatPanelInfo } from '../legacy/LegacyFlatPanelTypes';
import { resolvePersistedTazVersion, type PersistedTazVersion } from './TazVersionResolver';

/**
 * Parses received board data into the runtime board model.
 * Intent: Normalize every supported `.taz` input version at the boundary before the UI uses it.
 * @param {PersistedTazBoardInfo} aBoardInfo The received board data from Recoil or a `.taz` file.
 * @returns {BoardInfo} The runtime board model used internally by TagAnalyzer.
 */
export function parseReceivedBoardInfo(aBoardInfo: PersistedTazBoardInfo): BoardInfo {
    const sBoardTimeRange = aBoardInfo.boardTimeRange;
    const sBoardTime = normalizeLegacyTimeRangeBoundary(
        sBoardTimeRange?.start ?? aBoardInfo.range_bgn,
        sBoardTimeRange?.end ?? aBoardInfo.range_end,
    );
    const sPersistedVersion = resolvePersistedTazVersion(aBoardInfo.version);

    return {
        ...aBoardInfo,
        panels: (aBoardInfo.panels ?? []).map((aPanelInfo) =>
            parseReceivedPanelInfo(aPanelInfo, sPersistedVersion),
        ),
        range: sBoardTime.range,
        rangeConfig: sBoardTime.rangeConfig,
    };
}

/**
 * Parses one received panel into the runtime panel model.
 * Intent: Keep `.taz` version branching isolated at the persistence boundary.
 * @param {unknown} aPanelInfo The received panel value.
 * @param {PersistedTazVersion} aPersistedVersion The resolved `.taz` format version.
 * @returns {PanelInfo} The runtime panel model.
 */
export function parseReceivedPanelInfo(
    aPanelInfo: unknown,
    aPersistedVersion: PersistedTazVersion,
): PanelInfo {
    if (aPersistedVersion === '2.0.5' && isPersistedPanelInfoV205(aPanelInfo)) {
        return createPanelInfoFromPersistedV205(
            normalizePersistedPanelInfoV205(aPanelInfo),
        );
    }

    if (aPersistedVersion === '2.0.4' && isPersistedPanelInfoV204(aPanelInfo)) {
        return createPanelInfoFromPersistedV204(
            normalizePersistedPanelInfoV204(aPanelInfo),
        );
    }

    if (aPersistedVersion === '2.0.3' && isPersistedPanelInfoV203(aPanelInfo)) {
        return createPanelInfoFromPersistedV203(
            normalizePersistedPanelInfoV203(aPanelInfo),
        );
    }

    if (aPersistedVersion === '2.0.2' && isPersistedPanelInfoV202(aPanelInfo)) {
        return createPanelInfoFromPersistedV202(
            normalizePersistedPanelInfoV202(aPanelInfo),
        );
    }

    if (aPersistedVersion === '2.0.1' && isPersistedPanelInfoV201(aPanelInfo)) {
        return createPanelInfoFromPersistedV201(
            normalizePersistedPanelInfoV201(aPanelInfo),
        );
    }

    if (aPersistedVersion === '2.0.0' && isPersistedPanelInfoV200(aPanelInfo)) {
        return createPanelInfoFromPersistedV200(
            normalizePersistedPanelInfoV200(aPanelInfo),
        );
    }

    if (isPersistedPanelInfoV205(aPanelInfo)) {
        return createPanelInfoFromPersistedV205(
            normalizePersistedPanelInfoV205(aPanelInfo),
        );
    }

    if (isPersistedPanelInfoV204(aPanelInfo)) {
        return createPanelInfoFromPersistedV204(
            normalizePersistedPanelInfoV204(aPanelInfo),
        );
    }

    if (isPersistedPanelInfoV203(aPanelInfo)) {
        return createPanelInfoFromPersistedV203(
            normalizePersistedPanelInfoV203(aPanelInfo),
        );
    }

    if (isPersistedPanelInfoV202(aPanelInfo)) {
        return createPanelInfoFromPersistedV202(
            normalizePersistedPanelInfoV202(aPanelInfo),
        );
    }

    if (isPersistedPanelInfoV201(aPanelInfo)) {
        return createPanelInfoFromPersistedV201(
            normalizePersistedPanelInfoV201(aPanelInfo),
        );
    }

    if (isPersistedPanelInfoV200(aPanelInfo)) {
        return createPanelInfoFromPersistedV200(
            normalizePersistedPanelInfoV200(aPanelInfo),
        );
    }

    return createPanelInfoFromLegacyFlatPanelInfo(aPanelInfo as LegacyFlatPanelInfo);
}

function normalizePersistedPanelInfoV200(
    aPanelInfo: PersistedPanelInfoV200,
): PersistedPanelInfoV200 {
    return {
        ...aPanelInfo,
        data: {
            ...aPanelInfo.data,
            tag_set: (aPanelInfo.data.tag_set ?? []).map(
                normalizePersistedSeriesInfoV200,
            ),
            raw_keeper: aPanelInfo.data.raw_keeper ?? false,
            count: aPanelInfo.data.count ?? -1,
        },
        time: {
            ...aPanelInfo.time,
            range_bgn: aPanelInfo.time.range_bgn ?? 0,
            range_end: aPanelInfo.time.range_end ?? 0,
            time_keeper: normalizeLegacyTimeKeeper(aPanelInfo.time.time_keeper),
        },
        highlights: aPanelInfo.highlights ?? [],
    };
}

function normalizePersistedPanelInfoV201(
    aPanelInfo: PersistedPanelInfoV201,
): PersistedPanelInfoV201 {
    return {
        ...aPanelInfo,
        data: {
            ...aPanelInfo.data,
            seriesList: (aPanelInfo.data.seriesList ?? []).map(
                normalizePersistedSeriesInfoV201,
            ),
            useRawData: aPanelInfo.data.useRawData ?? false,
            rowLimit: aPanelInfo.data.rowLimit ?? -1,
        },
        time: {
            ...aPanelInfo.time,
            rangeStart: aPanelInfo.time.rangeStart ?? 0,
            rangeEnd: aPanelInfo.time.rangeEnd ?? 0,
            savedTimeRange: normalizeLegacyTimeKeeper(aPanelInfo.time.savedTimeRange),
        },
        highlights: aPanelInfo.highlights ?? [],
    };
}

function normalizePersistedPanelInfoV202(
    aPanelInfo: PersistedPanelInfoV202,
): PersistedPanelInfoV202 {
    return {
        ...aPanelInfo,
        data: {
            ...aPanelInfo.data,
            seriesList: (aPanelInfo.data.seriesList ?? []).map(
                normalizePersistedSeriesInfoV201,
            ),
            useRawData: aPanelInfo.data.useRawData ?? false,
            rowLimit: aPanelInfo.data.rowLimit ?? -1,
        },
        time: {
            ...aPanelInfo.time,
            rangeStart: aPanelInfo.time.rangeStart ?? 0,
            rangeEnd: aPanelInfo.time.rangeEnd ?? 0,
            savedTimeRange: normalizeLegacyTimeKeeper(aPanelInfo.time.savedTimeRange),
        },
        axes: {
            xAxis: {
                showTickLine: aPanelInfo.axes?.xAxis?.showTickLine ?? false,
                rawDataPixelsPerTick: aPanelInfo.axes?.xAxis?.rawDataPixelsPerTick ?? 0,
                calculatedDataPixelsPerTick:
                    aPanelInfo.axes?.xAxis?.calculatedDataPixelsPerTick ?? 0,
            },
            sampling: {
                enabled: aPanelInfo.axes?.sampling?.enabled ?? false,
                sampleCount: aPanelInfo.axes?.sampling?.sampleCount ?? 0,
            },
            primaryYAxis: {
                zeroBase: aPanelInfo.axes?.primaryYAxis?.zeroBase ?? false,
                showTickLine: aPanelInfo.axes?.primaryYAxis?.showTickLine ?? false,
                valueRange: aPanelInfo.axes?.primaryYAxis?.valueRange ?? {
                    ...DEFAULT_VALUE_RANGE,
                },
                rawDataValueRange:
                    aPanelInfo.axes?.primaryYAxis?.rawDataValueRange ?? {
                        ...DEFAULT_VALUE_RANGE,
                    },
                upperControlLimit: {
                    enabled:
                        aPanelInfo.axes?.primaryYAxis?.upperControlLimit?.enabled ?? false,
                    value: aPanelInfo.axes?.primaryYAxis?.upperControlLimit?.value ?? 0,
                },
                lowerControlLimit: {
                    enabled:
                        aPanelInfo.axes?.primaryYAxis?.lowerControlLimit?.enabled ?? false,
                    value: aPanelInfo.axes?.primaryYAxis?.lowerControlLimit?.value ?? 0,
                },
            },
            secondaryYAxis: {
                enabled: aPanelInfo.axes?.secondaryYAxis?.enabled ?? false,
                zeroBase: aPanelInfo.axes?.secondaryYAxis?.zeroBase ?? false,
                showTickLine: aPanelInfo.axes?.secondaryYAxis?.showTickLine ?? false,
                valueRange: aPanelInfo.axes?.secondaryYAxis?.valueRange ?? {
                    ...DEFAULT_VALUE_RANGE,
                },
                rawDataValueRange:
                    aPanelInfo.axes?.secondaryYAxis?.rawDataValueRange ??
                    { ...DEFAULT_VALUE_RANGE },
                upperControlLimit: {
                    enabled:
                        aPanelInfo.axes?.secondaryYAxis?.upperControlLimit?.enabled ?? false,
                    value: aPanelInfo.axes?.secondaryYAxis?.upperControlLimit?.value ?? 0,
                },
                lowerControlLimit: {
                    enabled:
                        aPanelInfo.axes?.secondaryYAxis?.lowerControlLimit?.enabled ?? false,
                    value: aPanelInfo.axes?.secondaryYAxis?.lowerControlLimit?.value ?? 0,
                },
            },
        },
        highlights: aPanelInfo.highlights ?? [],
    };
}

function normalizePersistedPanelInfoV203(
    aPanelInfo: PersistedPanelInfoV203,
): PersistedPanelInfoV203 {
    return {
        ...aPanelInfo,
        data: {
            ...aPanelInfo.data,
            seriesList: (aPanelInfo.data.seriesList ?? []).map(
                normalizePersistedSeriesInfoV201,
            ),
            useRawData: aPanelInfo.data.useRawData ?? false,
            rowLimit: aPanelInfo.data.rowLimit ?? -1,
        },
        time: {
            ...aPanelInfo.time,
            rangeStart: aPanelInfo.time.rangeStart ?? 0,
            rangeEnd: aPanelInfo.time.rangeEnd ?? 0,
            savedTimeRange: normalizeLegacyTimeKeeper(aPanelInfo.time.savedTimeRange),
        },
        axes: {
            xAxis: {
                showTickLine: aPanelInfo.axes?.xAxis?.showTickLine ?? false,
                rawDataPixelsPerTick: aPanelInfo.axes?.xAxis?.rawDataPixelsPerTick ?? 0,
                calculatedDataPixelsPerTick:
                    aPanelInfo.axes?.xAxis?.calculatedDataPixelsPerTick ?? 0,
            },
            sampling: {
                enabled: aPanelInfo.axes?.sampling?.enabled ?? false,
                sampleCount: aPanelInfo.axes?.sampling?.sampleCount ?? 0,
            },
            leftYAxis: {
                zeroBase: aPanelInfo.axes?.leftYAxis?.zeroBase ?? false,
                showTickLine: aPanelInfo.axes?.leftYAxis?.showTickLine ?? false,
                valueRange: aPanelInfo.axes?.leftYAxis?.valueRange ?? {
                    ...DEFAULT_VALUE_RANGE,
                },
                rawDataValueRange:
                    aPanelInfo.axes?.leftYAxis?.rawDataValueRange ?? {
                        ...DEFAULT_VALUE_RANGE,
                    },
                upperControlLimit: {
                    enabled:
                        aPanelInfo.axes?.leftYAxis?.upperControlLimit?.enabled ?? false,
                    value: aPanelInfo.axes?.leftYAxis?.upperControlLimit?.value ?? 0,
                },
                lowerControlLimit: {
                    enabled:
                        aPanelInfo.axes?.leftYAxis?.lowerControlLimit?.enabled ?? false,
                    value: aPanelInfo.axes?.leftYAxis?.lowerControlLimit?.value ?? 0,
                },
            },
            rightYAxis: {
                enabled: aPanelInfo.axes?.rightYAxis?.enabled ?? false,
                zeroBase: aPanelInfo.axes?.rightYAxis?.zeroBase ?? false,
                showTickLine: aPanelInfo.axes?.rightYAxis?.showTickLine ?? false,
                valueRange: aPanelInfo.axes?.rightYAxis?.valueRange ?? {
                    ...DEFAULT_VALUE_RANGE,
                },
                rawDataValueRange:
                    aPanelInfo.axes?.rightYAxis?.rawDataValueRange ?? {
                        ...DEFAULT_VALUE_RANGE,
                    },
                upperControlLimit: {
                    enabled:
                        aPanelInfo.axes?.rightYAxis?.upperControlLimit?.enabled ?? false,
                    value: aPanelInfo.axes?.rightYAxis?.upperControlLimit?.value ?? 0,
                },
                lowerControlLimit: {
                    enabled:
                        aPanelInfo.axes?.rightYAxis?.lowerControlLimit?.enabled ?? false,
                    value: aPanelInfo.axes?.rightYAxis?.lowerControlLimit?.value ?? 0,
                },
            },
        },
        highlights: aPanelInfo.highlights ?? [],
    };
}

function normalizePersistedPanelInfoV204(
    aPanelInfo: PersistedPanelInfoV204,
): PersistedPanelInfoV204 {
    return {
        ...aPanelInfo,
        data: {
            ...aPanelInfo.data,
            seriesList: (aPanelInfo.data.seriesList ?? []).map(
                normalizePersistedSeriesInfoV204,
            ),
            useRawData: aPanelInfo.data.useRawData ?? false,
            rowLimit: aPanelInfo.data.rowLimit ?? -1,
        },
        highlights: aPanelInfo.highlights ?? [],
    };
}

function normalizePersistedPanelInfoV205(
    aPanelInfo: PersistedPanelInfoV205,
): PersistedPanelInfoV205 {
    return {
        ...aPanelInfo,
        data: {
            ...aPanelInfo.data,
            seriesList: (aPanelInfo.data.seriesList ?? []).map(
                normalizePersistedSeriesInfoV204,
            ),
            useRawData: aPanelInfo.data.useRawData ?? false,
            rowLimit: aPanelInfo.data.rowLimit ?? -1,
        },
        highlights: aPanelInfo.highlights ?? [],
    };
}

function normalizePersistedSeriesInfoV200(
    aSeriesInfo: PersistedSeriesInfoV200,
): PersistedSeriesInfoV200 {
    return {
        ...aSeriesInfo,
        annotations: aSeriesInfo.annotations ?? [],
    };
}

function normalizePersistedSeriesInfoV201(
    aSeriesInfo: PersistedSeriesInfoV201,
): PersistedSeriesInfoV201 {
    return {
        ...aSeriesInfo,
        annotations: aSeriesInfo.annotations ?? [],
    };
}

function normalizePersistedSeriesInfoV204(
    aSeriesInfo: PersistedSeriesInfoV204,
): PersistedSeriesInfoV204 {
    return {
        ...aSeriesInfo,
        annotations: aSeriesInfo.annotations ?? [],
    };
}

function normalizeLegacyTimeKeeper(
    aTimeKeeper: Partial<TimeRangePair> | '' | undefined,
): Partial<TimeRangePair> | undefined {
    return aTimeKeeper === '' ? undefined : aTimeKeeper;
}
