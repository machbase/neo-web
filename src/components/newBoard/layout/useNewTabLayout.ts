import { useCallback, useEffect } from 'react';
import { atom, useRecoilState } from 'recoil';
import { Toast } from '@/design-system/components';
import { createDefaultLayout, parseLayout, SectionNode, serializeLayout } from './layoutModel';
import { accountKey, layoutFileName, readJsonFile, writeJsonFile } from './newTabStorage';

interface LayoutState {
    /** `error`: the saved layout could not be read; the default shows, and nothing is written over the file. */
    status: 'idle' | 'loading' | 'ready' | 'error';
    /** The account the nodes were read for. Logging out and in as another account does not reload the page, so this is how a stale layout is spotted. */
    account: string;
    nodes: SectionNode[];
    /** True when no saved layout exists, so the page shows the default. */
    isDefault: boolean;
    /** Why the saved layout could not be read (status `error`). */
    error?: string;
}

/** Shared by every open New tab, so customising one updates the others. */
export const gNewTabLayout = atom<LayoutState>({
    key: 'gNewTabLayout',
    default: { status: 'idle', account: '', nodes: createDefaultLayout(), isDefault: true },
    // The editor hands structuredClone'd trees in; freezing them would only cost a copy on every edit.
    dangerouslyAllowMutability: true,
});

/** Layout save notices go to the bottom: at the top right they covered Reset, Cancel and Done (and stayed while hovered). */
export const LAYOUT_TOAST_POSITION = 'bottom-right' as const;

export type LayoutRead = { ok: true; nodes: SectionNode[] } | { ok: false; reason: string };

/** The account's saved layout as the server has it now. A missing (or damaged) file is the default. */
const readLayout = async (): Promise<LayoutRead & { isDefault?: boolean }> => {
    const sRead = await readJsonFile(layoutFileName());
    if (sRead.status === 'error') return { ok: false, reason: sRead.reason };
    const sNodes = sRead.status === 'ok' ? parseLayout(sRead.data) : undefined;
    return { ok: true, nodes: sNodes ?? createDefaultLayout(), isDefault: !sNodes };
};

export const useNewTabLayout = () => {
    const [sState, setState] = useRecoilState(gNewTabLayout);
    const sAccount = accountKey();
    // Another account's layout still in memory counts as not loaded: show the default until this account's file is read.
    const sCurrent = sState.account === sAccount;

    /** Read the saved layout again and show it; a reply that lands after the account changed is dropped. */
    const refresh = useCallback(async (): Promise<LayoutRead> => {
        const sFor = accountKey();
        const sRead = await readLayout();
        setState((aPrev) => {
            if (aPrev.account !== sFor) return aPrev;
            return sRead.ok
                ? { status: 'ready', account: sFor, nodes: sRead.nodes, isDefault: !!sRead.isDefault }
                : { status: 'error', account: sFor, nodes: aPrev.status === 'ready' ? aPrev.nodes : createDefaultLayout(), isDefault: aPrev.status !== 'ready', error: sRead.reason };
        });
        return sRead;
    }, [setState]);

    useEffect(() => {
        if (sCurrent && sState.status !== 'idle') return;
        setState({ status: 'loading', account: sAccount, nodes: createDefaultLayout(), isDefault: true });
        refresh();
    }, [sCurrent, sState.status, sAccount, setState, refresh]);

    /**
     * Write the layout, and show it once it is written: a failed write leaves the saved one in place.
     * Refused while the saved layout could not be read, so it is never replaced unseen.
     */
    const save = useCallback(
        async (aNodes: SectionNode[]) => {
            if (sState.status === 'error') {
                Toast.error('Your saved New tab could not be read, so it was not changed. Try again once it loads.', { id: 'new-tab-layout-save', position: LAYOUT_TOAST_POSITION });
                return false;
            }
            const sFor = accountKey();
            const sResult = await writeJsonFile(layoutFileName(), serializeLayout(aNodes));
            if (!sResult.ok) {
                Toast.error(`Could not save the New tab layout: ${sResult.reason}`, { id: 'new-tab-layout-save', position: LAYOUT_TOAST_POSITION });
                return false;
            }
            setState((aPrev) => (aPrev.account === sFor ? { status: 'ready', account: sFor, nodes: aNodes, isDefault: false } : aPrev));
            return true;
        },
        [setState, sState.status]
    );

    return {
        nodes: sCurrent ? sState.nodes : createDefaultLayout(),
        isLoading: !sCurrent || sState.status === 'idle' || sState.status === 'loading',
        isDefault: !sCurrent || sState.isDefault,
        /** Set when the saved layout could not be read: the default shows and nothing is saved over it. */
        loadError: sCurrent && sState.status === 'error' ? sState.error ?? 'Unknown error' : undefined,
        refresh,
        save,
    };
};
