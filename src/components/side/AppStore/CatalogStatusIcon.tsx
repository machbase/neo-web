// issue #1452 — the App Store's one honest statement about where its catalog came
// from, as a single icon in the panel header.
//
// Before this, a server behind an air gap looked identical to a server whose hub
// simply had nothing new: the panel just showed fewer cards. Operators had no way
// to tell "these are all the packages" from "the hub is unreachable and you are
// looking at the local archive directory".
//
// WHY AN ICON AND NOT A BANNER
// ----------------------------
// This started as a full-width banner. In a side panel that is ~260px wide the
// banner ate three lines of vertical space that the package list needs, and its
// Retry button was a straight duplicate of the header's Refresh — same handler,
// same `resetPkgHubBackoff()`. Both problems disappear if the statement is one
// glyph on the row that already carries Refresh: no extra height at all, and no
// second control that could drift from the first.
//
// So: NO BUTTON HERE, ever. The explanation lives in the `title` tooltip, and the
// action lives in the Refresh button two elements to the left.
//
// The states, their derivation AND their copy live in ./catalogState — this file
// stays component-only, the same split archiveWarningState.ts / ArchiveScanWarnings.tsx
// uses. One of the states, `localOnly`, is NOT a problem report: the hub was
// switched off on purpose and this indicator exists there purely to make an
// otherwise invisible mode visible.
//
// Deliberately NOT behind the experiment gate: air-gapped sites are the audience
// for this whole feature, and they are the least likely to run with experiment
// mode on.
//
// Deliberately NOT claiming any integrity guarantee. JSH has no hash function, so
// the offline install path cannot verify a sha256 — wording like "verified" here
// would promise something the product does not do. It says where the data came
// from and nothing more.

import { MdCloudOff } from 'react-icons/md';
import { VscShield, VscWarning } from 'react-icons/vsc';
import type { CatalogStatus } from '@/recoil/appStore';
import { CATALOG_STATUS_LABEL, formatCatalogTooltip, resolveCatalogState } from './catalogState';

export interface CatalogStatusIconProps {
    pStatus: CatalogStatus | undefined;
    /** Number of cards the merge produced. 0 + hub failure ⇒ nothing to show. */
    pEntryCount: number;
}

/**
 * Pure presentation, and one icon tall: it sits in the header row next to Refresh,
 * so anything that changed its height would push the package list down on every
 * air-gapped server.
 *
 * A `<span>`, not a `<button>` — there is no action here (see the header note),
 * and it keeps the element clear of the global `button { border-radius: 8px }` in
 * src/index.css.
 */
export const CatalogStatusIcon = ({ pStatus, pEntryCount }: CatalogStatusIconProps) => {
    const state = resolveCatalogState(pStatus, pEntryCount);
    if (state === 'online') return null;

    // A shield, not a cloud-off: local-only is a posture the server holds, and the
    // disconnection iconography belongs to the states where something broke.
    // 12, not 14, and not by eye: the box is pinned to 16px so it lands in the
    // chevron column that keeps PACKAGES aligned with CATALOG (see index.scss), so
    // the only room left between the glyph and the title is whatever the glyph
    // does NOT fill. At 14 these are wide, solid marks and they read as touching
    // the P. Growing the box or padding the title would move the text off x=20 and
    // break the alignment this sizing exists to protect.
    const icon = state === 'localOnly' ? <VscShield size={12} /> : state === 'failed' ? <VscWarning size={12} /> : <MdCloudOff size={12} />;

    return (
        <span
            className={`app-store-catalog-status app-store-catalog-status--${state}`}
            role="status"
            aria-label={CATALOG_STATUS_LABEL[state]}
            title={formatCatalogTooltip(state, pStatus)}
        >
            {icon}
        </span>
    );
};
