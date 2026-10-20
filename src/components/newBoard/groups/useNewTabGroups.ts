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
    /** Files that could not be read on the last load: their groups are unknown, not deleted. */
    unreadable: GroupVisibility[];
}

export const gNewTabGroups = atom<GroupsState>({
    key: 'gNewTabGroups',
    default: { status: 'idle', account: '', groups: [], unreadable: [] },
    dangerouslyAllowMutability: true,
});

const fileFor = (aVisibility: GroupVisibility) => (aVisibility === 'shared' ? SHARED_GROUPS_FILE : privateGroupsFileName());

/**
 * One group per id. A group moved between the files is written to its new file before it is taken
 * out of the old one, so for a moment (or after a failed removal) it is in both: the later copy wins.
 */
const oneById = (aGroups: Group[]) => {
    const sById = new Map<string, Group>();
    aGroups.forEach((aGroup) => {
        const sKept = sById.get(aGroup.id);
        if (!sKept || aGroup.updatedAt > sKept.updatedAt) sById.set(aGroup.id, aGroup);
    });
    return aGroups.filter((aGroup) => sById.get(aGroup.id) === aGroup);
};

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
    // Nothing to change (e.g. a group already out of a file): no write, so nothing to fail.
    if (JSON.stringify(serializeGroups(sNext)) === JSON.stringify(serializeGroups(sCurrent))) return { ok: true as const, groups: sNext };
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
        const sUnreadable: GroupVisibility[] = [...(sPrivate ? [] : ['private' as const]), ...(sShared ? [] : ['shared' as const])];
        setState((aPrev) => (aPrev.account === sFor ? { status: 'ready', account: sFor, groups: oneById([...(sPrivate ?? []), ...(sShared ?? [])]), unreadable: sUnreadable } : aPrev));
    }, [setState]);

    useEffect(() => {
        if (sCurrent && sState.status !== 'idle') return;
        setState({ status: 'loading', account: sAccount, groups: [], unreadable: [] });
        reload();
    }, [sCurrent, sState.status, sAccount, setState, reload]);

    const replaceLocal = useCallback(
        (aVisibility: GroupVisibility, aGroups: Group[]) =>
            setState((aPrev) => ({
                status: 'ready',
                account: aPrev.account,
                groups: oneById([...aPrev.groups.filter((aGroup) => aGroup.visibility !== aVisibility), ...aGroups]),
                // A file just written was read first, so it is readable now.
                unreadable: aPrev.unreadable.filter((aOld) => aOld !== aVisibility),
            })),
        [setState]
    );

    /**
     * Create or update a group. Changing its visibility moves it from one file to the other: written to
     * the new file first, then taken out of the old one, so a failed write never leaves it in neither.
     */
    const saveGroup = useCallback(
        async (aGroup: Group, aPreviousVisibility?: GroupVisibility) => {
            const sStamped: Group = { ...aGroup, owner: aGroup.owner || accountKey(), updatedAt: Date.now() };
            const sResult = await commit(sStamped.visibility, (aGroups) =>
                aGroups.some((aOld) => aOld.id === sStamped.id) ? aGroups.map((aOld) => (aOld.id === sStamped.id ? sStamped : aOld)) : [...aGroups, sStamped]
            );
            if (!sResult.ok) {
                Toast.error(`Could not save "${aGroup.name}": ${sResult.reason}`, { id: 'new-tab-group-save' });
                return false;
            }
            replaceLocal(sStamped.visibility, sResult.groups);
            if (aPreviousVisibility && aPreviousVisibility !== sStamped.visibility) {
                const sRemoved = await commit(aPreviousVisibility, (aGroups) => aGroups.filter((aOld) => aOld.id !== sStamped.id));
                // Left in the old file too it still shows once here (the newer copy), and the next move or
                // delete tidies it; meanwhile others may still see it there, so say so.
                if (sRemoved.ok) replaceLocal(aPreviousVisibility, sRemoved.groups);
                else
                    Toast.warning(
                        `"${aGroup.name}" was saved, but could not be taken out of ${aPreviousVisibility === 'shared' ? 'the shared groups, so other accounts may still see it' : 'your own groups'}: ${sRemoved.reason}`,
                        { id: 'new-tab-group-save', duration: 8000 }
                    );
            }
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
            // A copy left in the other file by a move that could not finish would show up again.
            const sOther: GroupVisibility = aGroup.visibility === 'shared' ? 'private' : 'shared';
            const sTidied = await commit(sOther, (aGroups) => aGroups.filter((aOld) => aOld.id !== aGroup.id));
            if (sTidied.ok) replaceLocal(sOther, sTidied.groups);
            return true;
        },
        [replaceLocal]
    );

    return {
        groups: sCurrent ? sState.groups : [],
        isLoading: !sCurrent || sState.status !== 'ready',
        /** A groups file could not be read: a group not found may be in it, so it is not called deleted. */
        isPartial: sCurrent && sState.unreadable.length > 0,
        saveGroup,
        deleteGroup,
        reload,
    };
};
