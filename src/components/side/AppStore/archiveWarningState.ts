// issue #1452 — what the App Store says about INDIVIDUAL archives and installed
// directories the local scan could not accept. Pure derivation, kept out of
// ArchiveScanWarnings.tsx so the folding rule can be asserted directly and the
// .tsx stays component-only (same split as catalogState.ts / CatalogStatusIcon.tsx).
//
// THIS MODULE DOES NOT DECIDE WHAT IS WRONG. Every record arrives already judged
// by the scan (`getLastArchiveScanErrors`, onpremCatalog.ts) — manual extraction,
// unsupported compression, an archive that would not open, no root package.json,
// a name+version collision, an incomplete package.json. The only decisions made
// here are presentational: what to skip because it would render as a blank line,
// how many to show at once, and what to call the rest.

import type { LocalArchiveScanError } from '@/api/repository/onpremCatalog';

/**
 * How many warnings are shown before the list folds.
 *
 * FOUR, because the panel this sits in is a narrow side bar above the catalog:
 * the list is a heads-up, not the workspace, and pushing the package cards below
 * the fold to report on files nobody asked about is a worse failure than making
 * the fifth problem one click away. Four also covers the real servers seen so far
 * (three manual extractions) without ever folding in the common case.
 */
export const MAX_VISIBLE_WARNINGS = 4;

/** One warning, ready to render. */
export interface ArchiveWarningLine {
    /** React key. Index-based on purpose — see `resolveArchiveWarnings`. */
    key: string;
    /** The file or directory at fault, already substituted when the scan named none. */
    subject: string;
    /** The scan's own message. It ALREADY contains the remedy; do not rewrite it. */
    message: string;
}

/** The folded view of the whole warning list. */
export interface ArchiveWarningView {
    /** What to render right now — `MAX_VISIBLE_WARNINGS` of them, or all when expanded. */
    visible: ArchiveWarningLine[];
    /** How many `visible` leaves out. `0` ⇒ render no "more" affordance. */
    hiddenCount: number;
    /** Every renderable warning, so the header can state the real total. */
    total: number;
}

/**
 * What to call a warning with no `archive`.
 *
 * An empty `archive` is the scan's way of saying the scan ITSELF failed (TQL
 * unreachable, script error) rather than one file — see `LocalArchiveScanError`.
 * Rendering an empty subject there would read as a missing value; naming the
 * scan says which of the two happened.
 */
export const SCAN_SUBJECT_FALLBACK = 'Local archive scan';

/**
 * Fold the scan's warning records into a renderable list.
 *
 * NO DEDUPLICATION, AND NO REORDERING. Two records that look alike are two
 * findings the scan filed, and the header prints `total`: collapsing them would
 * make the count disagree with the scan, which is the one thing a diagnostics
 * list must never do. That is also why the React key is index-based — identical
 * records are legal here, so nothing derived from the content is unique.
 *
 * The ONE thing dropped is a record with no message text. There is no third
 * field to fall back on, so such a row could only render as a subject with a
 * blank explanation — strictly less informative than not claiming a finding at
 * all. The scan does not produce these; the guard is for a malformed script body.
 *
 * `pExpanded` is the user's disclosure state and nothing more: expanded shows
 * every line, collapsed shows the first `MAX_VISIBLE_WARNINGS`. `total` and
 * `hiddenCount` are computed over the SAME filtered list, so
 * `visible.length + hiddenCount === total` always holds.
 */
export const resolveArchiveWarnings = (pWarnings: LocalArchiveScanError[] | undefined, pExpanded = false): ArchiveWarningView => {
    const lines: ArchiveWarningLine[] = [];
    for (const warning of pWarnings ?? []) {
        const message = typeof warning?.error === 'string' ? warning.error.trim() : '';
        if (!message) continue;
        const archive = typeof warning?.archive === 'string' ? warning.archive.trim() : '';
        lines.push({ key: `${lines.length}`, subject: archive || SCAN_SUBJECT_FALLBACK, message });
    }
    const visible = pExpanded ? lines : lines.slice(0, MAX_VISIBLE_WARNINGS);
    return { visible, hiddenCount: lines.length - visible.length, total: lines.length };
};

/**
 * Header copy. Singular/plural matters here because the count IS the summary —
 * "1 archive problems" reads as a bug in the reporter and undermines the report.
 */
export const formatWarningTitle = (pTotal: number): string => `${pTotal} archive ${pTotal === 1 ? 'problem' : 'problems'}`;

/** Label of the disclosure control. Collapsed states how much is hidden; expanded offers the way back. */
export const formatWarningToggle = (pHiddenCount: number): string => (pHiddenCount > 0 ? `+${pHiddenCount} more` : 'Show less');
