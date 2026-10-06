import { useCallback, useEffect } from 'react';
import { atom, useRecoilState } from 'recoil';
import { Toast } from '@/design-system/components';
import { accountKey, privateGroupsFileName, readJsonFile, SHARED_GROUPS_FILE, writeJsonFile } from '../layout/newTabStorage';
import { Group, GroupVisibility, parseGroups, serializeGroups } from './groupModel';

interface GroupsState {
    status: 'idle' | 'loading' | 'ready';
    /** The account the groups were read for (see gNewTabLayout). */
    account: string;
    groups: Group[];
}

export const gNewTabGroups = atom<GroupsState>({
    key: 'gNewTabGroups',
    default: { status: 'idle', account: '', groups: [] },
    dangerouslyAllowMutability: true,
});

const fileFor = (aVisibility: GroupVisibility) => (aVisibility === 'shared' ? SHARED_GROUPS_FILE : privateGroupsFileName());

const readFile = async (aVisibility: GroupVisibility): Promise<Group[] | undefined> => {
    const sRead = await readJsonFile(fileFor(aVisibility));
    if (sRead.status === 'missing') return [];
    if (sRead.status === 'error') return undefined;
    return parseGroups(sRead.data, aVisibility);
};

/**
 * Apply one change to the file on the server as it is now, not as this page last saw it: the shared
 * file is written by everyone, so re-reading first keeps another account's edit to a different
 * group from being overwritten.
 */
const commit = async (aVisibility: GroupVisibility, aChange: (aGroups: Group[]) => Group[]) => {
    const sCurrent = await readFile(aVisibility);
    if (!sCurrent) return { ok: false as const, reason: 'The saved groups could not be read.' };
    const sNext = aChange(sCurrent);
    const sWrite = await writeJsonFile(fileFor(aVisibility), serializeGroups(sNext));
    return sWrite.ok ? { ok: true as const, groups: sNext } : sWrite;
};

export const useNewTabGroups = () => {
    const [sState, setState] = useRecoilState(gNewTabGroups);
    const sAccount = accountKey();
    const sCurrent = sState.account === sAccount;

    const reload = useCallback(async () => {
        const sFor = accountKey();
        const [sPrivate, sShared] = await Promise.all([readFile('private'), readFile('shared')]);
        setState((aPrev) => (aPrev.account === sFor ? { status: 'ready', account: sFor, groups: [...(sPrivate ?? []), ...(sShared ?? [])] } : aPrev));
    }, [setState]);

    useEffect(() => {
        if (sCurrent && sState.status !== 'idle') return;
        setState({ status: 'loading', account: sAccount, groups: [] });
        reload();
    }, [sCurrent, sState.status, sAccount, setState, reload]);

    const replaceLocal = useCallback(
        (aVisibility: GroupVisibility, aGroups: Group[]) =>
            setState((aPrev) => ({ status: 'ready', account: aPrev.account, groups: [...aPrev.groups.filter((aGroup) => aGroup.visibility !== aVisibility), ...aGroups] })),
        [setState]
    );

    /** Create or update a group. Changing its visibility moves it from one file to the other. */
    const saveGroup = useCallback(
        async (aGroup: Group, aPreviousVisibility?: GroupVisibility) => {
            const sStamped: Group = { ...aGroup, owner: aGroup.owner || accountKey(), updatedAt: Date.now() };
            if (aPreviousVisibility && aPreviousVisibility !== sStamped.visibility) {
                const sRemoved = await commit(aPreviousVisibility, (aGroups) => aGroups.filter((aOld) => aOld.id !== sStamped.id));
                if (sRemoved.ok) replaceLocal(aPreviousVisibility, sRemoved.groups);
            }
            const sResult = await commit(sStamped.visibility, (aGroups) =>
                aGroups.some((aOld) => aOld.id === sStamped.id) ? aGroups.map((aOld) => (aOld.id === sStamped.id ? sStamped : aOld)) : [...aGroups, sStamped]
            );
            if (!sResult.ok) {
                Toast.error(`Could not save "${aGroup.name}": ${sResult.reason}`, { id: 'new-tab-group-save' });
                return false;
            }
            replaceLocal(sStamped.visibility, sResult.groups);
            return true;
        },
        [replaceLocal]
    );

    const deleteGroup = useCallback(
        async (aGroup: Group) => {
            const sResult = await commit(aGroup.visibility, (aGroups) => aGroups.filter((aOld) => aOld.id !== aGroup.id));
            if (!sResult.ok) {
                Toast.error(`Could not delete "${aGroup.name}": ${sResult.reason}`, { id: 'new-tab-group-save' });
                return false;
            }
            replaceLocal(aGroup.visibility, sResult.groups);
            return true;
        },
        [replaceLocal]
    );

    return { groups: sCurrent ? sState.groups : [], isLoading: !sCurrent || sState.status !== 'ready', saveGroup, deleteGroup, reload };
};
