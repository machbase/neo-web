import { getReferenceList, postFileList } from '@/api/repository/api';
import { gSelectedExtension } from '@/recoil/recoil';
import { gFileTree } from '@/recoil/fileTree';
import { TreeFetchDrilling } from '@/utils/UpdateTree';
import { Toast } from '@/design-system/components';
import { useEffect, useRef, useState } from 'react';
import { useRecoilState, useSetRecoilState } from 'recoil';

/**
 * The reference lists (docs, SDKs, cheat sheets ...) the server serves at /api/refs, and what their
 * entries do, shared by the References side panel and the New tab's reference widgets so both open
 * and install the same way.
 */
export type REFERENCE_ITEM = {
    title: string;
    address: string;
    type: string;
    target?: string;
};
export type REFERENCE_GROUP = { label: string; items: REFERENCE_ITEM[] };

const EDUCATION: REFERENCE_ITEM = {
    type: 'url',
    title: 'Education',
    address: 'https://github.com/machbase/education',
};

/** Entries whose repository can be cloned into the server's files ("Quick install"). */
const SUPPORT_QUICK_INSTALL_LIST = ['Tutorials', 'Demo web app', 'Education'];

export const isQuickInstallable = (aTitle?: string) => SUPPORT_QUICK_INSTALL_LIST.some((aItem) => aItem.toUpperCase() === aTitle?.toUpperCase());

/** The folder a quick install creates: the repository's last path part. */
export const quickInstallFolder = (aItem: REFERENCE_ITEM) => aItem?.address?.substring(aItem?.address?.lastIndexOf('/') + 1);

/** The server's lists, with Education added to REFERENCES (the server does not list it). */
export const fetchReferences = async (): Promise<REFERENCE_GROUP[]> => {
    const sData: any = await getReferenceList();
    const sRefs: REFERENCE_GROUP[] = sData?.data?.refs ?? [];
    sRefs.forEach((aRef) => {
        if (aRef?.label?.toUpperCase() === 'REFERENCES' && !aRef.items?.some((aItem) => aItem?.address === EDUCATION.address)) aRef.items?.push({ ...EDUCATION });
    });
    return sRefs;
};

/** Opens a `url` entry the way the panel always has: in the window its `target` names. */
export const openReferenceUrl = (aItem: REFERENCE_ITEM) => window.open(aItem.address, aItem.target);

/**
 * Clones an entry's repository into a folder of the server's files, then shows it in the explorer.
 * Installs run one after another so their file tree refreshes do not overwrite each other.
 */
export const useQuickInstall = () => {
    const [sFileTree, setFileTree] = useRecoilState(gFileTree);
    const setSelectedExtension = useSetRecoilState<string>(gSelectedExtension);
    const [sProcessingList, setProcessingList] = useState<string[]>([]);
    const quickInstallQueueRef = useRef<Promise<void>>(Promise.resolve());
    const fileTreeRef = useRef(sFileTree);

    useEffect(() => {
        fileTreeRef.current = sFileTree;
    }, [sFileTree]);

    const install = async (aItem: REFERENCE_ITEM) => {
        const sFolder = quickInstallFolder(aItem);
        if (sProcessingList.includes(sFolder)) return;
        setProcessingList((prev) => [...prev, sFolder]);
        try {
            const sResult: any = await postFileList({ url: aItem?.address, command: 'clone' }, `/${sFolder}`, '');
            if (sResult && sResult?.success) {
                quickInstallQueueRef.current = quickInstallQueueRef.current.then(async () => {
                    const sDrillRes = await TreeFetchDrilling(fileTreeRef.current, `/${sFolder}`);
                    if (sDrillRes?.tree) {
                        setFileTree(sDrillRes.tree);
                        fileTreeRef.current = sDrillRes.tree;
                    }
                });
                await quickInstallQueueRef.current;
                setSelectedExtension('EXPLORER');
                Toast.success(`Creating in ${sFolder} folder`);
            }
        } catch (error) {
            Toast.error(`Quick install failed: ${error}`);
        } finally {
            setProcessingList((prev) => prev.filter((item) => item !== sFolder));
        }
    };

    return { install, isInstalling: (aItem: REFERENCE_ITEM) => sProcessingList.includes(quickInstallFolder(aItem)) };
};
