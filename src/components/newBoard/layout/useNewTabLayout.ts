import { useCallback, useEffect } from 'react';
import { atom, useRecoilState } from 'recoil';
import { Toast } from '@/design-system/components';
import { createDefaultLayout, parseLayout, SectionNode, serializeLayout } from './layoutModel';
import { accountKey, layoutFileName, readJsonFile, writeJsonFile } from './newTabStorage';

interface LayoutState {
    status: 'idle' | 'loading' | 'ready';
    /** The account the nodes were read for. Logging out and in as another account does not reload the page, so this is how a stale layout is spotted. */
    account: string;
    nodes: SectionNode[];
    /** True when no saved layout exists, so the page shows the default. */
    isDefault: boolean;
}

/** Shared by every open New tab, so customising one updates the others. */
export const gNewTabLayout = atom<LayoutState>({
    key: 'gNewTabLayout',
    default: { status: 'idle', account: '', nodes: createDefaultLayout(), isDefault: true },
    // The editor hands structuredClone'd trees in; freezing them would only cost a copy on every edit.
    dangerouslyAllowMutability: true,
});

export const useNewTabLayout = () => {
    const [sState, setState] = useRecoilState(gNewTabLayout);
    const sAccount = accountKey();
    // Another account's layout still in memory counts as not loaded: show the default until this account's file is read.
    const sCurrent = sState.account === sAccount;

    useEffect(() => {
        if (sCurrent && sState.status !== 'idle') return;
        setState({ status: 'loading', account: sAccount, nodes: createDefaultLayout(), isDefault: true });
        (async () => {
            const sRead = await readJsonFile(layoutFileName());
            const sNodes = sRead.status === 'ok' ? parseLayout(sRead.data) : undefined;
            // A missing or unreadable file shows the default rather than an empty page. A reply that
            // lands after the account changed again is dropped.
            setState((aPrev) => (aPrev.account === sAccount ? { status: 'ready', account: sAccount, nodes: sNodes ?? createDefaultLayout(), isDefault: !sNodes } : aPrev));
        })();
    }, [sCurrent, sState.status, sAccount, setState]);

    const save = useCallback(
        async (aNodes: SectionNode[]) => {
            setState({ status: 'ready', account: accountKey(), nodes: aNodes, isDefault: false });
            const sResult = await writeJsonFile(layoutFileName(), serializeLayout(aNodes));
            if (!sResult.ok) Toast.error(`Could not save the New tab layout: ${sResult.reason}`, { id: 'new-tab-layout-save' });
            return sResult.ok;
        },
        [setState]
    );

    return {
        nodes: sCurrent ? sState.nodes : createDefaultLayout(),
        isLoading: !sCurrent || sState.status !== 'ready',
        isDefault: !sCurrent || sState.isDefault,
        save,
    };
};
