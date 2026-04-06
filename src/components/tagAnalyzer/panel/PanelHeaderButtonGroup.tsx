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
import type { TagAnalyzerPanelHeaderButtonGroupProps } from './TagAnalyzerPanelTypes';

// Renders the action button strip in the panel header.
// It keeps the Raw through Delete controls grouped away from the title and time display.
const PanelHeaderButtonGroup = ({
    pHeaderState,
    pHeaderActions,
    pCanUseSavedToLocal,
    pOnOpenSavedToLocal,
    pOnOpenDeleteConfirm,
}: TagAnalyzerPanelHeaderButtonGroupProps) => {
    const { getExperiment } = useExperiment();

    return (
        <Button.Group>
            <Button
                size="xsm"
                variant="ghost"
                isToolTip
                toolTipContent={!pHeaderState.isRaw ? 'Enable raw data mode' : 'Disable raw data mode'}
                icon={
                    <MdRawOn size={16} style={{ color: pHeaderState.isRaw ? '#fdb532 ' : '', height: '32px', width: '32px' }} />
                }
                onClick={pHeaderActions.onToggleRaw}
                style={{ minWidth: '36px' }}
            />
            {!pHeaderState.isEdit ? (
                <>
                    <Page.Divi />
                    <Button
                        size="xsm"
                        variant="ghost"
                        isToolTip
                        toolTipContent={'Drag data range'}
                        active={pHeaderState.isSelectionActive}
                        icon={<PiSelectionPlusBold size={16} style={{ color: pHeaderState.isSelectionActive ? '#f8f8f8' : '' }} />}
                        onClick={pHeaderActions.onToggleSelection}
                    />

                    {pHeaderState.canOpenFft ? (
                        <Button
                            size="xsm"
                            variant="ghost"
                            isToolTip
                            toolTipContent={'FFT chart'}
                            icon={<LineChart size={16} />}
                            onClick={pHeaderActions.onOpenFft}
                        />
                    ) : null}
                </>
            ) : null}
            {!pHeaderState.isEdit ? (
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent={'Set global time'}
                    icon={<TbTimezone size={15} />}
                    onClick={pHeaderActions.onSetGlobalTime}
                />
            ) : null}
            <Button
                size="xsm"
                variant="ghost"
                isToolTip
                toolTipContent={'Refresh data'}
                icon={<Refresh size={14} />}
                onClick={pHeaderActions.onRefreshData}
            />
            <Button
                size="xsm"
                variant="ghost"
                isToolTip
                toolTipContent={'Refresh time'}
                icon={<LuTimerReset size={16} style={{ marginTop: '-1px' }} />}
                onClick={pHeaderActions.onRefreshTime}
            />
            {!pHeaderState.isEdit ? (
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent={'Edit'}
                    icon={<GearFill size={14} />}
                    onClick={pHeaderActions.onOpenEdit}
                />
            ) : null}
            {!pHeaderState.isEdit && getExperiment() && pCanUseSavedToLocal ? (
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent={'Saved to local'}
                    icon={<Download size={16} />}
                    onClick={pOnOpenSavedToLocal}
                />
            ) : null}
            {!pHeaderState.isEdit ? (
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
