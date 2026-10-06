import { extractionExtension } from '@/utils';
import { GroupItem } from './groupModel';

/** Tint of an item's tile: files by type (the explorer's icon colours), everything else by kind. */
const FILE_COLORS: Record<string, string> = { dsh: '#fc7676', sql: '#f5c142', tql: '#5fb85f', taz: '#3fb8af', wrk: '#4d95f2', md: '#5aa0f0' };
const KIND_COLORS: Record<string, string> = {
    folder: '#f5c142',
    package: '#b48ef0',
    timer: '#ff9f43',
    bridge: '#4d95f2',
    shell: '#a3a3a3',
    table: '#3fb8af',
    token: '#e5c07b',
    cert: '#56b6c2',
};
export const appColor = (aItem: Pick<GroupItem, 'kind' | 'ref'>) =>
    aItem.kind === 'file' ? FILE_COLORS[extractionExtension(aItem.ref)] ?? '#9a9a9a' : KIND_COLORS[aItem.kind] ?? '#9a9a9a';
