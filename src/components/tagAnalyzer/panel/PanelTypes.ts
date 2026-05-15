import type { FFTSelectionPayload } from '../domain/ChartDataModel';

export type {
    PanelChartHandle,
    PanelChartState,
    PanelCreateAnnotationRequest,
    PanelHighlightEditRequest,
    PanelMarkupHandlers,
    PanelNavigateState,
    PanelNavigatorShiftActions,
    PanelOverlayModeState,
    PanelRangeChangeEvent,
    PanelRangeHandlers,
    PanelRangeShiftActions,
    PanelSeriesAnnotationEditRequest,
    PanelVisibleSeriesItem,
    PanelZoomActions,
} from '../domain/PanelChartModel';

export type PanelHeaderCommand =
    | { type: 'toggle-overlap' }
    | { type: 'toggle-raw' }
    | { type: 'set-global-time' }
    | { type: 'refresh-data' }
    | { type: 'refresh-time' }
    | { type: 'open-export-csv' }
    | { type: 'open-delete-confirm' };

export type PanelHeaderCommandDispatch = (
    command: PanelHeaderCommand,
) => void;

export type PanelActiveDialog =
    | {
          type: 'fft';
          selection: FFTSelectionPayload;
      }
    | { type: 'deletePanel' }
    | { type: 'exportCsv' };

export type PanelOverlayModeCommand =
    | { type: 'toggle-highlight' }
    | { type: 'toggle-annotation' }
    | { type: 'toggle-drag-select' }
    | { type: 'toggle-edit' }
    | { type: 'open-fft' }
    | { type: 'close-annotation' }
    | { type: 'close-edit' };

export type PanelOverlayModeDispatch = (
    command: PanelOverlayModeCommand,
) => void;

export type PanelHeaderState = {
    title: string;
    timeText: string;
    intervalText: string;
    isRaw: boolean;
    canOpenFft: boolean;
    canSetGlobalTime: boolean;
    canSaveLocal: boolean;
};

