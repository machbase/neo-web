// Variable types and interfaces
export interface VARIABLE_ITEM_TYPE {
    value: string;
    label?: string;
}

export interface VARIABLE_TYPE {
    id: string;
    label: string;
    valueList: VARIABLE_ITEM_TYPE[];
    use: VARIABLE_ITEM_TYPE;
}

export type VARIABLE_LIST_TYPE = VARIABLE_TYPE[];