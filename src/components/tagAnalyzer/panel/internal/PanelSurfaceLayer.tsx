import type { MutableRefObject } from 'react';
import { ConfirmModal } from '@/components/modal/ConfirmModal';
import { SavedToLocalModal } from '@/components/modal/SavedToLocal';
import type { PanelChartHandle } from '../../chart/PanelChart';
import {
    filterChartDataByRange,
    type ChartSeriesData,
} from '../../chart/chartData';
import { EditAnnotationModal, EditHighlightModal } from '../../tools/MarkupModals';
import type { AxisRange } from '../../range/rangeModel';
import type { PanelInfo } from '../panelModel';
import { PanelContextMenu } from './PanelContextMenu';
import type { PanelActionKey, PanelActionState } from './panelActions';
import type {
    PanelSurface,
} from './panelInteraction';

type PanelSurfaceLayerProps = {
    surface: PanelSurface | undefined;
    panelInfo: PanelInfo;
    actionState: PanelActionState;
    isNumericXAxis: boolean;
    mainChartData: ChartSeriesData[];
    renderMainRange: AxisRange | undefined;
    panelChartApiRef: MutableRefObject<PanelChartHandle | null>;
    onPanelAction: (actionKey: PanelActionKey) => void;
    onApplyPanelInfo: (panelInfo: PanelInfo) => void;
    onDeletePanel: () => void;
    onDismiss: (surfaceId: number) => void;
};

export function PanelSurfaceLayer({
    surface,
    panelInfo,
    actionState,
    isNumericXAxis,
    mainChartData,
    renderMainRange,
    panelChartApiRef,
    onPanelAction,
    onApplyPanelInfo,
    onDeletePanel,
    onDismiss,
}: PanelSurfaceLayerProps) {
    if (!surface) return null;

    switch (surface.kind) {
        case 'contextMenu':
            return (
                <PanelContextMenu
                    actionState={actionState}
                    onAction={onPanelAction}
                    position={surface.position}
                    onClose={() => onDismiss(surface.id)}
                />
            );
        case 'highlightEditor': {
            const { session } = surface;
            const key = session.kind === 'create'
                ? `create-${session.initialHighlight.timeRange.start}-${session.initialHighlight.timeRange.end}`
                : `edit-${session.highlightIndex}`;
            return (
                <EditHighlightModal
                    key={key}
                    session={session}
                    highlights={panelInfo.highlights}
                    onChange={(highlights) =>
                        onApplyPanelInfo({ ...panelInfo, highlights })
                    }
                    onClose={() => onDismiss(surface.id)}
                    isNumericXAxis={isNumericXAxis}
                />
            );
        }
        case 'annotationEditor':
            return (
                <EditAnnotationModal
                    key={surface.session.kind === 'create'
                        ? 'new'
                        : surface.session.annotationIndex}
                    session={surface.session}
                    annotations={panelInfo.annotations}
                    annotationSeriesList={panelInfo.query.tagSet}
                    onChange={(annotations) =>
                        onApplyPanelInfo({ ...panelInfo, annotations })
                    }
                    onClose={() => onDismiss(surface.id)}
                    isNumericXAxis={isNumericXAxis}
                />
            );
        case 'deleteConfirm':
            return (
                <ConfirmModal
                    pIsDarkMode
                    setIsOpen={(isOpen) =>
                        !isOpen && onDismiss(surface.id)
                    }
                    pCallback={onDeletePanel}
                    pContents={
                        <div className="body-content">
                            Do you want to delete this panel?
                        </div>
                    }
                />
            );
        case 'exportCsv':
            return renderMainRange ? (
                <SavedToLocalModal
                    pPanelInfo={filterChartDataByRange(
                        mainChartData,
                        renderMainRange,
                    )}
                    pChartRef={panelChartApiRef}
                    pIsDarkMode
                    setIsOpen={(isOpen) =>
                        !isOpen && onDismiss(surface.id)
                    }
                />
            ) : null;
    }
}
