import {
    Refresh,
    GearFill,
    Delete,
    MdRawOn,
    PiSelectionPlusBold,
    LineChart,
    LuTimerReset,
    Download,
    TbTimezone,
} from '@/assets/icons/Icon';
import { useExperiment } from '@/hooks/useExperiment';
import { Button, Page } from '@/design-system/components';
import type { PanelActionHandlers, PanelPresentationState, PanelRefreshHandlers } from './PanelTypes';

// Renders the action button strip in the panel header.
// It keeps the Raw through Delete controls grouped away from the title and time display.
const PanelHeaderButtonGroup = ({
    pPresentationState,
    pActionHandlers,
    pRefreshHandlers,
    pCanUseSavedToLocal,
    pOnOpenSavedToLocal,
    pOnOpenDeleteConfirm,
}: {
    pPresentationState: PanelPresentationState;
    pActionHandlers: PanelActionHandlers;
    pRefreshHandlers: PanelRefreshHandlers;
    pCanUseSavedToLocal: boolean;
    pOnOpenSavedToLocal: () => void;
    pOnOpenDeleteConfirm: (e: React.MouseEvent) => void;
}) => {
    const { getExperiment } = useExperiment();

    return (
        <Button.Group>
            <Button
                size="xsm"
                variant="ghost"
                isToolTip
                toolTipContent={!pPresentationState.isRaw ? 'Enable raw data mode' : 'Disable raw data mode'}
                icon={
                    <MdRawOn size={16} style={{ color: pPresentationState.isRaw ? '#fdb532 ' : '', height: '32px', width: '32px' }} />
                }
                onClick={pActionHandlers.onToggleRaw}
                style={{ minWidth: '36px' }}
            />
            {!pPresentationState.isEdit ? (
                <>
                    <Page.Divi />
                    <Button
                        size="xsm"
                        variant="ghost"
                        isToolTip
                        toolTipContent={'Select data range for stats and FFT'}
                        active={pPresentationState.isDragSelectActive}
                        icon={<PiSelectionPlusBold size={16} style={{ color: pPresentationState.isDragSelectActive ? '#f8f8f8' : '' }} />}
                        onClick={pActionHandlers.onToggleDragSelect}
                    />

                    {pPresentationState.canOpenFft ? (
                        <Button
                            size="xsm"
                            variant="ghost"
                            isToolTip
                            toolTipContent={'FFT chart'}
                            icon={<LineChart size={16} />}
                            onClick={pActionHandlers.onOpenFft}
                        />
                    ) : null}
                </>
            ) : null}
            {!pPresentationState.isEdit ? (
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent={'Set global time'}
                    icon={<TbTimezone size={15} />}
                    onClick={pActionHandlers.onSetGlobalTime}
                />
            ) : null}
            <Button
                size="xsm"
                variant="ghost"
                isToolTip
                toolTipContent={'Refresh data'}
                icon={<Refresh size={14} />}
                onClick={pRefreshHandlers.onRefreshData}
            />
            <Button
                size="xsm"
                variant="ghost"
                isToolTip
                toolTipContent={'Refresh time'}
                icon={<LuTimerReset size={16} style={{ marginTop: '-1px' }} />}
                onClick={pRefreshHandlers.onRefreshTime}
            />
            {!pPresentationState.isEdit ? (
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent={'Edit'}
                    icon={<GearFill size={14} />}
                    onClick={pActionHandlers.onOpenEdit}
                />
            ) : null}
            {!pPresentationState.isEdit && getExperiment() && pCanUseSavedToLocal ? (
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent={'Saved to local'}
                    icon={<Download size={16} />}
                    onClick={pOnOpenSavedToLocal}
                />
            ) : null}
            {!pPresentationState.isEdit ? (
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent={'Delete'}
                    icon={<Delete size={16} />}
                    onClick={pOnOpenDeleteConfirm}
                />
            ) : null}
        </Button.Group>
    );
};

export default PanelHeaderButtonGroup;
