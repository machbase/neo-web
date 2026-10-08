import { useCallback } from 'react';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { gActiveBridge, gActiveKey, gActiveTimer, gActiveToken, gBoardList, gSelectedExtension, gSelectedTab } from '@/recoil/recoil';
import { gFileTree } from '@/recoil/fileTree';
import { getId, getUserName } from '@/utils';
import { Toast } from '@/design-system/components';
import { TreeFetchDrilling } from '@/utils/UpdateTree';
import { loadBoardFromFile } from '@/components/side/FileExplorer/loadBoardFromFile';
import { useAppStoreTabs } from '@/components/side/AppStore/appTabs';
import { probePkgHtml } from '@/components/side/AppStore/pkgHtml';
import { useOpenPkgView } from '@/components/side/AppStore/pkgViews';
import { recordRecentFile } from '@/utils/recentFiles';
import { GroupItem, splitFilePath } from './groupModel';
import { KIND_LABELS, resolveItem } from './groupResources';

/**
 * Open a group item the way its own panel opens it, in a tab of its own so the New tab stays.
 * Resolves to false when the item no longer exists, so the widget can mark it.
 */
export const useOpenGroupItem = () => {
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const setSelectedTab = useSetRecoilState<any>(gSelectedTab);
    const setSelectedExtension = useSetRecoilState<string>(gSelectedExtension);
    const sFileTree = useRecoilValue<any>(gFileTree);
    const setFileTree = useSetRecoilState<any>(gFileTree);
    const setActiveTimer = useSetRecoilState<any>(gActiveTimer);
    const setActiveBridge = useSetRecoilState<any>(gActiveBridge);
    const setActiveToken = useSetRecoilState<any>(gActiveToken);
    const setActiveKey = useSetRecoilState<any>(gActiveKey);
    const { openAppViewTab } = useAppStoreTabs();
    const openPkgView = useOpenPkgView();

    /** The timer, bridge, token, certificate and table panels each keep one tab and retarget it. */
    const openSingleTab = useCallback(
        (aType: string, aName: string, aCode: any, aSavedCode: any = aCode) => {
            const sTarget = sBoardList.find((aBoard: any) => aBoard.type === aType);
            if (sTarget) {
                setBoardList((aList: any[]) => aList.map((aBoard: any) => (aBoard.id === sTarget.id ? { ...sTarget, name: aName, code: aCode, savedCode: aSavedCode } : aBoard)));
                setSelectedTab(sTarget.id);
                return;
            }
            const sId = getId();
            setBoardList((aList: any[]) => [...aList, { id: sId, type: aType, name: aName, code: aCode, savedCode: aSavedCode, path: '' }]);
            setSelectedTab(sId);
        },
        [sBoardList, setBoardList, setSelectedTab]
    );

    return useCallback(
        async (aItem: GroupItem): Promise<boolean> => {
            const notFound = () => {
                Toast.error(`${KIND_LABELS[aItem.kind].one} "${aItem.label}" was not found. It may have been renamed or removed.`, { id: 'group-item-open' });
                return false;
            };

            if (aItem.kind === 'file') {
                const { path, name } = splitFilePath(aItem.ref);
                const sOpen = sBoardList.find((aBoard: any) => aBoard.name === name && aBoard.path === path);
                if (sOpen) {
                    setSelectedTab(sOpen.id);
                    recordRecentFile({ name, path });
                    return true;
                }
                const sId = getId();
                const sLoaded = await loadBoardFromFile({ name, path }, sId);
                if (sLoaded.error !== undefined) {
                    if (sLoaded.transport) return true;
                    if (sLoaded.invalid) {
                        // exists but damaged: do not mark it missing
                        Toast.error(`${KIND_LABELS[aItem.kind].one} "${aItem.label}" is damaged and cannot be opened: ${sLoaded.error}`, { id: 'group-item-open' });
                        return true;
                    }
                    return notFound();
                }
                setBoardList((aList: any[]) => [...aList, sLoaded.board]);
                setSelectedTab(sId);
                recordRecentFile({ name, path });
                return true;
            }

            if (aItem.kind === 'folder') {
                const sDrilled: any = await TreeFetchDrilling(sFileTree, aItem.ref);
                if (!sDrilled?.exist) return notFound();
                setFileTree(sDrilled.tree);
                setSelectedExtension('EXPLORER');
                return true;
            }

            if (aItem.kind === 'package') {
                if (!(await resolveItem(aItem))) return notFound();
                const { main, side } = await probePkgHtml(aItem.ref);
                if (main) openAppViewTab(aItem.ref);
                if (side) openPkgView(aItem.ref);
                if (!main && !side) Toast.info(`${aItem.ref} has no screen of its own. Open App Store to see its details.`, { id: 'group-item-open' });
                return true;
            }

            const sEntry = await resolveItem(aItem).catch(() => undefined);
            if (!sEntry) return notFound();
            const sRaw = sEntry.raw;

            switch (aItem.kind) {
                case 'timer':
                    setActiveTimer(sRaw.id);
                    openSingleTab('timer', `TIMER: ${sRaw.name}`, sRaw);
                    return true;
                case 'bridge':
                    setActiveBridge(sRaw.name);
                    openSingleTab('bridge', `BRIDGE: ${sRaw.name}`, sRaw);
                    return true;
                case 'token':
                    setActiveToken(sRaw.id);
                    openSingleTab('token', `TOKEN: ${sRaw.name}`, sRaw);
                    return true;
                case 'cert':
                    setActiveKey(sRaw.id);
                    openSingleTab('key', `CERT: ${sRaw.name}`, sRaw);
                    return true;
                case 'table':
                    // Same tab and payload as a table row in the DB explorer; curUserNm is the signed-in user, not the owner.
                    openSingleTab('DBTable', `TABLE: ${sRaw[3]}`, { curUserNm: String(getUserName() ?? '').toUpperCase(), tableInfo: sRaw }, false);
                    return true;
                case 'shell': {
                    // Every launch is its own terminal session, so this always adds a tab.
                    const sId = getId();
                    setBoardList((aList: any[]) => [
                        ...aList,
                        {
                            id: sId,
                            type: 'term',
                            name: sRaw.label,
                            path: '',
                            code: '',
                            panels: [],
                            sheet: [],
                            savedCode: false,
                            shell: { icon: sRaw.icon, theme: sRaw.theme ?? '', id: sRaw.id ?? 'SHELL' },
                        },
                    ]);
                    setSelectedTab(sId);
                    return true;
                }
                default:
                    return true;
            }
        },
        [sBoardList, sFileTree, setBoardList, setSelectedTab, setFileTree, setSelectedExtension, setActiveTimer, setActiveBridge, setActiveToken, setActiveKey, openAppViewTab, openPkgView, openSingleTab]
    );
};
