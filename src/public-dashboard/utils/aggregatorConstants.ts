/**
 * Aggregator Constants
 * This file contains all aggregator-related constants and enums used throughout the application
 */

// Aggregator types
export enum AGGREGATOR_TYPE {
    FIRST = 'first',
    LAST = 'last',
    VALUE = 'value',
    NONE = 'none',
    COUNT = 'count',
    COUNT_ALL = 'count(*)',
    SUM = 'sum',
    MIN = 'min',
    MAX = 'max',
    AVG = 'avg',
    SUMSQ = 'sumsq',
    STDDEV = 'stddev',
    STDDEV_POP = 'stddev (pop)',
    VARIANCE = 'variance',
    VARIANCE_POP = 'variance (pop)',
}

// Aggregator display names
export const AGGREGATOR_DISPLAY_NAMES = {
    [AGGREGATOR_TYPE.FIRST]: 'First Value',
    [AGGREGATOR_TYPE.LAST]: 'Last Value',
    [AGGREGATOR_TYPE.VALUE]: 'Value',
    [AGGREGATOR_TYPE.NONE]: 'None',
    [AGGREGATOR_TYPE.COUNT]: 'Count',
    [AGGREGATOR_TYPE.COUNT_ALL]: 'Count(*)',
    [AGGREGATOR_TYPE.SUM]: 'Sum',
    [AGGREGATOR_TYPE.MIN]: 'Min',
    [AGGREGATOR_TYPE.MAX]: 'Max',
    [AGGREGATOR_TYPE.AVG]: 'Average',
    [AGGREGATOR_TYPE.SUMSQ]: 'Sum of Squares',
    [AGGREGATOR_TYPE.STDDEV]: 'Standard Deviation',
    [AGGREGATOR_TYPE.STDDEV_POP]: 'Standard Deviation (Population)',
    [AGGREGATOR_TYPE.VARIANCE]: 'Variance',
    [AGGREGATOR_TYPE.VARIANCE_POP]: 'Variance (Population)',
};

// Time value aggregator lists
export const TAG_AGGREGATOR_LIST = [
    AGGREGATOR_TYPE.FIRST,
    AGGREGATOR_TYPE.LAST,
    AGGREGATOR_TYPE.VALUE,
    AGGREGATOR_TYPE.COUNT,
    AGGREGATOR_TYPE.SUM,
    AGGREGATOR_TYPE.MIN,
    AGGREGATOR_TYPE.MAX,
    AGGREGATOR_TYPE.AVG,
    AGGREGATOR_TYPE.SUMSQ,
];

export const LOG_AGGREGATOR_LIST = [
    AGGREGATOR_TYPE.FIRST,
    AGGREGATOR_TYPE.LAST,
    AGGREGATOR_TYPE.VALUE,
    AGGREGATOR_TYPE.COUNT_ALL,
    AGGREGATOR_TYPE.COUNT,
    AGGREGATOR_TYPE.SUM,
    AGGREGATOR_TYPE.MIN,
    AGGREGATOR_TYPE.MAX,
    AGGREGATOR_TYPE.AVG,
    AGGREGATOR_TYPE.SUMSQ,
];

export const GEOMAP_AGGREGATOR_LIST = [AGGREGATOR_TYPE.VALUE, AGGREGATOR_TYPE.FIRST, AGGREGATOR_TYPE.LAST];

// Name value aggregator lists
export const NAME_VALUE_AGGREGATOR_LIST = [
    AGGREGATOR_TYPE.FIRST,
    AGGREGATOR_TYPE.LAST,
    AGGREGATOR_TYPE.COUNT_ALL,
    AGGREGATOR_TYPE.COUNT,
    AGGREGATOR_TYPE.SUM,
    AGGREGATOR_TYPE.MIN,
    AGGREGATOR_TYPE.MAX,
    AGGREGATOR_TYPE.AVG,
    AGGREGATOR_TYPE.SUMSQ,
    AGGREGATOR_TYPE.STDDEV,
    AGGREGATOR_TYPE.STDDEV_POP,
    AGGREGATOR_TYPE.VARIANCE,
    AGGREGATOR_TYPE.VARIANCE_POP,
];

// Name value aggregator + Virtual table
export const NAME_VALUE_VIRTUAL_AGG_LIST = [AGGREGATOR_TYPE.COUNT, AGGREGATOR_TYPE.SUM, AGGREGATOR_TYPE.MIN, AGGREGATOR_TYPE.MAX, AGGREGATOR_TYPE.AVG];

// Difference types
export const DIFF_LIST = ['diff', 'diff (abs)', 'diff (no-negative)'];

// Aggregator mapping for SQL functions
export const AGGREGATOR_SQL_MAP = {
    [AGGREGATOR_TYPE.FIRST]: 'first',
    [AGGREGATOR_TYPE.LAST]: 'last',
    [AGGREGATOR_TYPE.VALUE]: 'value',
    [AGGREGATOR_TYPE.NONE]: 'none',
    [AGGREGATOR_TYPE.COUNT]: 'count',
    [AGGREGATOR_TYPE.COUNT_ALL]: 'count(*)',
    [AGGREGATOR_TYPE.SUM]: 'sum',
    [AGGREGATOR_TYPE.MIN]: 'min',
    [AGGREGATOR_TYPE.MAX]: 'max',
    [AGGREGATOR_TYPE.AVG]: 'avg',
    [AGGREGATOR_TYPE.SUMSQ]: 'sumsq',
    [AGGREGATOR_TYPE.STDDEV]: 'stddev',
    [AGGREGATOR_TYPE.STDDEV_POP]: 'stddev_pop',
    [AGGREGATOR_TYPE.VARIANCE]: 'variance',
    [AGGREGATOR_TYPE.VARIANCE_POP]: 'var_pop',
};

