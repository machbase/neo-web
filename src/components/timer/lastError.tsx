import moment from 'moment';
import { VscWarning } from '@/assets/icons/Icon';
import { Page } from '@/design-system/components';
import { FORMAT_FULL_DATE } from '@/utils/constants';
import { splitTimerState } from './useTimerStateAction';
import styles from './lastError.module.scss';

/** `lastErrorAt` (RFC3339 with the server's offset) in local time, '' when it does not parse. */
const formatLastErrorAt = (aAt?: string): string => {
    if (!aAt) return '';
    const sAt = moment(aAt, moment.ISO_8601);
    return sAt.isValid() ? sAt.format(FORMAT_FULL_DATE) : '';
};

/**
 * The most recent task failure. The server keeps it after later runs succeed, so it reads as a
 * record — neutral while the timer kept running, red only when the failure is the one that stopped
 * it (the server then appends it to the state). Nothing when there is no failure on record.
 */
export const TimerLastError = ({ pState, pLastError, pLastErrorAt }: { pState?: string; pLastError?: string; pLastErrorAt?: string }) => {
    if (!pLastError) return null;
    const sStopped = splitTimerState(pState).error !== '';
    const sAt = formatLastErrorAt(pLastErrorAt);

    return (
        <Page.ContentBlock>
            <Page.ContentTitle>Last Error</Page.ContentTitle>
            <div className={sStopped ? styles.stopped : undefined} data-testid="timer-last-error" data-stopped={sStopped}>
                <div className={styles.meta}>
                    {sStopped && <VscWarning aria-hidden />}
                    {sAt && <span data-testid="timer-last-error-at">{sAt}</span>}
                    <span className={styles.outcome}>{`${sAt ? '· ' : ''}${sStopped ? 'stopped the timer' : 'kept running'}`}</span>
                </div>
                <pre className={styles.message}>{pLastError}</pre>
            </div>
        </Page.ContentBlock>
    );
};
