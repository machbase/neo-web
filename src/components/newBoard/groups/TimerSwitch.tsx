import { useEffect, useState } from 'react';
import { Page, Toast } from '@/design-system/components';
import { isTimerRunningState, useTimerStateAction } from '@/components/timer/useTimerStateAction';
import { TimerItemType } from '@/api/repository/timer';
import { resMessage } from '@/utils/resMessage';
import { listResources } from './groupResources';

const findTimer = async (aRef: string, aFresh = false) => (await listResources('timer', aFresh)).find((aEntry) => aEntry.ref === aRef)?.raw as TimerItemType | undefined;

/** Told to every switch on the page when one of them changes a timer, so all of them show the same state. */
const TIMER_CHANGED = 'nb-timer-changed';

/**
 * Start or stop a timer from the New tab, with the same switch and the same command as the timer
 * panel. Renders nothing until the timer is found, so a deleted timer shows no switch.
 */
export const TimerSwitch = ({ pRef, pActive, pOnChange }: { pRef: string; pActive: boolean; pOnChange?: (aTimer: TimerItemType) => void }) => {
    const { toggleTimerState } = useTimerStateAction();
    const [sTimer, setTimer] = useState<TimerItemType | undefined>(undefined);
    const [sBusy, setBusy] = useState(false);

    useEffect(() => {
        if (!pActive) return;
        let sAlive = true;
        findTimer(pRef)
            .then((aTimer) => sAlive && setTimer(aTimer))
            .catch(() => undefined);
        return () => {
            sAlive = false;
        };
    }, [pRef, pActive]);

    useEffect(() => {
        const onChanged = (aEvent: Event) => {
            const { ref, timer } = (aEvent as CustomEvent<{ ref: string; timer: TimerItemType }>).detail;
            if (ref === pRef) setTimer(timer);
        };
        window.addEventListener(TIMER_CHANGED, onChanged);
        return () => window.removeEventListener(TIMER_CHANGED, onChanged);
    }, [pRef]);

    if (!sTimer) return null;
    const sOn = isTimerRunningState(sTimer.state);

    const toggle = async () => {
        if (sBusy) return;
        setBusy(true);
        try {
            const sResult = await toggleTimerState(sTimer);
            if (!sResult.success) {
                Toast.error(resMessage(sResult, 'Cannot connect to server'), { id: 'timer-command' });
                return;
            }
            // Re-read the list, and tell every switch showing this timer, so they all agree (only this
            // one changed before; another showed the old state until the tab was opened again).
            const sFresh = (await findTimer(pRef, true)) ?? sResult.updatedTimer;
            if (sFresh) {
                window.dispatchEvent(new CustomEvent(TIMER_CHANGED, { detail: { ref: pRef, timer: sFresh } }));
                pOnChange?.(sFresh);
            }
        } finally {
            setBusy(false);
        }
    };

    return (
        <span className="nb-timer-switch" title={sOn ? `Stop ${sTimer.name}` : `Start ${sTimer.name}`} data-testid="new-board-timer-switch" onClick={(aEvent) => aEvent.stopPropagation()}>
            <Page.Switch pState={sOn} pReadOnly={sBusy} pCallback={toggle} />
        </span>
    );
};
