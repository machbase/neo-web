import '../panel/PanelHeader.scss';
import { Refresh, LuTimerReset, MdRawOn } from '@/assets/icons/Icon';
import { Button } from '@/design-system/components';
import type { PanelPresentationState } from '../panel/TagAnalyzerPanelTypes';

const PanelEditorPreviewHeader = ({
    pPresentationState,
    pOnToggleRaw,
    pOnRefreshData,
    pOnRefreshTime,
}: {
    pPresentationState: PanelPresentationState;
    pOnToggleRaw: () => void;
    pOnRefreshData: () => void;
    pOnRefreshTime: () => void;
}) => {
    return (
        <div className="panel-header">
            <div className="title">{pPresentationState.title}</div>
            <div className="time">
                {pPresentationState.timeText}
                <span> {!pPresentationState.isRaw && pPresentationState.intervalText && ` ( interval : ${pPresentationState.intervalText} )`}</span>
            </div>
            <Button.Group>
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent={!pPresentationState.isRaw ? 'Enable raw data mode' : 'Disable raw data mode'}
                    icon={
                        <MdRawOn size={16} style={{ color: pPresentationState.isRaw ? '#fdb532 ' : '', height: '32px', width: '32px' }} />
                    }
                    onClick={pOnToggleRaw}
                    style={{ minWidth: '36px' }}
                />
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent={'Refresh data'}
                    icon={<Refresh size={14} />}
                    onClick={pOnRefreshData}
                />
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent={'Refresh time'}
                    icon={<LuTimerReset size={16} style={{ marginTop: '-1px' }} />}
                    onClick={pOnRefreshTime}
                />
            </Button.Group>
        </div>
    );
};

export default PanelEditorPreviewHeader;
