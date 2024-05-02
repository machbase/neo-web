/** TABLE */
export const TIMER_SPEC = {
    columns: ['', '', ''],
    rows: [
        ['CRON expression', '0 30 * * * *', 'Every hour on the half hour'],
        ['Predefined schedules?', '@every 1h30m', 'Every hour thirty'],
        ['Intervals', '@daily', 'Every day'],
    ],
};
export const CRON_EXPRESSION = {
    columns: ['Field name', 'Mandatory?', 'Allowed values', 'Allowed special characters'],
    rows: [
        ['Seconds', 'Yes', '0-59', '* / , -'],
        ['Minutes', 'Yes', '0-59', '* / , -'],
        ['Hours', 'Yes', '0-23', '* / , -'],
        ['Day of month', 'Yes', '1-31', '* / , - ?'],
        ['Month', 'Yes', '1-12 or JAN-DEC', '* / , -'],
        ['Day of week', 'Yes', '0-6 or SUN-SAT', '* / , - ?'],
    ],
};
export const PREDEFINED_SCHEDULES = {
    columns: ['Entry', 'Description', 'Equivalent To'],
    rows: [
        ['@yearly (or @annually)', 'Run once a year, midnight, Jan. 1st', '0 0 0 1 1 *'],
        ['@monthly', 'Run once a month, midnight, first of month', '0 0 0 1 * *'],
        ['@weekly', 'Run once a week, midnight between Sat/Sun', '0 0 0 * * 0'],
        ['@daily (or @midnight)', 'Run once a day, midnight', '0 0 0 * * *'],
        ['@hourly', 'Run once an hour, beginning of hour', '0 0 * * * *'],
    ],
};
export const INTERVAL = {
    columns: [''],
    rows: [['@every 10h'], ['@every 1h10m30s']],
};

/** HINT */
export const CRON_EXPRESSION_HINT = [
    {
        name: 'Asterisk *',
        content:
            'The asterisk indicates that the cron expression will match for all values of the field; e.g., using an asterisk in the 5th field (month) would indicate every month.',
    },
    {
        name: 'Slash /',
        content:
            'Slashes are used to describe increments of ranges. For example 3-59/15 in the 1st field (minutes) would indicate the 3rd minute of the hour and every 15 minutes thereafter. The form “*/…” is equivalent to the form “first-last/…”, that is, an increment over the largest possible range of the field. The form “N/…” is accepted as meaning “N-MAX/…”, that is, starting at N, use the increment until the end of that specific range. It does not wrap around.',
    },
    {
        name: 'Comma ,',
        content: 'Commas are used to separate items of a list. For example, using “MON,WED,FRI” in the 5th field (day of week) would mean Mondays, Wednesdays and Fridays.',
    },
    { name: 'Hyphen -', content: 'Hyphens are used to define ranges. For example, 9-17 would indicate every hour between 9am and 5pm inclusive.' },
    { name: 'Question mark ?', content: 'Question mark may be used instead of * for leaving either day-of-month or day-of-week blank.' },
];
export const AUTO_START_DESC = 'Makes the task to start automatically when machbase-neo starts';
export const INTERVAL_DESC =
    '@every <duration> where “duration” is a string that is a possibly signed sequence of decimal numbers, each with optional fraction and a unit suffix, such as “300ms”, “-1.5h” or “2h45m”. Valid time units are “ms”, “s”, “m”, “h”.';
