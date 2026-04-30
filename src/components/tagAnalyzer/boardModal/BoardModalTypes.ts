import type {
    ChartSeriesData,
} from '../chart/ChartDataTypes';
import type { SelectedRangeSeriesSummary } from '../chart/ChartSeriesSummaryTypes';
import type { IntervalOption } from '../time/TimeTypes';
import type { PersistedPanelInfoV200 } from '../persistence/TazPersistenceTypesV200';

export type FFTModalOption = {
    value: string;
    label: string;
    data: SelectedRangeSeriesSummary;
};

export type FFTSelectionPayload = {
    seriesSummaries: SelectedRangeSeriesSummary[];
    startTime: number;
    endTime: number;
};

export type FFTModalProps = {
    pSeriesSummaries: FFTSelectionPayload['seriesSummaries'];
    pStartTime: FFTSelectionPayload['startTime'];
    pEndTime: FFTSelectionPayload['endTime'];
    setIsOpen: (value: boolean) => void;
};

export type CreateChartModalProps = {
    isOpen: boolean;
    onClose: () => void;
    pOnAppendPanel: (panel: PersistedPanelInfoV200) => void;
    pTables: string[];
};

export type OverlapInterval = IntervalOption;

export type OverlapLoadResult = {
    startTime: number | undefined;
    chartSeries: ChartSeriesData | undefined;
};

