// Variable types and interfaces
export interface VARIABLE_ITEM_TYPE {
    value: string;
    label?: string;
}

export interface VARIABLE_TYPE {
    id: string;
    key: string;
    label: string;
    valueList: VARIABLE_ITEM_TYPE[];
    use: VARIABLE_ITEM_TYPE;
}

export type VARIABLE_LIST_TYPE = VARIABLE_TYPE[];

export enum VARIABLE_DEFAULT_TYPE {
    DEFAULT_DEFINED = 'DEFAULT_DEFINED',
}
const defaultVariableList: string[] = ['from_str', 'from_s', 'from_ms', 'from_us', 'from_ns', 'to_str', 'to_s', 'to_ms', 'to_us', 'to_ns', 'period', 'period_unit', 'period_value'];
export const DEFAULT_VARIABLE_LIST: VARIABLE_TYPE[] = defaultVariableList.map((defaultVariable) => {
    return {
        id: `default_variable-${defaultVariable}`,
        label: defaultVariable,
        key: `{{${defaultVariable}}}`,
        type: 'SELECT',
        use: {
            id: `default_variable-${defaultVariable}-value`,
            type: VARIABLE_DEFAULT_TYPE.DEFAULT_DEFINED,
            value: '',
        },
        valueList: [
            {
                id: `default_variable-${defaultVariable}-value`,
                type: VARIABLE_DEFAULT_TYPE.DEFAULT_DEFINED,
                value: '',
            },
        ],
    };
});