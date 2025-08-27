import { VARIABLE_TYPE } from '@/components/dashboard/variable';
import moment from 'moment';
import { VariableParser } from './DashboardQueryParser';
import { VARIABLE_REGEX } from './CheckDataCompatibility';

export const TqlChartParser = (
    aTqlChartInfo: any,
    aTimeParams: { start: number | string; end: number | string },
    aInterval: { IntervalType: string; IntervalValue: number },
    aVariableList: VARIABLE_TYPE[]
) => {
    const timeConverter = (aTime: string | number, aReturnTypeString: boolean) => {
        if (aReturnTypeString) {
            const sTmpTime = new Date(aTime);
            return moment(sTmpTime).format('YYYY-MM-DD HH:mm:ss');
        } else return Math.floor((aTime as number) / 1000);
    };
    const valueConverter = (aValue: string) => {
        switch (aValue) {
            case '$from_str':
                return timeConverter(aTimeParams.start, true);
            case '$from_s':
                return timeConverter(aTimeParams.start, false);
            case '$from_ms':
                return (timeConverter(aTimeParams.start, false) as number) * 1000;
            case '$from_us':
                return (timeConverter(aTimeParams.start, false) as number) * 1000000;
            case '$from_ns':
                return (timeConverter(aTimeParams.start, false) as number) * 1000000000;
            case '$to_str':
                return timeConverter(aTimeParams.end, true);
            case '$to_s':
                return timeConverter(aTimeParams.end, false);
            case '$to_ms':
                return (timeConverter(aTimeParams.end, false) as number) * 1000;
            case '$to_us':
                return (timeConverter(aTimeParams.end, false) as number) * 1000000;
            case '$to_ns':
                return (timeConverter(aTimeParams.end, false) as number) * 1000000000;
            case '$period':
                return aInterval.IntervalValue + aInterval.IntervalType[0];
            case '$period_unit':
                return aInterval.IntervalType;
            case '$period_value':
                return aInterval.IntervalValue;
            default:
                return aValue;
        }
    };
    const paramsFilter = (aParamList: any, aVariableList: VARIABLE_TYPE[]) => {
        const parsedVariableList = VariableParser(aVariableList, { start: aTimeParams.start, end: aTimeParams.end, interval: aInterval });
        const useParamList = aParamList.filter((aParam: any) => aParam.name !== '' && aParam.value !== '');
        let parsedParamList = useParamList.map((bParam: any) => {
            if (HIDDEN_PARAM_LIST.includes(bParam.name)) return `${bParam.value}=${valueConverter(bParam.name)}`;
            else return `${bParam.value}=${bParam.name}`;
        });
        parsedParamList = parsedParamList.map((parsedParam: string) => {
            let tmpParam = parsedParam;
            if (parsedParam.match(VARIABLE_REGEX)) {
                const sortedVariables = parsedVariableList.sort((a, b) => b.key.length - a.key.length);
                sortedVariables.map((parsedVariable) => {
                    if (parsedParam.match(parsedVariable.regEx)) tmpParam = tmpParam.replaceAll(parsedVariable.regEx, parsedVariable.value);
                });
            }
            return tmpParam;
        });
        return `?${parsedParamList.join('&')}`;
    };

    const sResult = `${aTqlChartInfo.path}${paramsFilter(aTqlChartInfo.params, aVariableList)}`;
    return sResult;
};

export const HIDDEN_PARAM_LIST = [
    '$from_str',
    '$from_s',
    '$from_ms',
    '$from_us',
    '$from_ns',
    '$to_str',
    '$to_s',
    '$to_ms',
    '$to_us',
    '$to_ns',
    '$period',
    '$period_unit',
    '$period_value',
];

export const SHOW_PARAM_LIST = [
    '{{from_str}}',
    '{{from_s}}',
    '{{from_ms}}',
    '{{from_us}}',
    '{{from_ns}}',
    '{{to_str}}',
    '{{to_s}}',
    '{{to_ms}}',
    '{{to_us}}',
    '{{to_ns}}',
    '{{period}}',
    '{{period_unit}}',
    '{{period_value}}',
];
