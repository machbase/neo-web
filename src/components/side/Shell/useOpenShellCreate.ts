import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { gActiveShellManage, gBoardList, gSelectedTab, gShellList } from '@/recoil/recoil';
import { generateUUID } from '@/utils';
import { SHELL_ICON_LIST } from '@/components/ShellManage/constants';

/**
 * Opens the shell create form (ShellManage in create mode) in the one shell-manage tab, reusing that
 * tab when it is already open. The actual creation happens there via shell.add (+ shell.update when
 * theme/icon are customized). Shared by the Shell side panel and the New tab.
 */
export const useOpenShellCreate = () => {
    const setSelectedTab = useSetRecoilState<any>(gSelectedTab);
    const sShellList = useRecoilValue<any>(gShellList);
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const setActiveShellName = useSetRecoilState<any>(gActiveShellManage);

    return () => {
        // prefill command from the built-in SHELL entry (the server's default shell command,
        // e.g. `<machbase-neo path> shell`) — same source the old copy flow cloned from
        const sDefaultShell = sShellList?.find((aShell: any) => aShell.id === 'SHELL');
        // no `id` → ShellManage renders in create mode; the first icon comes preselected
        const sCreateTemplate = {
            label: '',
            command: sDefaultShell?.command ?? '',
            theme: 'default',
            icon: SHELL_ICON_LIST[0],
        };
        setActiveShellName('create');

        const aTarget = sBoardList.find((aBoard: any) => aBoard.type === 'shell-manage');
        if (aTarget) {
            setBoardList((aBoardList: any) =>
                aBoardList.map((aBoard: any) => (aBoard.id === aTarget.id ? { ...aTarget, name: `SHELL: create`, code: sCreateTemplate, savedCode: false } : aBoard))
            );
            setSelectedTab(aTarget.id);
            return;
        }
        const sId = generateUUID();
        setBoardList([...sBoardList, { id: sId, type: 'shell-manage', name: `SHELL: create`, code: sCreateTemplate, savedCode: false, path: '' }]);
        setSelectedTab(sId);
    };
};
