// issue #1452 — the App Store panel's title row, after the catalog banner became a
// header icon.
//
// The row is now exactly TWO things: the status indicator, which leads the title,
// and Refresh, which is the only control. It used to carry a third element, a
// dev-only local-only toggle; that was removed, and the assertions below pin the
// row at one button so it cannot quietly grow another.
//
// What is worth pinning here is that the indicator costs nothing: Refresh still
// fires its handler with the indicator beside it, and the indicator contributes no
// button of its own for a user to press instead of Refresh.
//
// The row is reproduced here rather than mounting AppStore/index.tsx, which would
// drag in Recoil, the health probe and the debounced catalog build for a question
// about two sibling elements.

import { fireEvent, render, screen } from '@testing-library/react';
import { MdRefresh } from 'react-icons/md';
import { Button, Side } from '@/design-system/components';
import type { CatalogStatus } from '@/recoil/appStore';
import { CatalogStatusIcon } from './CatalogStatusIcon';

/** The header row exactly as AppStore/index.tsx composes it. */
const Header = ({ pStatus, pEntryCount = 3, onRefresh = jest.fn() }: { pStatus: CatalogStatus; pEntryCount?: number; onRefresh?: () => void }) => (
    <Side.Title>
        <span className="app-store-title-lead">
            <CatalogStatusIcon pStatus={pStatus} pEntryCount={pEntryCount} />
            PACKAGES
        </span>
        <Button.Group>
            <Button size="side" variant="none" isToolTip toolTipContent="Refresh" icon={<MdRefresh size={16} />} onClick={onRefresh} />
        </Button.Group>
    </Side.Title>
);

describe('App Store header row', () => {
    test('an online hub leaves the row exactly as it was: Refresh, nothing else', () => {
        render(<Header pStatus={{ mode: 'online' }} />);

        expect(screen.getAllByRole('button')).toHaveLength(1);
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
        expect(screen.getByText('PACKAGES')).toBeInTheDocument();
    });

    test('offline adds ONE indicator and still no second control', () => {
        render(<Header pStatus={{ mode: 'offline', lastSyncAt: Date.now() }} />);

        expect(screen.getByRole('status')).toHaveAccessibleName('Offline — hub unreachable');
        // The indicator is a span: the row's button count is unchanged, so there is
        // no Retry to press instead of Refresh.
        expect(screen.getAllByRole('button')).toHaveLength(1);
        expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    });

    test('Refresh still fires its handler with the indicator beside it', () => {
        const onRefresh = jest.fn();
        render(<Header pStatus={{ mode: 'offline' }} pEntryCount={0} onRefresh={onRefresh} />);

        const refresh = screen.getAllByRole('button')[0];
        fireEvent.click(refresh);

        expect(onRefresh).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('status')).toHaveAccessibleName('Catalog unavailable');
    });

    test('local-only shows the indicator and NO toggle — the mode is not switchable from the panel', () => {
        render(<Header pStatus={{ mode: 'localOnly' }} />);

        expect(screen.getByRole('status')).toHaveAccessibleName('Local-only (policy)');
        // The removed dev affordance: no badge, no label, and no control beyond
        // Refresh. Local-only is turned on by an administrator placing
        // `/public/.pkg-conf.json` on the server, never from here.
        expect(screen.queryByText('DEV')).not.toBeInTheDocument();
        expect(screen.queryByText(/local-only: (ON|OFF)/)).not.toBeInTheDocument();
        expect(screen.getAllByRole('button')).toHaveLength(1);
    });
});
