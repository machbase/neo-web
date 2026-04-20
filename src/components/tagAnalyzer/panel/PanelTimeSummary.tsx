import type { PanelPresentationState } from '../utils/PanelTypes';

/**
 * Renders the shared time and interval summary used by board and preview panel headers.
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
