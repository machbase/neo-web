import { E_TQL_MAP } from '..';

export enum E_TQL_GROUP_UTILS {
    BY = 'BY',
    TIMEWINDOW = 'TIMEWINDOW',
    TIME = 'TIME',
    PERIOD = 'PERIOD',
    LAST = 'LAST',
}
const TIMEWINDOW = (from: string, to: string, period: string) => {
    return `timewindow(time(${from}000000), time(${to}000000), period('${period}'))`;
};
const BY = (valueList: string | string[]) => {
    return `by(${valueList})`;
};
const LAST = (value: string) => {
    return `last(${value})`;
};
/** GROUP NODE */
const GROUP = (valueList: string | string[]) => {
    return `${E_TQL_MAP.GROUP}(${valueList})`;
};

GROUP.By = BY;
GROUP.Timewindow = TIMEWINDOW;
GROUP.Last = LAST;
export default GROUP;
