import {
    parseTimeRangeConfigFromBoundaryValues,
    type TimeBoundaryInputValue,
} from '../../../../time/TimeBoundaryParser';

export type PersistedTimeBoundaryValue = TimeBoundaryInputValue | '';

export const parsePersistedTimeRangeConfigFromBoundaryValues =
    parseTimeRangeConfigFromBoundaryValues;
