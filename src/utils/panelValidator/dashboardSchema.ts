import { generateUUID } from '@/utils';
import { DefaultCommonOption, DefaultXAxisOption, DefaultYAxisOption, getDefaultSeriesOption } from '@/utils/eChartHelper';
import { ChartType } from '@/type/eChart';
import { RequiredKeyDef } from './types';

// Display name normalization (old/internal → canonical display name)
export const TYPE_ALIASES: Record<string, string> = {
    Tql: 'Tql chart',
};

export const VALID_TYPES = ['Line', 'Bar', 'Scatter', 'Adv scatter', 'Gauge', 'Pie', 'Liquid fill', 'Text', 'Geomap', 'Tql chart', 'Video'];

// Chart types that require blockList processing in CheckDataCompatibility
export const BLOCK_CHART_TYPES = new Set(['Line', 'Bar', 'Scatter', 'Adv scatter', 'Gauge', 'Pie', 'Liquid fill', 'Text', 'Geomap']);

// Chart types that require xAxisOptions/yAxisOptions processing in CheckDataCompatibility
export const AXIS_CHART_TYPES = new Set(['Line', 'Bar', 'Scatter', 'Adv scatter', 'Gauge', 'Pie', 'Liquid fill', 'Text', 'Geomap']);

// Keys required by ALL dashboard panel types
export const BASE_REQUIRED: RequiredKeyDef[] = [
    { key: 'id', defaultFactory: () => generateUUID() },
    { key: 'title', default: 'New chart' },
    { key: 'titleColor', default: '' },
    { key: 'theme', default: 'dark' },
    { key: 'w', default: 7 },
    { key: 'h', default: 7 },
    { key: 'x', default: 0 },
    { key: 'y', default: 0 },
    { key: 'timeRange', default: { start: '', end: '', refresh: 'Off' } },
    { key: 'useCustomTime', default: false },
    { key: 'transformBlockList', default: [] },
];

// Helper to generate standard chart type keys (for types using block + axis)
const standardChartKeys = (chartType: string): RequiredKeyDef[] => [
    { key: 'blockList', default: [] },
    { key: 'xAxisOptions', defaultFactory: () => [structuredClone(DefaultXAxisOption)] },
    { key: 'yAxisOptions', defaultFactory: () => [structuredClone(DefaultYAxisOption)] },
    { key: 'commonOptions', defaultFactory: () => structuredClone(DefaultCommonOption) },
    { key: 'chartOptions', defaultFactory: () => structuredClone(getDefaultSeriesOption(chartType as ChartType)) },
];

// Type-specific required keys
export const TYPE_SPECIFIC_KEYS: Record<string, RequiredKeyDef[]> = {
    Line: standardChartKeys('line'),
    Bar: standardChartKeys('bar'),
    Scatter: standardChartKeys('scatter'),
    'Adv scatter': standardChartKeys('advScatter'),
    Gauge: standardChartKeys('gauge'),
    Pie: standardChartKeys('pie'),
    'Liquid fill': standardChartKeys('liquidFill'),
    Text: standardChartKeys('text'),
    Geomap: standardChartKeys('geomap'),
    'Tql chart': [
        { key: 'tqlInfo', default: { tql: '', param: [] } },
        { key: 'chartOptions', defaultFactory: () => structuredClone(getDefaultSeriesOption('tql' as ChartType)) },
        { key: 'commonOptions', defaultFactory: () => structuredClone(DefaultCommonOption) },
    ],
    Video: [{ key: 'chartOptions', defaultFactory: () => structuredClone(getDefaultSeriesOption('video' as ChartType)) }],
};

