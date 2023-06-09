const SELECT_THEME = '-- Select Theme --';
const NOT_YET = '-- Not yet defined --';

const DATA_TITLE = ['#', 'ID', 'Title', 'Action'];
const CALC_MODE = [
    { id: 'min', name: 'Min' },
    { id: 'max', name: 'Max' },
    { id: 'sum', name: 'Sum' },
    { id: 'cnt', name: 'Count' },
    { id: 'avg', name: 'Average' },
];
const MAX_TAG_COUNT = 12;

const DEFAULT_PREFERENCE = {
    IP: '127.0.0.1',
    PORT: '5657',
    font: '16',
    THEME: 'machIoTchartBlack',
    TIMEOUT: 20000,
};

export { SELECT_THEME, NOT_YET, DATA_TITLE, CALC_MODE, MAX_TAG_COUNT, DEFAULT_PREFERENCE };
