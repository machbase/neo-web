// issue #1452 — the App Store's report on the individual files and directories
// the local scan refused.
//
// Before this, the scan filed these findings and NOTHING read them. A server with
// `neo-pkg-opcua-client-main/`, `neo-pkg-replication-1.0.5/` and `stage/` unpacked
// by hand showed exactly what a clean server shows — the directories simply had no
// card and no explanation, so the operator's only signal was a package that was
// obviously installed refusing to appear in the list.
//
// NOT CatalogStatusIcon, AND NOT PART OF IT. That indicator answers ONE question
// about the catalog as a whole — did the hub answer? — and returns null when it
// did. These findings have the opposite scope and an independent lifetime: a
// manually extracted directory is just as broken on a fully online server, and the
// fifty zips in the archive directory can be individually unreadable while the hub
// leg is perfectly healthy. Folding this into the indicator would have hidden every
// one of those behind `state === 'online'`. The two share the panel; they share no
// state.
//
// This is also why the header-icon treatment that replaced the catalog banner does
// NOT apply here: a counted list of named files with a remedy each cannot be said
// in one glyph and a tooltip.
//
// THE MESSAGES ARE THE SCAN'S OWN, VERBATIM. Each one already ends in the action
// to take ("Remove it and install through the App Store so the install script
// runs"), so there is no second copy of the remedy here to drift out of sync with
// the rule that produced it.

import { useState } from 'react';
import { VscWarning } from 'react-icons/vsc';
import type { LocalArchiveScanError } from '@/api/repository/onpremCatalog';
import { formatWarningTitle, formatWarningToggle, resolveArchiveWarnings } from './archiveWarningState';

export interface ArchiveScanWarningsProps {
    /** The scan's findings, straight off `gCatalogScanWarnings`. */
    pWarnings: LocalArchiveScanError[] | undefined;
}

/**
 * Pure presentation over `resolveArchiveWarnings`; the only local state is the
 * user's expand/collapse choice, which nothing outside this component cares about.
 *
 * Renders NOTHING when there is nothing to report — no empty frame, no "no
 * problems found" line. A clean server must look clean.
 */
export const ArchiveScanWarnings = ({ pWarnings }: ArchiveScanWarningsProps) => {
    const [sExpanded, setExpanded] = useState<boolean>(false);
    const { visible, hiddenCount, total } = resolveArchiveWarnings(pWarnings, sExpanded);
    if (total === 0) return null;

    // Collapsing back is only offered once the list has actually been expanded —
    // otherwise a 2-item list would carry a "Show less" that does nothing.
    const showToggle = hiddenCount > 0 || sExpanded;

    return (
        <div className="app-store-scan-warnings" role="status">
            <div className="app-store-scan-warnings-head">
                <span className="app-store-scan-warnings-icon">
                    <VscWarning />
                </span>
                <span className="app-store-scan-warnings-title">{formatWarningTitle(total)}</span>
                {showToggle && (
                    <button type="button" className="app-store-scan-warnings-toggle" onClick={() => setExpanded((prev) => !prev)}>
                        {formatWarningToggle(hiddenCount)}
                    </button>
                )}
            </div>
            <ul className="app-store-scan-warnings-list">
                {visible.map((line) => (
                    // `title` carries the untruncated text: the subject is a file
                    // name that can be longer than this side panel is wide, and the
                    // message names the directory a second time.
                    <li key={line.key} className="app-store-scan-warnings-item" title={`${line.subject} — ${line.message}`}>
                        <span className="app-store-scan-warnings-subject">{line.subject}</span>
                        <span className="app-store-scan-warnings-message">{line.message}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};
