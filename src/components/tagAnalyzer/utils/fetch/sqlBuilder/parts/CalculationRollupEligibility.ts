import { getIntervalMs } from '../../../time/IntervalUtils';
import { findRollupTableEntry } from './RollupMetadataLookup';
import type { RollupValue } from './SqlTypes';

/**
 * Returns whether the current first/last calculation should use extended rollup syntax.
 * Intent: Keep first/last rollup eligibility local to the calculation SQL helpers.
 * @param {unknown} rollupMetadata - The available rollup metadata map.
 * @param {string} tableName - The qualified source table name.
 * @param {string} intervalUnit - The interval unit used by the request.
 * @param {number} intervalSize - The interval size used by the request.
 * @returns {boolean} True when the request should use extended rollup syntax.
 */
export function shouldUseExtendedFirstLastRollup(
    rollupMetadata: unknown,
    tableName: string,
    intervalUnit: string,
    intervalSize: number,
): boolean {
    const sRequestedIntervalMs = getIntervalMs(intervalUnit, intervalSize);
    if (sRequestedIntervalMs <= 0) {
        return false;
    }

    const sRollupEntry = findRollupTableEntry(rollupMetadata, tableName);
    if (!sRollupEntry?.VALUE || !sRollupEntry.EXT_TYPE) {
        return false;
    }

    const sMatchingIntervalIndex = findMatchingRollupIntervalIndex(
        sRollupEntry.VALUE,
        sRequestedIntervalMs,
    );
    if (sMatchingIntervalIndex < 0) {
        return false;
    }

    return isExtendedRollupType(sRollupEntry.EXT_TYPE[sMatchingIntervalIndex]);
}

function findMatchingRollupIntervalIndex(
    rollupIntervals: RollupValue[],
    requestedIntervalMs: number,
): number {
    for (let index = 0; index < rollupIntervals.length; index++) {
        const sRollupIntervalMs = Number(rollupIntervals[index]);
        if (!Number.isFinite(sRollupIntervalMs) || sRollupIntervalMs <= 0) {
            continue;
        }

        if (requestedIntervalMs % sRollupIntervalMs !== 0) {
            continue;
        }

        return index;
    }

    return -1;
}

function isExtendedRollupType(value: unknown): boolean {
    if (typeof value === 'number') {
        return value !== 0;
    }

    if (typeof value === 'string') {
        const sNumericValue = Number(value);
        if (!Number.isNaN(sNumericValue)) {
            return sNumericValue !== 0;
        }

        return value.length > 0;
    }

    return Boolean(value);
}
