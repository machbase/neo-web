// The four CRUD paths this suite and its siblings cover were all SILENT on failure: the handler
// checked `if (res.success)` with no `else`, so a rejected delete/copy closed the confirm modal,
// left the list untouched, and told the user nothing — indistinguishable from a no-op.
//
// These tests do not assert wording; they assert that a failure reaches the user at all. That is
// the regression worth pinning: a future refactor can reword or restyle freely, but must not go
// back to swallowing the failure.

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { Bridge } from './index';
import { delBridge } from '@/api/repository/bridge';
import { Toast } from '@/design-system/components';
import { gActiveBridge, gBoardList, gBridgeList } from '@/recoil/recoil';

jest.mock('@/api/repository/bridge', () => ({
    delBridge: jest.fn(),
    commandBridge: jest.fn(),
}));

// Stub the Toast MODULE, not the barrel: spreading `jest.requireActual('@/design-system/components')`
// eagerly fires every re-export getter, and the barrel has a circular import (DatePicker imports it
// back), so that spread throws while the graph is half-initialized. Mocking './Toast' lets the real
// barrel re-export the stub instead.
jest.mock('@/design-system/components/Toast', () => ({
    Toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() },
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
}));

const BRIDGE = { name: 'my-bridge', type: 'SQLite' as const, path: '/tmp/a.db' };

// the detail body is gated on `gActiveBridge !== ''`, and the delete handler rewrites the board
// that owns this tab — both have to be seeded or the Delete button never renders
const renderBridge = () =>
    render(
        <RecoilRoot
            initializeState={({ set }) => {
                set(gActiveBridge, BRIDGE.name);
                set(gBridgeList, [BRIDGE]);
                // `as any`: GBoardListType also demands dashboard-only fields (panels/range_bgn/range_end) that
                // no bridge board ever carries
                set(gBoardList, [{ id: 'board-1', type: 'bridge', name: `BRIDGE: ${BRIDGE.name}`, code: BRIDGE, savedCode: BRIDGE, path: '' }] as any);
            }}
        >
            <Bridge pCode={BRIDGE} />
        </RecoilRoot>
    );

/** open the confirm modal from the detail page's Delete button, then press OK */
const confirmDelete = async () => {
    fireEvent.click(screen.getByText('Delete'));
    const sOk = await screen.findByText('OK');
    // the handler awaits the repository before it setState()s — without act the resolution lands
    // outside React's batch and every run prints an act() warning
    await act(async () => {
        fireEvent.click(sOk);
    });
};

describe('Bridge delete failure', () => {
    beforeEach(() => jest.clearAllMocks());

    it('tells the user when the server rejects the delete', async () => {
        (delBridge as jest.Mock).mockResolvedValue({
            success: false,
            reason: 'bridge is in use by a subscriber',
            elapse: '',
            data: { reason: 'bridge is in use by a subscriber' },
            statusText: 'bridge is in use by a subscriber',
        });

        renderBridge();
        await confirmDelete();

        await waitFor(() => expect(Toast.error).toHaveBeenCalled());
        expect((Toast.error as jest.Mock).mock.calls[0][0]).toContain('bridge is in use by a subscriber');
        expect(Toast.success).not.toHaveBeenCalled();
    });

    it('falls back to a generic message when the failure carries no reason', async () => {
        (delBridge as jest.Mock).mockResolvedValue({ success: false, reason: '', elapse: '' });

        renderBridge();
        await confirmDelete();

        await waitFor(() => expect(Toast.error).toHaveBeenCalled());
        expect((Toast.error as jest.Mock).mock.calls[0][0]).toMatch(/failed/i);
    });

    it('confirms the delete on success', async () => {
        (delBridge as jest.Mock).mockResolvedValue({ success: true, reason: 'success', elapse: '' });

        renderBridge();
        await confirmDelete();

        await waitFor(() => expect(Toast.success).toHaveBeenCalled());
        expect(Toast.error).not.toHaveBeenCalled();
    });
});
