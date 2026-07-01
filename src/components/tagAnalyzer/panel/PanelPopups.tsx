import type { RefObject } from 'react';
import { ConfirmModal } from '@/components/modal/ConfirmModal';
import { SavedToLocalModal } from '@/components/modal/SavedToLocal';
import type { ContextMenuPosition } from '@/design-system/components';
import { FFTModal } from '../boardModal/FFTModal';
import type { ChartSeriesData, FFTSelectionPayload } from '../domain/ChartDomain';
import type { PanelSeriesDefinition } from '../domain/SeriesDomain';
import type { PanelHighlight } from '../domain/panel/PanelConfig';
import type { PanelChartHandle } from '../domain/panel/PanelActions';
import {
    PanelContextMenu,
    type PanelActionKey,
    type PanelHeaderRuntimeState,
} from './PanelHeader';
import {
    EditAnnotationModal,
    type AnnotationEditorMetaState,
    type PanelAnnotationActions,
} from './modal/EditAnnotationModal';
import {
    EditHighlightModal,
    type HighlightEditorState,
    type PanelHighlightActions,
} from './modal/EditHighlightModal';
import { SelectionSummaryPopover } from './modal/SelectionSummaryPopover';

export enum PanelPopupMode {
    NONE = 'NONE',
    CONTEXT_MENU = 'CONTEXT_MENU',
    FFT = 'FFT',
    HIGHLIGHT_EDITOR = 'HIGHLIGHT_EDITOR',
    ANNOTATION_EDITOR = 'ANNOTATION_EDITOR',
    DELETE_CONFIRM = 'DELETE_CONFIRM',
    EXPORT_CSV = 'EXPORT_CSV',
}

type CreateHighlightPopupState = {
    mode: PanelPopupMode.HIGHLIGHT_EDITOR;
    editor: Extract<HighlightEditorState, { mode: 'create' }>;
    draftHighlight: PanelHighlight;
};

type EditHighlightPopupState = {
    mode: PanelPopupMode.HIGHLIGHT_EDITOR;
    editor: Extract<HighlightEditorState, { mode: 'edit' }>;
    draftHighlight?: undefined;
};

type HighlightPopupState = CreateHighlightPopupState | EditHighlightPopupState;

export type PanelPopupState =
    | { mode: PanelPopupMode.NONE }
    | { mode: PanelPopupMode.CONTEXT_MENU; position: ContextMenuPosition }
    | { mode: PanelPopupMode.FFT; selection: FFTSelectionPayload }
    | HighlightPopupState
    | {
          mode: PanelPopupMode.ANNOTATION_EDITOR;
          editorMeta: AnnotationEditorMetaState;
      }
    | { mode: PanelPopupMode.DELETE_CONFIRM }
    | { mode: PanelPopupMode.EXPORT_CSV };

export type PanelSelectionSummary = {
    selection: FFTSelectionPayload;
    popoverPosition: { x: number; y: number };
};

type PanelPopupsProps = {
    popupState: PanelPopupState;
    panelHeaderRuntimeState: PanelHeaderRuntimeState;
    onPanelAction: (actionKey: PanelActionKey) => void;
    isNumericXAxis: boolean;
    selectionSummary: PanelSelectionSummary | undefined;
    highlightActions: PanelHighlightActions;
    annotationActions: PanelAnnotationActions;
    annotationSeriesList: PanelSeriesDefinition[];
    onClosePopup: (popupMode: PanelPopupMode) => void;
    onCloseSelectionSummary: () => void;
    onOpenFft: () => void;
    onDeletePanel: () => void;
    chartData: ChartSeriesData[];
    panelChartApiRef: RefObject<PanelChartHandle | null>;
};

export function PanelPopups({
    popupState,
    panelHeaderRuntimeState,
    onPanelAction,
    isNumericXAxis,
    selectionSummary,
    highlightActions,
    annotationActions,
    annotationSeriesList,
    onClosePopup,
    onCloseSelectionSummary,
    onOpenFft,
    onDeletePanel,
    chartData,
    panelChartApiRef,
}: PanelPopupsProps) {
    return (
        <>
            {popupState.mode === PanelPopupMode.CONTEXT_MENU && (
                <PanelContextMenu
                    runtimeState={panelHeaderRuntimeState}
                    onAction={onPanelAction}
                    position={popupState.position}
                    onClose={() => onClosePopup(PanelPopupMode.CONTEXT_MENU)}
                />
            )}
            {popupState.mode === PanelPopupMode.FFT && (
                <FFTModal
                    pSeriesSummaries={popupState.selection.seriesSummaries}
                    pStartTime={popupState.selection.startTime}
                    pEndTime={popupState.selection.endTime}
                    pIsNumericXAxis={isNumericXAxis}
                    setIsOpen={(isOpen) => {
                        if (!isOpen) {
                            onClosePopup(PanelPopupMode.FFT);
                        }
                    }}
                />
            )}
            {selectionSummary !== undefined && (
                <SelectionSummaryPopover
                    selection={selectionSummary.selection}
                    position={selectionSummary.popoverPosition}
                    isNumericXAxis={isNumericXAxis}
                    onOpenFft={onOpenFft}
                    onClose={onCloseSelectionSummary}
                />
            )}
            {popupState.mode === PanelPopupMode.HIGHLIGHT_EDITOR && (
                <EditHighlightModal
                    key={getHighlightEditorKey(popupState)}
                    activeHighlightEditor={popupState.editor}
                    draftHighlight={popupState.draftHighlight}
                    highlightActions={highlightActions}
                    onCancel={() => onClosePopup(PanelPopupMode.HIGHLIGHT_EDITOR)}
                    onApplied={() => onClosePopup(PanelPopupMode.HIGHLIGHT_EDITOR)}
                    isNumericXAxis={isNumericXAxis}
                />
            )}
            {popupState.mode === PanelPopupMode.ANNOTATION_EDITOR && (
                <EditAnnotationModal
                    key={popupState.editorMeta.annotationIndex ?? 'new'}
                    annotationEditorMeta={popupState.editorMeta}
                    annotationActions={annotationActions}
                    annotationSeriesList={annotationSeriesList}
                    onCancel={() => onClosePopup(PanelPopupMode.ANNOTATION_EDITOR)}
                    onApplied={() => onClosePopup(PanelPopupMode.ANNOTATION_EDITOR)}
                    isNumericXAxis={isNumericXAxis}
                />
            )}
            {popupState.mode === PanelPopupMode.DELETE_CONFIRM && (
                <ConfirmModal
                    pIsDarkMode
                    setIsOpen={(isOpen) => {
                        if (!isOpen) {
                            onClosePopup(PanelPopupMode.DELETE_CONFIRM);
                        }
                    }}
                    pCallback={onDeletePanel}
                    pContents={
                        <div className="body-content">Do you want to delete this panel?</div>
                    }
                />
            )}
            {popupState.mode === PanelPopupMode.EXPORT_CSV && (
                <SavedToLocalModal
                    pPanelInfo={chartData}
                    pChartRef={panelChartApiRef}
                    pIsDarkMode
                    setIsOpen={(isOpen) => {
                        if (!isOpen) {
                            onClosePopup(PanelPopupMode.EXPORT_CSV);
                        }
                    }}
                />
            )}
        </>
    );
}

function getHighlightEditorKey(popupState: HighlightPopupState): string {
    if (popupState.draftHighlight !== undefined) {
        const { draftHighlight } = popupState;
        return `create-${draftHighlight.timeRange.startTime}-${draftHighlight.timeRange.endTime}`;
    }

    return `edit-${popupState.editor.highlightIndex}`;
}
