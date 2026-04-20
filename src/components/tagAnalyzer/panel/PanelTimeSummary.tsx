import type { PanelPresentationState } from '../utils/panelRuntimeTypes';

/**
 * Renders the shared time and interval summary used by board and preview panel headers.
 * Intent: Keep the header's time readout small and reusable across panel shells.
 * @param pPresentationState The derived panel presentation state.
 * @returns The time summary block for the panel header.
 */
const PanelTimeSummary = ({
    pPresentationState,
}: {
    pPresentationState: Pick<PanelPresentationState, 'timeText' | 'intervalText' | 'isRaw'>;
}) => {
    return (
        <div className="time">
            {pPresentationState.timeText}
            <span>
                {' '}
                {!pPresentationState.isRaw &&
                    pPresentationState.intervalText &&
                    ` ( interval : ${pPresentationState.intervalText} )`}
            </span>
        </div>
    );
};

export default PanelTimeSummary;
