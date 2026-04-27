export const TAG_ANALYZER_AGGREGATION_MODES = [
    { key: 'min', value: 'min' },
    { key: 'max', value: 'max' },
    { key: 'sum', value: 'sum' },
    { key: 'cnt', value: 'cnt' },
    { key: 'avg', value: 'avg' },
    { key: 'first', value: 'first' },
    { key: 'last', value: 'last' },
];

export const TAG_ANALYZER_AGGREGATION_MODE_OPTIONS = TAG_ANALYZER_AGGREGATION_MODES.map(
    (mode) => ({
        label: mode.value,
        value: mode.value,
        disabled: undefined,
    }),
);