// Type-specific deep validation (nested key checks + cross-field consistency)
export const TYPE_DEEP_VALIDATORS: Record<string, (panel: any) => string[]> = {
    Geomap: (panel) => {
        const repaired: string[] = [];
        const blockLen = panel.blockList?.length ?? 0;
        const co = panel.chartOptions;

        if (!Array.isArray(co.coorLat)) {
            co.coorLat = Array(blockLen).fill(0);
            repaired.push('chartOptions.coorLat');
        }
        if (!Array.isArray(co.coorLon)) {
            co.coorLon = Array(blockLen).fill(1);
            repaired.push('chartOptions.coorLon');
        }
        if (!Array.isArray(co.marker)) {
            co.marker = Array.from({ length: blockLen }, () => ({ shape: 'circle', radius: 150 }));
            repaired.push('chartOptions.marker');
        }

        // Pad arrays to match blockList length
        while (co.coorLat.length < blockLen) co.coorLat.push(0);
        while (co.coorLon.length < blockLen) co.coorLon.push(1);
        while (co.marker.length < blockLen) co.marker.push({ shape: 'circle', radius: 150 });

        if (co.useAutoRefresh === undefined) {
            co.useAutoRefresh = true;
            repaired.push('chartOptions.useAutoRefresh');
        }
        if (co.tooltipTime === undefined) {
            co.tooltipTime = true;
            repaired.push('chartOptions.tooltipTime');
        }
        if (co.tooltipCoor === undefined) {
            co.tooltipCoor = false;
            repaired.push('chartOptions.tooltipCoor');
        }
        if (co.intervalType === undefined) {
            co.intervalType = 'none';
            repaired.push('chartOptions.intervalType');
        }
        if (co.intervalValue === undefined) {
            co.intervalValue = '';
            repaired.push('chartOptions.intervalValue');
        }

        return repaired;
    },

    Text: (panel) => {
        const repaired: string[] = [];
        const co = panel.chartOptions;
        if (!Array.isArray(co.textSeries)) {
            co.textSeries = [0];
            repaired.push('chartOptions.textSeries');
        }
        if (!Array.isArray(co.chartSeries)) {
            co.chartSeries = [0];
            repaired.push('chartOptions.chartSeries');
        }
        if (co.fontSize === undefined) {
            co.fontSize = 100;
            repaired.push('chartOptions.fontSize');
        }
        if (co.digit === undefined) {
            co.digit = 3;
            repaired.push('chartOptions.digit');
        }
        if (co.unit === undefined) {
            co.unit = '';
            repaired.push('chartOptions.unit');
        }
        return repaired;
    },

    Video: (panel) => {
        const repaired: string[] = [];
        const co = panel.chartOptions;
        if (!co.source || typeof co.source !== 'object') {
            co.source = { table: '', camera: '', serverIp: '', serverPort: 0, serverAlias: '', liveModeOnStart: false, enableSync: false };
            repaired.push('chartOptions.source');
        }
        if (!co.event || typeof co.event !== 'object') {
            co.event = {};
            repaired.push('chartOptions.event');
        }
        if (!co.dependent || typeof co.dependent !== 'object') {
            co.dependent = { panels: [], color: '#009CE0' };
            repaired.push('chartOptions.dependent');
        }
        if (co.childBoard === undefined) {
            co.childBoard = '';
            repaired.push('chartOptions.childBoard');
        }
        return repaired;
    },
};

// BlockList item structural validation
export function validateBlockItem(block: any): string[] {
    const repaired: string[] = [];
    if (block.table === undefined || block.table === null) {
        block.table = '';
        repaired.push('table');
    }
    if (block.type === undefined) {
        block.type = 'tag';
        repaired.push('type');
    }
    if (block.time === undefined) {
        block.time = block.type === 'log' ? '_ARRIVAL_TIME' : 'TIME';
        repaired.push('time');
    }
    if (block.aggregator === undefined) {
        block.aggregator = 'avg';
        repaired.push('aggregator');
    }
    if (!Array.isArray(block.filter)) {
        block.filter = [];
        repaired.push('filter');
    }
    if (!Array.isArray(block.values)) {
        block.values = [{ id: generateUUID(), alias: '', value: 'VALUE', aggregator: 'avg' }];
        repaired.push('values');
    }
    if (block.useCustom === undefined) {
        block.useCustom = false;
        repaired.push('useCustom');
    }
    if (block.customFullTyping === undefined) {
        block.customFullTyping = { use: false, text: '' };
        repaired.push('customFullTyping');
    }
    if (block.isValidMath === undefined) block.isValidMath = true;
    if (block.isVisible === undefined) block.isVisible = true;
    return repaired;
}
