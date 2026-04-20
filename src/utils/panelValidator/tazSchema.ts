import { RequiredKeyDef } from './types';

export const VALID_TAZ_CHART_TYPES = ['Line', 'Zone', 'Dot'];

export const TAZ_PANEL_REQUIRED: RequiredKeyDef[] = [
    { key: 'index_key', defaultFactory: () => String(Date.now() + Math.floor(Math.random() * 1000)) },
    { key: 'chart_title', default: 'New chart' },
    { key: 'tag_set', default: [] },
    { key: 'chart_type', default: 'Line' },
    { key: 'range_bgn', default: '' },
    { key: 'range_end', default: '' },
    { key: 'count', default: -1 },
    { key: 'interval_type', default: '' },
    { key: 'interval_value', default: 1 },
    { key: 'use_zoom', default: 'Y' },
    { key: 'show_point', default: 'N' },
    { key: 'point_radius', default: 0 },
    { key: 'stroke', default: 1.5 },
    { key: 'fill', default: 0.15 },
    { key: 'pixels_per_tick', default: 3 },
    { key: 'pixels_per_tick_raw', default: 0.1 },
    { key: 'use_time_keeper', default: 'N' },
    { key: 'time_keeper', default: { startPanelTime: 0, endPanelTime: 0, startNaviTime: 0, endNaviTime: 0 } },
    { key: 'raw_keeper', default: false },
    { key: 'use_sampling', default: false },
    { key: 'sampling_value', default: 0.01 },
    { key: 'zero_base', default: 'N' },
    { key: 'zero_base2', default: 'Y' },
    { key: 'use_right_y2', default: 'N' },
    { key: 'show_legend', default: 'Y' },
    { key: 'default_range', default: { min: 0, max: 0 } },
];

export function validateTagSetItem(tag: any): string[] {
    const repaired: string[] = [];
    if (!tag.key) {
        tag.key = String(Date.now() + Math.floor(Math.random() * 1000));
        repaired.push('key');
    }
    if (!tag.table && tag.table !== '') {
        tag.table = '';
        repaired.push('table');
    }
    if (!tag.tagName && tag.tagName !== '') {
        tag.tagName = '';
        repaired.push('tagName');
    }
    if (!tag.calculationMode) {
        tag.calculationMode = 'avg';
        repaired.push('calculationMode');
    }
    if (tag.alias === undefined) tag.alias = '';
    if (tag.weight === undefined) tag.weight = 1.0;
    if (tag.use_y2 === undefined) tag.use_y2 = 'N';
    if (!tag.colName || typeof tag.colName !== 'object') {
        tag.colName = { name: 'NAME', time: 'TIME', value: 'VALUE' };
        repaired.push('colName');
    }
    return repaired;
}
