export interface PanelValidationResult {
    panel: any;
    repaired: boolean;
    repairedKeys: string[];
    errors: string[];
    valid: boolean;
}

export interface RequiredKeyDef {
    key: string;
    default?: any;
    defaultFactory?: () => any;
}
