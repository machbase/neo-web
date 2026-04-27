import type { PanelSeriesConfig } from '../../series/PanelSeriesTypes';

export type LegacyTagNameItem<T extends { sourceTagName: string | undefined }> = Omit<
    T,
    'sourceTagName'
> & {
    tagName: string;
};

export type LegacyCompatibleSeriesConfig = {
    key: string;
    table: string;
    alias: string;
    calculationMode: string;
    color?: string | undefined;
    id: string | undefined;
    sourceColumns?: PanelSeriesConfig['sourceColumns'];
    columnNames?: PanelSeriesConfig['sourceColumns'];
    sourceTagName?: string;
    tagName?: string;
    colName?: PanelSeriesConfig['sourceColumns'];
    use_y2: 'Y' | 'N';
    onRollup?: boolean;
    [key: string]: unknown;
};
