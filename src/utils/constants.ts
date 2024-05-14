export const FORMAT_FULL_DATE = 'YYYY-MM-DD HH:mm:ss';
export const LENGTH_LIST = 10;
export const NOW = 'now';
export const LAST = 'last';
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

export const TIME_RANGE_NOW = [
    {
        key: 1,
        name: 'Last 5 minutes',
        value: [`${NOW}-5${MINUTE}`, `${NOW}`],
    },
    {
        key: 2,
        name: 'Last 10 minutes',
        value: [`${NOW}-10${MINUTE}`, `${NOW}`],
    },
    {
        key: 3,
        name: 'Last 30 minutes',
        value: [`${NOW}-30${MINUTE}`, `${NOW}`],
    },
    {
        key: 4,
        name: 'Last 1 hour',
        value: [`${NOW}-1${HOUR}`, `${NOW}`],
    },
    {
        key: 5,
        name: 'Last 3 hour',
        value: [`${NOW}-3${HOUR}`, `${NOW}`],
    },
    // {
    //     key: 6,
    //     name: 'Last 6 hour',
    //     value: [`${NOW}-6${HOUR}`, `${NOW}`],
    // },
    {
        key: 7,
        name: 'Last 1 days',
        value: [`${NOW}-1${DAY}`, `${NOW}`],
    },
    {
        key: 8,
        name: 'Last 3 days',
        value: [`${NOW}-3${DAY}`, `${NOW}`],
    },
    // {
    //     key: 9,
    //     name: 'Last 7 days',
    //     value: [`${NOW}-7${DAY}`, `${NOW}`],
    // },
    {
        key: 10,
        name: 'Last 30 days',
        value: [`${NOW}-30${DAY}`, `${NOW}`],
    },
    {
        key: 11,
        name: 'Last 3 months',
        value: [`${NOW}-3${MONTH}`, `${NOW}`],
    },
    {
        key: 12,
        name: 'Last 1 year',
        value: [`${NOW}-1${YEAR}`, `${NOW}`],
    },
];
export const TIME_RANGE = [
    [
        {
            key: 1,
            name: 'Last 5 minutes',
            value: [`${NOW}-5${MINUTE}`, `${NOW}`],
        },
        {
            key: 2,
            name: 'Last 10 minutes',
            value: [`${NOW}-10${MINUTE}`, `${NOW}`],
        },
        {
            key: 3,
            name: 'Last 30 minutes',
            value: [`${NOW}-30${MINUTE}`, `${NOW}`],
        },
        {
            key: 4,
            name: 'Last 1 hour',
            value: [`${NOW}-1${HOUR}`, `${NOW}`],
        },
        {
            key: 5,
            name: 'Last 3 hour',
            value: [`${NOW}-3${HOUR}`, `${NOW}`],
        },
        // {
        //     key: 6,
        //     name: 'Last 6 hour',
        //     value: [`${NOW}-6${HOUR}`, `${NOW}`],
        // },
        {
            key: 7,
            name: 'Last 1 days',
            value: [`${NOW}-1${DAY}`, `${NOW}`],
        },
        {
            key: 8,
            name: 'Last 3 days',
            value: [`${NOW}-3${DAY}`, `${NOW}`],
        },
        // {
        //     key: 9,
        //     name: 'Last 7 days',
        //     value: [`${NOW}-7${DAY}`, `${NOW}`],
        // },
        {
            key: 10,
            name: 'Last 30 days',
            value: [`${NOW}-30${DAY}`, `${NOW}`],
        },
        {
            key: 11,
            name: 'Last 3 months',
            value: [`${NOW}-3${MONTH}`, `${NOW}`],
        },
        {
            key: 12,
            name: 'Last 1 year',
            value: [`${NOW}-1${YEAR}`, `${NOW}`],
        },
    ],

    [
        {
            key: 50,
            name: 'Last 5 minutes of data',
            value: [`${LAST}-5${MINUTE}`, `${LAST}`],
        },
        {
            key: 51,
            name: 'Last 10 minutes of data',
            value: [`${LAST}-10${MINUTE}`, `${LAST}`],
        },
        {
            key: 52,
            name: 'Last 30 minutes of data',
            value: [`${LAST}-30${MINUTE}`, `${LAST}`],
        },
        {
            key: 53,
            name: 'Last 1 hour of data',
            value: [`${LAST}-1${HOUR}`, `${LAST}`],
        },
        {
            key: 54,
            name: 'Last 3 hour of data',
            value: [`${LAST}-3${HOUR}`, `${LAST}`],
        },
        // {
        //     key: 55,
        //     name: 'Last 6 hour of data',
        //     value: [`${LAST}-6${HOUR}`, `${LAST}`],
        // },
        {
            key: 56,
            name: 'Last 1 days of data',
            value: [`${LAST}-1${DAY}`, `${LAST}`],
        },
        {
            key: 57,
            name: 'Last 3 days of data',
            value: [`${LAST}-3${DAY}`, `${LAST}`],
        },
        // {
        //     key: 58,
        //     name: 'Last 7 days of data',
        //     value: [`${LAST}-7${DAY}`, `${LAST}`],
        // },
        {
            key: 59,
            name: 'Last 30 days of data',
            value: [`${LAST}-30${DAY}`, `${LAST}`],
        },
        {
            key: 60,
            name: 'Last 3 months of data',
            value: [`${LAST}-3${MONTH}`, `${LAST}`],
        },
        {
            key: 61,
            name: 'Last 1 year of data',
            value: [`${LAST}-1${YEAR}`, `${LAST}`],
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
export const FONT_SIZE = [
    {
        name: 'xx-small',
        id: '12',
    },
    {
        name: 'x-small',
        id: '14',
    },
    {
        name: 'small',
        id: '16',
    },
    {
        name: 'normal',
        id: '18',
    },
    {
        name: 'large',
        id: '20',
    },
    {
        name: 'x-large',
        id: '20',
    },
    {
        name: 'xx-large',
        id: '22',
    },
];

export const DEFAULT_CHART = {
    index_key: new Date().getTime() + (Math.random() * 1000).toFixed(),
    chart_id: '',
    tag_set: [{ tag_names: '', calculation_mode: 'count', use_y2: 'N', alias: '', weight: 1.0 }],
    range_bgn: '',
    range_end: '',
    count: -1,
    fftOption: false,
    interval_type: '',
    interval_value: 1,
    refresh: '',
    csstype: 'machIoTchartBlack',
    show_legend: 'Y',
    start_with_vport: 'Y',
    raw_chart_limit: -1,
    raw_chart_threshold: -5000,
    legend_width: 0,
    name_legend_value: ['min', 'max', 'sum', 'avg'],
    show_legend_value: { min: 'Y', max: 'Y', sum: 'Y', avg: 'Y' },
    fill: 0.15,
    stroke: 1.5,
    show_point: 'N',
    point_radius: 0,
    pixels_per_tick: 3,
    pixels_per_tick_raw: 0.1,
    zero_base: 'N',
    detail_count: 0,
    detail_rows: 10,
    use_detail: 1,
    use_zoom: 'Y',
    drilldown_zoom: 'Y',
    use_normalize: 'N',
    border_color: '',
    chart_title: 'New chart',
    use_custom_min: 'N',
    custom_min: 0,
    use_custom_max: 'N',
    custom_max: 0,
    use_custom_drilldown_min: 'N',
    custom_drilldown_min: 0,
    use_custom_drilldown_max: 'N',
    custom_drilldown_max: 0,
    show_x_tickline: 'Y',
    show_y_tickline: 'Y',
    show_y_tickline2: 'Y',
    use_right_y2: 'Y',
    zero_base2: 'N',
    use_custom_min2: 'N',
    custom_min2: 0,
    use_custom_max2: 'N',
    custom_max2: 0,
    use_custom_drilldown_min2: 'N',
    custom_drilldown_min2: 0,
    use_custom_drilldown_max2: 'N',
    custom_drilldown_max2: 0,
    use_custom_color: 'Y',
    color_set: 'machbaseColorSet',
    chart_height: 300,
    chart_width: 0,
    timeout: 10000,
    x_axis_type: 'scaleTime',
    chart_type: 'line',
    time_keeper: {
        startPanelTime: 0,
        endPanelTime: 0,
        startNaviTime: 0,
        endNaviTime: 0,
    },
    raw_keeper: false,
    use_time_keeper: 'N',
};

export const COLOR_SET = '5ca3f2,d06a5f,e2bb5c,86b66b,7070e0,6bcbc1,a673e8,e26daf,bac85d,87cedd';

export const IMAGE_EXTENSION_LIST = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico'];

export const FILE_EXTENSION_LIST = ['sql', 'dsh', 'tql', 'wrk', 'taz', 'json', 'md', 'csv', 'txt'];

export const ADMIN_ID = 'sys';
export const DEFAULT_DB_NAME = 'machbasedb';

export const MIN_MAX_BASE_QUERY = `select min(min_time) as min_tm, max(max_time) as max_tm from [userName].v$[table]_stat where name in ([tags])`;
export const MIN_MAX_MOUNT_QUERY = `select min(TIME) as min_tm, max(TIME) as max_tm from [table] where name = '[tag]'`;

export const TABLE_COLUMN_TYPE = [
    { key: 4, value: 'SHORT' },
    { key: 5, value: 'VARCHAR' },
    { key: 6, value: 'DATETIME' },
    { key: 8, value: 'INTEGER' },
    { key: 12, value: 'LONG' },
    { key: 16, value: 'FLOAT' },
    { key: 20, value: 'DOUBLE' },
    { key: 32, value: 'IPV4' },
    { key: 36, value: 'IPV6' },
    { key: 49, value: 'TEXT' },
    { key: 53, value: 'CLOB' },
    { key: 57, value: 'BLOB' },
    { key: 97, value: 'BINARY' },
    { key: 104, value: 'USHORT' },
    { key: 108, value: 'UINTEGER' },
    { key: 112, value: 'ULONG' },
];
export const DB_NUMBER_TYPE = ['SHORT', 'INTEGER', 'LONG', 'FLOAT', 'DOUBLE', 'USHORT', 'UINTEGER', 'ULONG'];

// dashboard e-chart setting value
// export type SeriesType = 'line' | 'bar' | 'scatter' | 'pie' | 'radar' | 'candlestick' | 'heatmap' | 'sankey' | 'gauge' | 'liquidFill' | 'wordCloud';
export const ChartTypeList = [
    { key: 'Line', value: 'line' },
    { key: 'Bar', value: 'bar' },
    { key: 'Scatter', value: 'scatter' },
    { key: 'Gauge', value: 'gauge' },
    { key: 'Pie', value: 'pie' },
    { key: 'Liquid fill', value: 'liquidFill' },
    { key: 'Tql', value: 'tql' },
];
export const ChartThemeList = ['dark', 'white', 'vintage', 'macarons', 'infographic', 'shine', 'roma'];
export const ChartThemeBackgroundColor = {
    dark: '#100B2A',
    white: '#FFFFFF',
    vintage: '#FEF8F0',
    macarons: '#FFFFFF',
    infographic: '#FFFFFF',
    shine: '#FFFFFF',
    roma: '#FFFFFF',
} as { [key: string]: string };
export const ChartXAxisTypeList = ['category', 'time'];
export const ChartSeriesColorList = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#FADE2A'];
export const ChartTooltipTriggerList = ['item', 'axis'];
export const ChartLegendTopList = ['top', 'center', 'bottom'];
export const ChartLegendLeftList = ['left', 'center', 'right'];
export const ChartLegendOrientList = ['horizontal', 'vertical'];
export const ChartSymbolList = ['circle', 'rect', 'roundRect', 'triangle', 'diamond', 'pin', 'arrow'];

export const ChartAxisTooltipFormatter = (aUnit?: string, aDecimals?: number) => {
    return (
        `function (params) {` +
        `const d = new Date(0);` +
        `d.setUTCSeconds(params[0].name / 1000);` +
        `let output = params[0].name === '' ? params[0].axisValueLabel : d.toLocaleString('en-GB', { timezone: 'UTC' }) + '<br/>';` +
        `output += '<table>';` +
        `params.reverse().forEach(function (param) {` +
        `output += '<tr><td>' + param.marker + '</td><td>' + param.seriesName + '&ensp;</td><td><b>' + param.data[1]${aDecimals ? '.toFixed(' + aDecimals + ')' : ''} ${
            aUnit ? "+ ' " + aUnit.replaceAll("'", '"') + "'" : ''
        } + '</b></td></tr>';` +
        `});` +
        `return output + '</table>';` +
        `}`
    );
};

export const ChartItemTooltipFormatter = (aUnit?: string, aDecimals?: number) => {
    return (
        `function (params) {` +
        `let d = new Date(0);` +
        `d.setUTCSeconds(params.data[0] / 1000);` +
        `let output = d.toLocaleString('en-GB', { timezone: 'UTC' }) + '<br/>';` +
        `output += '<table>'; ` +
        `output += '<tr><td>'+params.marker+'</td><td>' + params.seriesName + '&ensp;</td><td><b>' + params.data[1]${aDecimals ? '.toFixed(' + aDecimals + ')' : ''} ${
            aUnit ? "+ ' " + aUnit.replaceAll("'", '"') + "'" : ''
        } +'&ensp;</b>` +
        `</tr>'; return output + '</table>';}`
    );
};

// react grid layout value
export const GRID_LAYOUT_COLS = 36;
export const GRID_LAYOUT_ROW_HEIGHT = 30;

// tag color
export const TagColorList = ['#73BF69', '#F2CC0C', '#8AB8FF', '#FF780A', '#F2495C', '#5794F2', '#B877D9', '#705DA0', '#37872D', '#FDA1FF', '#7B64FF', '#999999'];
