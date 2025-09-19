import { getId } from '../utils';
import { atom, selector } from 'recoil';

export interface GBoardListType {
    [key: string]: any;
}
const defaultId = getId();
export const gBoardList = atom<GBoardListType[]>({
    key: 'publicDashboard_gBoardList',
    default: [
        {
            id: defaultId,
            type: 'new',
            name: 'new',
            path: '',
            code: '',
            panels: [],
            range_bgn: '',
            range_end: '',
            sheet: [],
            shell: {},
            savedCode: false,
        },
    ],
});

export const gSelectedTab = atom<string>({
    key: 'publicDashboard_gSelectedTab',
    default: defaultId,
});

export const gConsoleList = atom<any>({
    key: 'publicDashboard_gConsoleList',
    default: [] as any,
});

export const gSelectedExtension = atom<string>({
    key: 'publicDashboard_gSelectedExtension',
    default: 'EXPLORER',
});
export const gExtensionList = atom<any>({
    key: 'publicDashboard_gExtensionList',
    default: [
        {
            id: 'EXPLORER',
            type: 'EXPLORER',
            label: 'EXPLORER',
        },
        {
            id: 'DBEXPLORER',
            type: 'DBEXPLORER',
            label: 'DBEXPLORER',
        },
        {
            id: 'SHELL',
            type: 'SHELL',
            label: 'SHELL',
        },

        {
            id: 'BRIDGE',
            type: 'BRIDGE',
            label: 'BRIDGE',
        },
        {
            id: 'TIMER',
            type: 'TIMER',
            label: 'TIMER',
        },
        {
            id: 'KEY',
            type: 'KEY',
            label: 'KEY',
        },
        {
            id: 'APPSTORE',
            type: 'APPSTORE',
            label: 'APPSTORE',
        },
        {
            id: 'REFERENCE',
            type: 'REFERENCE',
            label: 'REFERENCE',
        },
    ],
});

export const gTables = atom<any>({
    key: 'publicDashboard_gTables',
    default: [],
});
export const gConsoleSelector = selector<any>({
    key: 'publicDashboard_gConsoleSelector',
    get: ({ get }) => {
        const sArray: any = get(gConsoleList);
        return sArray;
    },
    set: ({ set }, aNewValue) => {
        if (aNewValue.length > 200) {
            const sNewSlicedArray = aNewValue.slice(1, 201);
            set(gConsoleList, sNewSlicedArray);
        } else {
            set(gConsoleList, aNewValue);
        }
    },
});

export const gRollupTableList = atom<any>({
    key: 'publicDashboard_gRollupTableList',
    default: [],
});

export const gSelectedBoard = selector<any>({
    key: 'publicDashboard_gSelectedBoard',
    get: ({ get }) => {
        const sBoardList = get(gBoardList);
        const sSelectedTab = get(gSelectedTab);

        return sBoardList.filter((aBoard) => aBoard.id === sSelectedTab)[0];
    },
});

export const gKeyList = atom<any>({
    key: 'publicDashboard_gKeyList',
    default: [] as any,
});

export const gActiveKey = atom<any>({
    key: 'publicDashboard_gActiveKey',
    default: '' as string,
});

export const gTimerList = atom<any>({
    key: 'publicDashboard_gTimerList',
    default: [] as any,
});
export const gActiveTimer = atom<any>({
    key: 'publicDashboard_gActiveTimer',
    default: '' as string,
});
export const gShellList = atom<any>({
    key: 'publicDashboard_gShellList',
    default: [] as any,
});
export const gActiveShellManage = atom<any>({
    key: 'publicDashboard_gActiveShellManage',
    default: '' as string,
});
export const gShowShellList = selector<any>({
    key: 'publicDashboard_gShowShellList',
    get: ({ get }) => {
        const sShellList = get(gShellList);
        if (!sShellList) return [];
        return sShellList.filter((aTermTypeItem: any) => aTermTypeItem.attributes.some((aAttr: any) => aAttr.editable));
    },
});

// Bridge & Subr
export const setBridgeTree = (aBridgeList: any, aSubrList: any) => {
    const sSubrMap: any = {};

    aSubrList.forEach((aInfo: any) => {
        const bridgeName = aInfo.bridge;
        if (sSubrMap[bridgeName]) sSubrMap[bridgeName].push(aInfo);
        else sSubrMap[bridgeName] = [aInfo];
    });

    const sParedTree = aBridgeList
        ? aBridgeList.map((aBridge: any) => {
              if (aBridge.name in sSubrMap) return { ...aBridge, childs: sSubrMap[aBridge.name] };
              else return aBridge;
          })
        : [];

    return sParedTree;
};

