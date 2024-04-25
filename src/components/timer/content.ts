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
