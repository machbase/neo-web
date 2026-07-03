import type { PanelSeriesDefinition } from '../../../../domain/SeriesDomain';

export type LegacyCompatibleSeriesConfig = {
    key: string;
    table: string;
    alias: string;
    calculationMode: string;
    color?: string | undefined;
    id: string | undefined;
    sourceColumns?: PanelSeriesDefinition['sourceColumns'];
    columnNames?: PanelSeriesDefinition['sourceColumns'];
    sourceTagName?: string;
    tagName?: string;
    colName?: PanelSeriesDefinition['sourceColumns'];
    use_y2: 'Y' | 'N';
    onRollup?: boolean;
    [key: string]: unknown;
};
