import { VARIABLE_TYPE } from '../components/variable';
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
    // Sort variables by key length (desc) to avoid partial overlap issues
    const parsedVariables = VariableParser(variables, timeContext).sort((a: any, b: any) => b.key.length - a.key.length);
    let processedTql = tqlString;
    
    parsedVariables.forEach(variable => {
        processedTql = processedTql.replaceAll(variable.regEx, variable.value);
    });
    
    return processedTql;
};
