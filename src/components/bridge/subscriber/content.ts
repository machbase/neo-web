/** TABLE */
export const SUBR_OPTIONS_TABLE = {
    columns: ['Name', 'Default', 'Description'],
    rows: [
        ['timeformat ', 'ns', 'Time format: s, ms, us, ns'],
        ['tz', 'UTC', 'Time Zone: UTC, Local and location spec'],
        ['delimiter', ',', 'CSV delimiter, ignored if content is not csv'],
        ['heading', 'false', 'If CSV contains header line, set true to skip the first line'],
    ],
};
export const SUBR_OPTIONS_EXAMPLE_TABLE = {
    columns: ['', ''],
    rows: [['db/append/EXAMPLE:csv?timeformat=s&heading=true'], ['db/write/EXAMPLE:csv:gzip?timeformat=s'], ['db/append/EXAMPLE:json?timeformat=2&pendingMsgLimit=1048576']],
};
export const SUBR_METHOD_TABLE = {
    columns: ['', '', ''],
    rows: [
        ['append', 'writing data in append mode'],
        ['write', 'writing data with INSERT sql statement'],
    ],
};
export const SUBR_FORMAT_TABLE = {
    columns: ['', '', ''],
    rows: [
        ['json', '(default)'],
        ['csv', ''],
    ],
};
export const SUBR_TQL_SCRIPT_TABLE = {
    columns: ['NAME', 'BRIDGE', 'TOPIC', 'DESTINATION', 'AUTOSTART', 'STATE'],
    rows: [['NATS_SUBR', 'my_nats', 'test.topic', '/test.tql', 'true', 'RUNNING']],
};
