import { VARIABLE_TYPE } from '@/components/dashboard/variable';
import { VariableParser } from './DashboardQueryParser';

export interface BlockTimeType {
    interval: {
        IntervalType: string;
        IntervalValue: number;
    };
    start: any;
    end: any;
}

export const replaceVariablesInTql = (
    tqlString: string,
    variables: VARIABLE_TYPE[],
    timeContext: BlockTimeType
): string => {
    if (!variables || variables.length === 0) {
        return tqlString;
    }
    
    const parsedVariables = VariableParser(variables, timeContext);
    let processedTql = tqlString;
    
    parsedVariables.forEach(variable => {
        processedTql = processedTql.replaceAll(variable.regEx, variable.value);
    });
    
    return processedTql;
};