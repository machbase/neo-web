import type { Dispatch, SetStateAction } from 'react';
import type { OverlapPanelInfo } from '../utils/boardTypes';
import type {
    ChartSeriesItem,
    SelectedRangeSeriesSummary,
} from '../utils/series/PanelSeriesTypes';
import type { IntervalOption } from '../utils/time/types/TimeTypes';
import type { PersistedPanelInfoV200 } from '../utils/persistence/TazPanelPersistenceTypes';

export type FFTModalOption = {
    value: string;
    label: string;
    data: SelectedRangeSeriesSummary;
};

export type FFTModalProps = {
    pSeriesSummaries: SelectedRangeSeriesSummary[];
    pStartTime: number;
    pEndTime: number;
    setIsOpen: (aValue: boolean) => void;
};

export type CreateChartModalProps = {
    isOpen: boolean;
    onClose: () => void;
    pOnAppendPanel: (aPanel: PersistedPanelInfoV200) => void;
    pTables: string[];
};

export type MinMaxBounds = {
    minNanos: number;
    maxNanos: number;
};

export type OverlapInterval = IntervalOption;

export type OverlapLoadResult = {
    startTime: number | undefined;
    chartSeries: ChartSeriesItem | undefined;
};

export type OverlapModalProps = {
    pSetIsModal: Dispatch<SetStateAction<boolean>>;
    pPanelsInfo: OverlapPanelInfo[];
    pRollupTableList: string[];
};
