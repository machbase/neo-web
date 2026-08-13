// issue #1452 — the scan files findings; these pin that they actually reach the
// screen, and that they do so on their OWN terms rather than the banner's.

import { fireEvent, render, screen } from '@testing-library/react';
import { ArchiveScanWarnings } from './ArchiveScanWarnings';
import { CatalogStatusIcon } from './CatalogStatusIcon';
import { formatWarningTitle, formatWarningToggle, MAX_VISIBLE_WARNINGS, resolveArchiveWarnings, SCAN_SUBJECT_FALLBACK } from './archiveWarningState';
import type { LocalArchiveScanError } from '@/api/repository/onpremCatalog';

/** A finding shaped exactly as the scan files it. */
const warn = (archive: string, error: string): LocalArchiveScanError => ({ archive, error });

/** N distinct findings, so a folded list can be told apart line by line. */
const manyWarnings = (count: number): LocalArchiveScanError[] =>
    Array.from({ length: count }, (_, i) => warn(`pkg-${i}.zip`, `problem number ${i}`));

describe('resolveArchiveWarnings', () => {
    test('nothing filed ⇒ nothing to show, for both empty and absent input', () => {
        expect(resolveArchiveWarnings([])).toEqual({ visible: [], hiddenCount: 0, total: 0 });
        expect(resolveArchiveWarnings(undefined)).toEqual({ visible: [], hiddenCount: 0, total: 0 });
    });

    test('a short list is shown whole, with nothing hidden', () => {
        const view = resolveArchiveWarnings([warn('a.zip', 'unsupported compression'), warn('b.zip', 'zip: not a valid zip file')]);
        expect(view.total).toBe(2);
        expect(view.hiddenCount).toBe(0);
        expect(view.visible.map((l) => l.message)).toEqual(['unsupported compression', 'zip: not a valid zip file']);
    });

    // The count in the header is the whole point of folding; visible + hidden must
    // reconstruct it exactly or the summary lies about how much is left.
    test('over the cap: only MAX_VISIBLE_WARNINGS render and the remainder is counted', () => {
        const view = resolveArchiveWarnings(manyWarnings(MAX_VISIBLE_WARNINGS + 3));
        expect(view.visible).toHaveLength(MAX_VISIBLE_WARNINGS);
        expect(view.hiddenCount).toBe(3);
        expect(view.total).toBe(MAX_VISIBLE_WARNINGS + 3);
        expect(view.visible.length + view.hiddenCount).toBe(view.total);
    });

    test('expanded shows every line and hides none', () => {
        const view = resolveArchiveWarnings(manyWarnings(MAX_VISIBLE_WARNINGS + 3), true);
        expect(view.visible).toHaveLength(MAX_VISIBLE_WARNINGS + 3);
        expect(view.hiddenCount).toBe(0);
    });

    // An empty `archive` is the scan saying the scan itself failed, not one file.
    test('a finding with no archive is named after the scan rather than left blank', () => {
        const view = resolveArchiveWarnings([warn('', 'archive scan failed')]);
        expect(view.visible[0].subject).toBe(SCAN_SUBJECT_FALLBACK);
    });

    // Identical records are legal — the scan filed two findings, so two are shown
    // and the total says two. Collapsing them would make the header disagree.
    test('duplicate records are NOT merged; the total matches what the scan filed', () => {
        const view = resolveArchiveWarnings([warn('a.zip', 'same'), warn('a.zip', 'same')]);
        expect(view.total).toBe(2);
        expect(view.visible.map((l) => l.key)).toEqual(['0', '1']);
    });

    test('a record with no message text is dropped — it could only render as a blank line', () => {
        const view = resolveArchiveWarnings([warn('a.zip', '   '), warn('b.zip', 'real problem')]);
        expect(view.total).toBe(1);
        expect(view.visible[0].subject).toBe('b.zip');
    });
});

describe('formatWarningTitle / formatWarningToggle', () => {
    test('the count reads correctly at one and at many', () => {
        expect(formatWarningTitle(1)).toBe('1 archive problem');
        expect(formatWarningTitle(3)).toBe('3 archive problems');
    });

    test('the toggle states how much is hidden, and offers the way back once nothing is', () => {
        expect(formatWarningToggle(2)).toBe('+2 more');
        expect(formatWarningToggle(0)).toBe('Show less');
    });
});

