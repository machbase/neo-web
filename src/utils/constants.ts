//
export const FORMAT_FULL_DATE = 'YYYY-MM-DD HH:mm:ss';
export const LENGTH_LIST = 10;
export const NOW = 'now';
export const DAY = 'd';
export const HOUR = 'h';
export const MINUTE = 'm';
export const SECOND = 's';
export const MONTH = 'M';
export const YEAR = 'y';
export const WEEK = 'w';
export const YESTERDAY = `${DAY}/${DAY}`;
export const PREVIOUS_WEEK = `${WEEK}/${WEEK}`;
export const PREVIOUS_MONTH = `${MONTH}/${MONTH}`;
export const PREVIOUS_YEAR = `${YEAR}/${YEAR}`;

export const ADMIN = 'Admin';
export const COMBO_BOX_TIME = [
    {
        name: 'off',
        value: 'off',
    },
    {
        name: '10 seconds',
        value: '10s',
    },
    {
        name: '30 seconds',
        value: '30s',
    },
    {
        name: '1 minute',
        value: '1m',
    },
    {
        name: '5 minutes',
        value: '5m',
    },
    {
        name: '10 minutes',
        value: '10m',
    },
    {
        name: '1 hour',
        value: '1h',
    },
];
export const TIME_RANGE = [
    [
        {
            key: 1,
            name: 'Last 2 days',
            value: [`${NOW}-2${DAY}`, `${NOW}`],
        },
        {
            key: 2,
            name: 'Last 7 days',
            value: [`${NOW}-7${DAY}`, `${NOW}`],
        },
        {
            key: 3,
            name: 'Last 30 days',
            value: [`${NOW}-30${DAY}`, `${NOW}`],
        },
        {
            key: 4,
            name: 'Last 90 days',
            value: [`${NOW}-90${DAY}`, `${NOW}`],
        },
        {
            key: 5,
            name: 'Last 6 months',
            value: [`${NOW}-6${MONTH}`, `${NOW}`],
        },
        {
            key: 6,
            name: 'Last 1 year',
            value: [`${NOW}-1${YEAR}`, `${NOW}`],
        },
        {
            key: 7,
            name: 'Last 2 years',
            value: [`${NOW}-2${YEAR}`, `${NOW}`],
        },
        {
            key: 8,
            name: 'Last 5 years',
            value: [`${NOW}-5${YEAR}`, `${NOW}`],
        },
    ],
    [
        {
            key: 9,
            name: 'Yesterday',
            value: [`${NOW}-1${YESTERDAY}`, `${NOW}-1${YESTERDAY}`],
        },
        {
            key: 10,
            name: 'Day before yesterday',
            value: [`${NOW}-2${YESTERDAY}`, `${NOW}-2${YESTERDAY}`],
        },
        {
            key: 11,
            name: 'This day last week',
            value: [`${NOW}-7${YESTERDAY}`, `${NOW}-7${YESTERDAY}`],
        },
        {
            key: 12,
            name: 'Previous week',
            value: [`${NOW}-1${PREVIOUS_WEEK}`, `${NOW}-1${PREVIOUS_WEEK}`],
        },
        {
            key: 13,
            name: 'Previous month',
            value: [`${NOW}-1${PREVIOUS_MONTH}`, `${NOW}-1${PREVIOUS_MONTH}`],
        },
        {
            key: 14,
            name: 'Previous year',
            value: [`${NOW}-1${PREVIOUS_YEAR}`, `${NOW}-1${PREVIOUS_YEAR}`],
        },
    ],
    [
        {
            key: 15,
            name: 'Today',
            value: [`${NOW}/${DAY}`, `${NOW}/${DAY}`],
        },
        {
            key: 16,
            name: 'Today so far',
            value: [`${NOW}/${DAY}`, `${NOW}`],
        },
        {
            key: 17,
            name: 'This week',
            value: [`${NOW}/${WEEK}`, `${NOW}/${WEEK}`],
        },
        {
            key: 18,
            name: 'This week so far',
            value: [`${NOW}/${WEEK}`, `${NOW}`],
        },
        {
            key: 19,
            name: 'This month',
            value: [`${NOW}/${MONTH}`, `${NOW}/${MONTH}`],
        },
        {
            key: 20,
            name: 'This month so far',
            value: [`${NOW}/${MONTH}`, `${NOW}`],
        },
        {
            key: 21,
            name: 'This year',
            value: [`${NOW}/${YEAR}`, `${NOW}/${YEAR}`],
        },
        {
            key: 22,
            name: 'This year so far',
            value: [`${NOW}/${YEAR}`, `${NOW}`],
        },
    ],
    [
        {
            key: 23,
            name: 'Last 5 minutes',
            value: [`${NOW}-5${MINUTE}`, `${NOW}`],
        },
        {
            key: 24,
            name: 'Last 15 minutes',
            value: [`${NOW}-15${MINUTE}`, `${NOW}`],
        },
        {
            key: 25,
            name: 'Last 30 minutes',
            value: [`${NOW}-30${MINUTE}`, `${NOW}`],
        },
        {
            key: 26,
            name: 'Last 1 hour',
            value: [`${NOW}-1${HOUR}`, `${NOW}`],
        },
        {
            key: 27,
            name: 'Last 3 hour',
            value: [`${NOW}-3${HOUR}`, `${NOW}`],
        },
        {
            key: 28,
            name: 'Last 6 hour',
            value: [`${NOW}-6${HOUR}`, `${NOW}`],
        },
        {
            key: 29,
            name: 'Last 12 hour',
            value: [`${NOW}-12${HOUR}`, `${NOW}`],
        },
        {
            key: 30,
            name: 'Last 24 hour',
            value: [`${NOW}-24${HOUR}`, `${NOW}`],
        },
    ],
];
export const TIME_DURATION = [
    [
        {
            key: 1,
            name: '1 year',
            value: `1${YEAR}`,
            number: 1,
            format: YEAR,
        },
        {
            key: 2,
            name: '6 months',
            value: `6${MONTH}`,
            number: 6,
            format: MONTH,
        },
        {
            key: 3,
            name: '1 month',
            value: `1${MONTH}`,
            number: 1,
            format: MONTH,
        },
        {
            key: 4,
            name: '1 day',
            value: `1${DAY}`,
            number: 1,
            format: DAY,
        },
        {
            key: 5,
            name: '12 hours',
            value: `12${HOUR}`,
            number: 12,
            format: HOUR,
        },
        {
            key: 6,
            name: '6 hours',
            value: `6${HOUR}`,
            number: 6,
            format: HOUR,
        },
    ],
    [
        {
            key: 7,
            name: '3 hours',
            value: `3${HOUR}`,
            number: 3,
            format: HOUR,
        },
        {
            key: 8,
            name: '1 hours',
            value: `1${HOUR}`,
            number: 1,
            format: HOUR,
        },
        {
            key: 9,
            name: '30 minutes',
            value: `30${MINUTE}`,
            number: 30,
            format: MINUTE,
        },
        {
            key: 10,
            name: '10 minutes',
            value: `10${MINUTE}`,
            number: 10,
            format: MINUTE,
        },
        {
            key: 11,
            name: '1 minute',
            value: `1${MINUTE}`,
            number: 1,
            format: MINUTE,
        },
        {
            key: 12,
            name: '30 seconds',
            value: `30${SECOND}`,
            number: 30,
            format: SECOND,
        },
    ],
];
export const THEME_MODE = [
    {
        id: 'machIoTchartWhite',
        name: 'machIoTchartWhite',
    },
    {
        id: 'machIoTchartBlack',
        name: 'machIoTchartBlack',
    },
];

export const COLOR_SET = '5ca3f2,d06a5f,e2bb5c,86b66b,7070e0,6bcbc1,a673e8,e26daf,bac85d,87cedd';
