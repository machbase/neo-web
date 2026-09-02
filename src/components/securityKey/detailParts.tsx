// Shared pieces for the certificate and API-token detail views. Both credentials answer the same
// three questions — what is it, how long does it have left, and how do I use it — so they share the
// header, the validity bar and the fact cards rather than drifting apart.
import moment from 'moment';
import { CopyButton } from '@/design-system/components';
import { ClipboardCopy } from '@/utils/ClipboardCopy';
import styles from './detail.module.scss';

const DAY = 24 * 60 * 60;

export type ExpiryState = 'expired' | 'soon' | 'ok';

/** expiry bucket from a unix-seconds notAfter; 'soon' is the 30-day warning window */
export const expiryState = (aNotAfter: number): ExpiryState => {
    const sNow = Date.now() / 1000;
    if (aNotAfter <= sNow) return 'expired';
    if (aNotAfter - sNow <= 30 * DAY) return 'soon';
    return 'ok';
};

export const asDate = (aUnixSec: number): string => (aUnixSec ? moment.unix(aUnixSec).format('YYYY-MM-DD') : '—');
export const asDateTime = (aUnixSec: number): string => (aUnixSec ? moment.unix(aUnixSec).format('YYYY-MM-DD HH:mm:ss') : '—');

/**
 * Compact duration: exact days while that is the number a person acts on, then months, then years.
 * "412d left" tells nobody anything; "1.1y left" does.
 */
export const humanizeSpan = (aSeconds: number): string => {
    const sDays = Math.floor(Math.max(aSeconds, 0) / DAY);
    if (sDays <= 0) return 'under a day';
    if (sDays < 45) return `${sDays}d`;
    const sMonths = Math.round(sDays / 30.44);
    if (sMonths < 18) return `${sMonths}mo`;
    const sYears = sDays / 365.25;
    // a value that rounds cleanly reads as "10y", not "10.0y"
    return Math.abs(sYears - Math.round(sYears)) < 0.05 ? `${Math.round(sYears)}y` : `${sYears.toFixed(1)}y`;
};

/** state pill; renders nothing while the credential is healthy so it stays an exception marker */
export const StatusBadge = ({ pState, pNotAfter }: { pState: ExpiryState; pNotAfter: number }) => {
    if (pState === 'ok') return null;
    const sLeft = humanizeSpan(pNotAfter - Date.now() / 1000);
    return (
        <span className={`${styles.badge} ${styles[`badge--${pState}`]}`}>
            <span className={styles.badgeDot} />
            {pState === 'expired' ? 'EXPIRED' : `EXPIRING · ${sLeft}`}
        </span>
    );
};

/**
 * Lifetime spent vs left. The bar carries the proportion, the label carries the number — a bar alone
 * cannot say whether the sliver on the right is a week or a year.
 */
export const ValidityBar = ({ pFrom, pTo, pState }: { pFrom: number; pTo: number; pState: ExpiryState }) => {
    const sNow = Date.now() / 1000;
    const sTotal = Math.max(pTo - pFrom, 1);
    const sElapsed = Math.min(Math.max(sNow - pFrom, 0), sTotal);
    const sPercent = Math.round((sElapsed / sTotal) * 100);
    const sLeftLabel = pState === 'expired' ? 'expired' : `${humanizeSpan(pTo - sNow)} left of ${humanizeSpan(sTotal)}`;
    return (
        <>
            <div className={styles.validityHead}>
                <span className={styles.validityLabel}>
                    <span className={styles.validityTitle}>Validity</span>
                    <span className={styles.validityLeft}>{sLeftLabel}</span>
                </span>
                <span className={styles.validityRange}>
                    {asDate(pFrom)} → {asDate(pTo)}
                </span>
            </div>
            <div className={styles.bar} role="img" aria-label={`${sPercent}% of the validity period elapsed`}>
                <div className={`${styles.barFill} ${pState !== 'ok' ? styles[`barFill--${pState}`] : ''}`} style={{ width: `${sPercent}%` }} />
            </div>
        </>
    );
};

export const FactRow = ({ pLabel, pValue, pTone, pMono, pCopy }: { pLabel: string; pValue: string; pTone?: ExpiryState; pMono?: boolean; pCopy?: boolean }) => (
    <div className={styles.factRow}>
        <span className={styles.factLabel}>{pLabel}</span>
        <span className={styles.factValueRow}>
            <span className={`${styles.factValue} ${pMono ? styles.mono : ''} ${pTone && pTone !== 'ok' ? styles[`factValue--${pTone}`] : ''}`}>{pValue}</span>
            {/* ghost/icon so the affordance sits beside the value instead of becoming a primary action */}
            {pCopy && <CopyButton size="icon" variant="ghost" onClick={() => ClipboardCopy(pValue)} aria-label={`Copy ${pLabel}`} />}
        </span>
    </div>
);

export const UsageBlock = ({ pWhere, pCode }: { pWhere: string; pCode: string }) => (
    <>
        <div className={styles.usageHead}>
            <span className={styles.usageTitle}>Used for</span>
            <span className={styles.usageWhere}>{pWhere}</span>
        </div>
        <div className={styles.code}>{pCode}</div>
    </>
);

export { styles as detailStyles };