describe('ArchiveScanWarnings', () => {
    test('no warnings ⇒ renders nothing at all; a clean server looks clean', () => {
        const { container } = render(<ArchiveScanWarnings pWarnings={[]} />);
        expect(container).toBeEmptyDOMElement();
    });

    test('an undefined list (nothing has scanned yet) also renders nothing', () => {
        const { container } = render(<ArchiveScanWarnings pWarnings={undefined} />);
        expect(container).toBeEmptyDOMElement();
    });

    test('one warning renders its subject and its message verbatim', () => {
        render(<ArchiveScanWarnings pWarnings={[warn('broken.zip', 'zip: not a valid zip file')]} />);
        expect(screen.getByText('broken.zip')).toBeInTheDocument();
        expect(screen.getByText('zip: not a valid zip file')).toBeInTheDocument();
        expect(screen.getByText('1 archive problem')).toBeInTheDocument();
    });

    // The three findings a real server produces today (manual extraction of
    // opcua-client, replication and `stage`) must all be legible, remedy included.
    test('several warnings each render, remedy text and all', () => {
        render(
            <ArchiveScanWarnings
                pWarnings={[
                    warn('neo-pkg-opcua-client-main', '"neo-pkg-opcua-client-main" contains package "neo-pkg-opcua-client" — looks manually extracted. Remove it and install through the App Store so the install script runs.'),
                    warn('neo-pkg-replication-1.0.5', '"neo-pkg-replication-1.0.5" contains package "neo-pkg-replication" — looks manually extracted. Remove it and install through the App Store so the install script runs.'),
                    warn('stage', '"stage" contains package "neo-pkg-opcua-client" — looks manually extracted. Remove it and install through the App Store so the install script runs.'),
                ]}
            />
        );
        expect(screen.getByText('3 archive problems')).toBeInTheDocument();
        expect(screen.getByText('neo-pkg-opcua-client-main')).toBeInTheDocument();
        expect(screen.getByText('neo-pkg-replication-1.0.5')).toBeInTheDocument();
        expect(screen.getByText('stage')).toBeInTheDocument();
        expect(screen.getAllByText(/Remove it and install through the App Store/)).toHaveLength(3);
        // Under the cap, so nothing folds and no disclosure control appears.
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    test('over the cap: the header states the true total and the rest folds behind "+N more"', () => {
        render(<ArchiveScanWarnings pWarnings={manyWarnings(MAX_VISIBLE_WARNINGS + 2)} />);
        expect(screen.getByText(formatWarningTitle(MAX_VISIBLE_WARNINGS + 2))).toBeInTheDocument();
        expect(screen.getAllByRole('listitem')).toHaveLength(MAX_VISIBLE_WARNINGS);
        expect(screen.getByRole('button', { name: '+2 more' })).toBeInTheDocument();
        // The folded ones are genuinely absent, not merely hidden with CSS.
        expect(screen.queryByText(`problem number ${MAX_VISIBLE_WARNINGS + 1}`)).not.toBeInTheDocument();
    });

    test('pressing "+N more" reveals every warning, and collapsing puts them back', () => {
        render(<ArchiveScanWarnings pWarnings={manyWarnings(MAX_VISIBLE_WARNINGS + 2)} />);
        fireEvent.click(screen.getByRole('button', { name: '+2 more' }));
        expect(screen.getAllByRole('listitem')).toHaveLength(MAX_VISIBLE_WARNINGS + 2);
        expect(screen.getByText(`problem number ${MAX_VISIBLE_WARNINGS + 1}`)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Show less' }));
        expect(screen.getAllByRole('listitem')).toHaveLength(MAX_VISIBLE_WARNINGS);
    });
});

// THE CONTRACT THIS FEATURE EXISTS FOR. The findings describe individual files, so
// they must survive a perfectly healthy hub — `CatalogStatusIcon` returns null at
// `mode: 'online'`, and hanging the warnings off that (or off any other catalog
// status) would make the most common real case invisible. Both components are
// rendered together as the panel renders them.
describe('scan warnings are independent of the catalog status indicator', () => {
    test('mode "online": the indicator says nothing, and the warnings are still on screen', () => {
        render(
            <>
                <CatalogStatusIcon pStatus={{ mode: 'online' }} pEntryCount={7} />
                <ArchiveScanWarnings pWarnings={[warn('stage', '"stage" contains package "neo-pkg-opcua-client" — looks manually extracted. Remove it and install through the App Store so the install script runs.')]} />
            </>
        );
        // The indicator rendered nothing at all — none of its copy is on screen…
        expect(screen.queryByRole('status', { name: /hub unreachable|Local-only|Catalog unavailable/ })).not.toBeInTheDocument();
        // …and the finding is on screen.
        expect(screen.getByText('stage')).toBeInTheDocument();
        expect(screen.getByText('1 archive problem')).toBeInTheDocument();
    });

    test('offline: indicator AND warnings render together — one is not a substitute for the other', () => {
        render(
            <>
                <CatalogStatusIcon pStatus={{ mode: 'offline', hubError: 'network down' }} pEntryCount={2} />
                <ArchiveScanWarnings pWarnings={[warn('half.zip', 'incomplete package.json (name/version missing)')]} />
            </>
        );
        expect(screen.getByRole('status', { name: 'Offline — hub unreachable' })).toBeInTheDocument();
        expect(screen.getByText('incomplete package.json (name/version missing)')).toBeInTheDocument();
    });

    test('an online server with no findings shows neither', () => {
        const { container } = render(
            <>
                <CatalogStatusIcon pStatus={{ mode: 'online' }} pEntryCount={7} />
                <ArchiveScanWarnings pWarnings={[]} />
            </>
        );
        expect(container).toBeEmptyDOMElement();
    });
});
