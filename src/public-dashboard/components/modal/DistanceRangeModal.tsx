import { useEffect, useState } from 'react';
import { Calendar } from '@/assets/icons/Icon';
import { Modal, Toast } from '@/design-system/components';
import DistanceRangeTab from '@/components/modal/DistanceRangeTab';
import { fetchBlockBaseMinMax } from '../../utils/dashboardBaseMinMax';
import { isNumericBaseTimeBlock } from '@/utils/timeFieldColumns';
import { isDistanceEdgeSet } from '@/utils/distanceRange';

interface DistanceRangeModalProps {
    pBoardInfo: any;
    /** Writes the board's kind-separated distance range; the panels re-query off it. */
    pOnApply: (aRange: { start: number | string; end: number | string }) => void;
    pOnClose: () => void;
}

/**
 * The public view's distance range editor.
 *
 * The editor body is the same `DistanceRangeTab` the dashboard draws — the shell is separate only
 * because this view keeps its board in local state rather than in the editor's recoil atoms, which
 * is the same reason its time modal is a copy rather than the editor's.
 */
const DistanceRangeModal = ({ pBoardInfo, pOnApply, pOnClose }: DistanceRangeModalProps) => {
    const sRange = pBoardInfo?.dashboard?.distanceRange ?? {};
    // The board's first distance panel is the reference extent, the same rule the dashboard header uses.
    const sDistancePanel = pBoardInfo?.dashboard?.panels?.find((aPanel: any) => aPanel.type !== 'Tql chart' && isNumericBaseTimeBlock(aPanel.blockList?.[0]));

    const [sBounds, setBounds] = useState<{ min: number; max: number }>({ min: 0, max: 0 });
    const [sFrom, setFrom] = useState<number | string>(isDistanceEdgeSet(sRange.start) ? sRange.start : 0);
    const [sTo, setTo] = useState<number | string>(isDistanceEdgeSet(sRange.end) ? sRange.end : 0);
    const [sNotice, setNotice] = useState<string>('');

    useEffect(() => {
        if (!sDistancePanel) return;
        let sCancelled = false;
        (async () => {
            const sFetched = await fetchBlockBaseMinMax(sDistancePanel.blockList?.[0]);
            if (sCancelled || !sFetched) return;
            setBounds(sFetched);
            // Unset edges open on the extent, which is what the panels are already showing.
            if (!isDistanceEdgeSet(sRange.start)) setFrom(sFetched.min);
            if (!isDistanceEdgeSet(sRange.end)) setTo(sFetched.max);
        })();
        return () => {
            sCancelled = true;
        };
    }, []);

    const handleApply = () => {
        if (sNotice) {
            Toast.error(sNotice);
            return;
        }
        const sBothNumeric = typeof sFrom === 'number' && typeof sTo === 'number';
        pOnApply({
            start: sBothNumeric ? Math.min(sFrom as number, sTo as number) : sFrom,
            end: sBothNumeric ? Math.max(sFrom as number, sTo as number) : sTo,
        });
        pOnClose();
    };

    return (
        <Modal.Root isOpen={true} onClose={pOnClose}>
            <Modal.Header>
                <Modal.Title>
                    <Calendar />
                    Distance Range
                </Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body>
                <DistanceRangeTab
                    pBounds={sBounds}
                    pFrom={sFrom}
                    pTo={sTo}
                    pOnChange={(aFrom, aTo) => {
                        setFrom(aFrom);
                        setTo(aTo);
                    }}
                    pOnResetToFull={() => {
                        pOnApply({ start: '', end: '' });
                        pOnClose();
                    }}
                    pOnValidityChange={setNotice}
                />
            </Modal.Body>
            <Modal.Footer>
                <Modal.Confirm onClick={handleApply}>Apply</Modal.Confirm>
                <Modal.Cancel>Cancel</Modal.Cancel>
            </Modal.Footer>
        </Modal.Root>
    );
};

export default DistanceRangeModal;