export const gBridgeList = atom<any>({
    key: 'publicDashboard_gBridgeList',
    default: [] as any,
});
export const gBridgeNameList = selector<any>({
    key: 'publicDashboard_gBridgeNameList',
    get: ({ get }) => {
        const sTmpBridgeList = get(gBridgeList).filter((aItem: any) => aItem.type === 'nats' || aItem.type === 'mqtt');
        return sTmpBridgeList.map((aItem: any) => aItem.name);
    },
});
export const gActiveBridge = atom<any>({
    key: 'publicDashboard_gActiveBridge',
    default: '' as string,
});
export const gActiveSubr = atom<any>({
    key: 'publicDashboard_gActiveSubr',
    default: '' as string,
});
export const gAddSubr = selector({
    key: 'publicDashboard_gAddSubr',
    get: () => {},
    set: ({ set, get }, newValue: any) => {
        const sTmpBridgeList = get(gBridgeList);
        const sApplyList = sTmpBridgeList.map((aBridge: any) => {
            if (aBridge.name === newValue.bridge) {
                const sChild = aBridge?.childs ? [...aBridge.childs] : [];
                return { ...aBridge, childs: [...sChild, newValue] };
            } else return aBridge;
        });
        set(gBridgeList, sApplyList);
    },
});
export const gDelSubr = selector({
    key: 'publicDashboard_gDelSubr',
    get: () => {},
    set: ({ set, get }, newValue: any) => {
        const sTmpBridgeList = get(gBridgeList);
        const sApplyList = sTmpBridgeList.map((aBridge: any) => {
            if (aBridge.name === newValue.bridge.name) {
                const sChildList = aBridge.childs.filter((aChild: any) => aChild.name !== newValue.subr.name);
                const sTmpBoardList = get(gBoardList);
                let sApplyBoardList: any = undefined;
                if (sChildList.length > 0) {
                    set(gActiveSubr, sChildList.at(-1).name);
                    sApplyBoardList = sTmpBoardList.map((aBoard) => {
                        if (aBoard.type === 'subscriber') {
                            return {
                                ...aBoard,
                                name: `SUBR: ${newValue.subr.name}`,
                                code: { bridge: newValue.bridge, subr: sChildList.at(-1) },
                                savedCode: false,
                            };
                        } else return aBoard;
                    });
                } else {
                    set(gActiveSubr, undefined);
                    sApplyBoardList = sTmpBoardList.map((aBoard) => {
                        if (aBoard.type === 'subscriber') {
                            return {
                                ...aBoard,
                                name: 'SUBR: create',
                                code: { bridge: newValue.bridge, subr: {} },
                                savedCode: false,
                            };
                        } else return aBoard;
                    });
                }
                set(gBoardList, sApplyBoardList);
                return { ...aBridge, childs: sChildList };
            } else return aBridge;
        });
        set(gBridgeList, sApplyList);
    },
});
export const gStateSubr = selector({
    key: 'publicDashboard_gStateSubr',
    get: () => {},
    set: ({ set, get }, newValue: any) => {
        // Update bridge tree
        let sApplyData: any = undefined;
        const sTmpBridgeList = get(gBridgeList);
        const sApplyBridgeList = sTmpBridgeList.map((aBridge: any) => {
            if (aBridge.name === newValue.target.bridge.name) {
                const sApplyChildList = aBridge.childs.map((aChild: any) => {
                    if (aChild.name === newValue.target.subr.name) {
                        sApplyData = { ...aChild, state: newValue.state };
                        // Update tab data
                        set(gActiveSubr, aChild.name);
                        return sApplyData;
                    } else return aChild;
                });

                return { ...aBridge, childs: sApplyChildList };
            } else return aBridge;
        });

        // Update active board list
        const sTmpBoardList = get(gBoardList);
        const sApplyBoardLIst = sTmpBoardList.map((aBoard: any) => {
            if (aBoard.type === 'subscriber') {
                return {
                    ...aBoard,
                    code: { bridge: newValue.target.bridge, subr: { ...aBoard.code.subr, state: newValue.state } },
                    savedCode: { bridge: newValue.target.bridge, subr: { ...aBoard.code.subr, state: newValue.state } },
                };
            } else return aBoard;
        });

        set(gBoardList, sApplyBoardLIst);
        set(gBridgeList, sApplyBridgeList);
    },
});

// Database backup list
export const gBackupList = atom<any>({
    key: 'publicDashboard_gBackupList',
    default: [] as any,
});

export const BADGE_KEYWORD = 'VALID';
// License global
export const gLicense = atom<any>({
    key: 'publicDashboard_gLicense',
    default: {
        licenseStatus: BADGE_KEYWORD,
        eulaRequired: false,
    } as any,
});
