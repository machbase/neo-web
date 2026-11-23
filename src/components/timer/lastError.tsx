import moment from 'moment';
import { Page } from '@/design-system/components';
import { FORMAT_FULL_DATE } from '@/utils/constants';
import styles from './lastError.module.scss';

/** `lastErrorAt` (RFC3339 with the server's offset) in local time, '' when it does not parse. */
const formatLastErrorAt = (aAt?: string): string => {
    if (!aAt) return '';
    const sAt = moment(aAt, moment.ISO_8601);
    return sAt.isValid() ? sAt.format(FORMAT_FULL_DATE) : '';
};

/**
 * The most recent task failure, as the server keeps it — a record, not the timer's state: it stays
 * after later runs succeed and after a restart, so it always looks the same and says nothing about
 * whether the timer runs (the switch and its badge say that). Nothing when there is no failure on record.
 */
export const TimerLastError = ({ pLastError, pLastErrorAt }: { pLastError?: string; pLastErrorAt?: string }) => {
    if (!pLastError) return null;
    const sAt = formatLastErrorAt(pLastErrorAt);

    return (
        <Page.ContentBlock>
            <Page.ContentTitle>Last Error</Page.ContentTitle>
            <div data-testid="timer-last-error">
                {sAt && (
                    <div className={styles.at} data-testid="timer-last-error-at">
                        {sAt}
                    </div>
                )}
                <pre className={styles.message}>{pLastError}</pre>
            </div>
        </Page.ContentBlock>
    );
};
