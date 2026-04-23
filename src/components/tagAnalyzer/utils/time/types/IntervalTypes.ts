import { TimeUnit } from './TimeTypes';

export type TimeUnitOption = {
    value: TimeUnit;
    label: TimeUnit;
    disabled: undefined;
};

export type IntervalSpec = {
    type:
        | TimeUnit.Second
        | TimeUnit.Minute
        | TimeUnit.Hour
        | TimeUnit.Day;
    value: number;
};

export type IntervalRule = {
    limit: number;
    buildIntervalSpec: (aCalc: number) => IntervalSpec;
};