// Difference mapping for SQL functions
export const DIFF_SQL_MAP = {
    diff: 'DIFF',
    'diff (abs)': 'ABSDIFF',
    'diff (no-negative)': 'NONEGDIFF',
};

// Default aggregators by context
export const DEFAULT_AGGREGATORS = {
    TIME_VALUE: AGGREGATOR_TYPE.COUNT,
    NAME_VALUE: AGGREGATOR_TYPE.LAST,
    VIRTUAL_TABLE: AGGREGATOR_TYPE.SUM,
    GEOMAP: AGGREGATOR_TYPE.VALUE,
    ADV_SCATTER: AGGREGATOR_TYPE.AVG,
} as const;

// Aggregator validation rules
export const AGGREGATOR_VALIDATION_RULES = {
    [AGGREGATOR_TYPE.FIRST]: {
        requiresTimeColumn: true,
        supportsRollup: false,
        supportsExtType: true,
    },
    [AGGREGATOR_TYPE.LAST]: {
        requiresTimeColumn: true,
        supportsRollup: false,
        supportsExtType: true,
    },
    [AGGREGATOR_TYPE.VALUE]: {
        requiresTimeColumn: false,
        supportsRollup: true,
        supportsExtType: false,
    },
    [AGGREGATOR_TYPE.NONE]: {
        requiresTimeColumn: false,
        supportsRollup: true,
        supportsExtType: false,
    },
    [AGGREGATOR_TYPE.COUNT]: {
        requiresTimeColumn: false,
        supportsRollup: true,
        supportsExtType: false,
    },
    [AGGREGATOR_TYPE.COUNT_ALL]: {
        requiresTimeColumn: false,
        supportsRollup: true,
        supportsExtType: false,
    },
    [AGGREGATOR_TYPE.SUM]: {
        requiresTimeColumn: false,
        supportsRollup: true,
        supportsExtType: false,
    },
    [AGGREGATOR_TYPE.MIN]: {
        requiresTimeColumn: false,
        supportsRollup: true,
        supportsExtType: false,
    },
    [AGGREGATOR_TYPE.MAX]: {
        requiresTimeColumn: false,
        supportsRollup: true,
        supportsExtType: false,
    },
    [AGGREGATOR_TYPE.AVG]: {
        requiresTimeColumn: false,
        supportsRollup: true,
        supportsExtType: false,
    },
    [AGGREGATOR_TYPE.SUMSQ]: {
        requiresTimeColumn: false,
        supportsRollup: true,
        supportsExtType: false,
    },
    [AGGREGATOR_TYPE.STDDEV]: {
        requiresTimeColumn: false,
        supportsRollup: true,
        supportsExtType: false,
    },
    [AGGREGATOR_TYPE.STDDEV_POP]: {
        requiresTimeColumn: false,
        supportsRollup: true,
        supportsExtType: false,
    },
    [AGGREGATOR_TYPE.VARIANCE]: {
        requiresTimeColumn: false,
        supportsRollup: true,
        supportsExtType: false,
    },
    [AGGREGATOR_TYPE.VARIANCE_POP]: {
        requiresTimeColumn: false,
        supportsRollup: true,
        supportsExtType: false,
    },
};

// Helper functions
export const isFirstOrLastAggregator = (aggregator: string): boolean => {
    return aggregator === AGGREGATOR_TYPE.FIRST || aggregator === AGGREGATOR_TYPE.LAST;
};

export const isValueOrNoneAggregator = (aggregator: string): boolean => {
    return aggregator === AGGREGATOR_TYPE.VALUE || aggregator === AGGREGATOR_TYPE.NONE;
};

export const isCountAllAggregator = (aggregator: string): boolean => {
    return aggregator === AGGREGATOR_TYPE.COUNT_ALL;
};

export const getAggregatorDisplayName = (aggregator: string): string => {
    return AGGREGATOR_DISPLAY_NAMES[aggregator as AGGREGATOR_TYPE] || aggregator;
};

export const getAggregatorSqlFunction = (aggregator: string): string => {
    return AGGREGATOR_SQL_MAP[aggregator as AGGREGATOR_TYPE] || aggregator;
};

export const getDiffSqlFunction = (diff: string): string => {
    return DIFF_SQL_MAP[diff as keyof typeof DIFF_SQL_MAP] || 'DIFF';
};

export const getDefaultAggregator = (context: keyof typeof DEFAULT_AGGREGATORS): string => {
    return DEFAULT_AGGREGATORS[context];
};

export const getAggregatorValidationRule = (aggregator: string) => {
    return AGGREGATOR_VALIDATION_RULES[aggregator as AGGREGATOR_TYPE];
};
