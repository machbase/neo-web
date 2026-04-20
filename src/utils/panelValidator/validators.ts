import { PanelValidationResult, RequiredKeyDef } from './types';
import { TYPE_ALIASES, VALID_TYPES, BLOCK_CHART_TYPES, BASE_REQUIRED, TYPE_SPECIFIC_KEYS, TYPE_DEEP_VALIDATORS, validateBlockItem } from './dashboardSchema';
import { VALID_TAZ_CHART_TYPES, TAZ_PANEL_REQUIRED, validateTagSetItem } from './tazSchema';

function getDefault(def: RequiredKeyDef): any {
    if (def.defaultFactory) return def.defaultFactory();
    if (def.default !== undefined) return structuredClone(def.default);
    return undefined;
}

function repairKeys(target: any, defs: RequiredKeyDef[], repairedKeys: string[], errors: string[]): void {
    for (const def of defs) {
        if (target[def.key] === undefined || target[def.key] === null) {
            const defaultVal = getDefault(def);
            if (defaultVal === undefined) {
                errors.push(`Missing required field with no default: ${def.key}`);
            } else {
                target[def.key] = defaultVal;
                repairedKeys.push(def.key);
            }
        }
    }
}

export function validateAndRepairDashboardPanel(panel: any): PanelValidationResult {
    const repairedKeys: string[] = [];
    const errors: string[] = [];

    // Step 1: Validate & normalize type
    if (!panel.type) {
        errors.push('Missing required field: type');
        return { panel, repaired: false, repairedKeys, errors, valid: false };
    }
    if (TYPE_ALIASES[panel.type]) {
        panel.type = TYPE_ALIASES[panel.type];
        repairedKeys.push('type (normalized)');
    }
    if (!VALID_TYPES.includes(panel.type)) {
        errors.push(`Unknown chart type: '${panel.type}'`);
        return { panel, repaired: false, repairedKeys, errors, valid: false };
    }

    // Step 2: Repair base required keys
    repairKeys(panel, BASE_REQUIRED, repairedKeys, errors);

    // Step 3: Repair type-specific required keys
    const typeKeys = TYPE_SPECIFIC_KEYS[panel.type];
    if (typeKeys) {
        repairKeys(panel, typeKeys, repairedKeys, errors);
    }

    // Step 4: Validate blockList items (only for types that use blocks)
    if (BLOCK_CHART_TYPES.has(panel.type) && Array.isArray(panel.blockList)) {
        panel.blockList.forEach((block: any, idx: number) => {
            const blockRepairs = validateBlockItem(block);
            blockRepairs.forEach((e) => repairedKeys.push(`blockList[${idx}].${e}`));
        });
    }

    // Step 5: Deep type-specific validators
    const deepValidator = TYPE_DEEP_VALIDATORS[panel.type];
    if (deepValidator) {
        const deepRepairs = deepValidator(panel);
        repairedKeys.push(...deepRepairs);
    }

    // Step 6: Conditional key validation
    if (panel.useCustomTime && !panel.timeRange) {
        panel.timeRange = { start: '', end: '', refresh: 'Off' };
        repairedKeys.push('timeRange (conditional)');
    }

    return {
        panel,
        repaired: repairedKeys.length > 0,
        repairedKeys,
        errors,
        valid: errors.length === 0,
    };
}

export function validateAndRepairTazPanel(panel: any): PanelValidationResult {
    const repairedKeys: string[] = [];
    const errors: string[] = [];

    // Step 1: Validate chart_type
    if (panel.chart_type && !VALID_TAZ_CHART_TYPES.includes(panel.chart_type)) {
        panel.chart_type = 'Line';
        repairedKeys.push('chart_type (invalid → Line)');
    }

    // Step 2: Repair required keys
    repairKeys(panel, TAZ_PANEL_REQUIRED, repairedKeys, errors);

    // Step 3: Validate tag_set items
    if (Array.isArray(panel.tag_set)) {
        panel.tag_set.forEach((tag: any, idx: number) => {
            const tagRepairs = validateTagSetItem(tag);
            tagRepairs.forEach((e) => repairedKeys.push(`tag_set[${idx}].${e}`));
        });
    }

    // Step 4: Conditional validation
    if (panel.use_time_keeper === 'Y' && (!panel.time_keeper || typeof panel.time_keeper !== 'object')) {
        panel.time_keeper = { startPanelTime: 0, endPanelTime: 0, startNaviTime: 0, endNaviTime: 0 };
        repairedKeys.push('time_keeper (conditional)');
    }

    return {
        panel,
        repaired: repairedKeys.length > 0,
        repairedKeys,
        errors,
        valid: errors.length === 0,
    };
}
