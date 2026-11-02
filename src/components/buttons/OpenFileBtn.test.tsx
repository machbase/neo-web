// OpenFileBtn picked the file only when the last segment contained `.${pType}` — case-sensitive and anywhere in the
// name: `X.TQL` did nothing, `a.tqlx` was opened as a tql (issue-1544 r20 M4).
import { render, screen, fireEvent, act } from '@testing-library/react';
import { RecoilRoot, useRecoilValue, useRecoilState } from 'recoil';
import { OpenFileBtn } from './OpenFileBtn';
import { getFiles } from '@/api/repository/fileTree';
import { gBoardList } from '@/recoil/recoil';
import * as fileLoader from '@/components/side/FileExplorer/loadBoardFromFile';

jest.mock('@/api/repository/fileTree', () => ({ getFiles: jest.fn() }));

let sBoards: any[] = [];
const BoardProbe = () => {
    sBoards = useRecoilValue(gBoardList) as any[];
    return null;
};

const open = async (aPath: string, aType = 'tql') => {
    render(
        <RecoilRoot>
            <OpenFileBtn pType={aType} pFileInfo={{ path: aPath }} />
            <BoardProbe />
        </RecoilRoot>
    );
    await act(async () => {
        fireEvent.click(screen.getByText('Open file'));
    });
};

describe('OpenFileBtn — extension check (r20 M4)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        sBoards = [];
        (getFiles as jest.Mock).mockResolvedValue('SQL(`select 1`)');
    });

    it.each(['/d/X.TQL', '/d/x.Tql', '/d/x.tql'])('%s opens as a tab', async (aPath) => {
        await open(aPath);
        expect(getFiles).toHaveBeenCalledTimes(1);
        const sName = aPath.split('/').at(-1);
        expect(sBoards.find((aB) => aB.name === sName)).toMatchObject({ path: '/d/', type: 'tql', code: 'SQL(`select 1`)' });
    });

    it.each(['/d/a.tqlx', '/d/x.sql', '/d/tql'])('%s is not a .tql file: nothing is opened', async (aPath) => {
        await open(aPath);
        expect(getFiles).not.toHaveBeenCalled();
        expect(sBoards.filter((aB) => aB.type === 'tql')).toHaveLength(0);
    });
});

describe('Open file delayed completion', () => {
    afterEach(() => jest.restoreAllMocks());
    it.each(['success', 'missing', 'transport'])('%s uses the live tab list after a late read', async outcome => {
        let update!: (value: any) => void, current: any[] = [];
        function Probe() {
            const [boards, set] = useRecoilState(gBoardList); current = boards; update = set;
            return null;
        }
        let release!: (value: any) => void;
        const reading = jest.spyOn(fileLoader, 'loadBoardFromFile').mockImplementation(() => new Promise(resolve => {release = resolve;}));
        const closed = {id: 'closed', type: 'sql', name: 'other.sql', path: '/', code: 'OLD', savedCode: 'OLD'};
        const keep = {id: 'keep', type: 'sql', name: 'SQL', path: '', code: 'KEEP', savedCode: ''};
        const newer = {...keep, id: 'newer', code: 'NEW DRAFT'};
        const error = jest.fn();
        render(<RecoilRoot initializeState={({set}) => set(gBoardList, [closed, keep] as any)}>
            <OpenFileBtn pType="tql" pFileInfo={{path: '/d/task.tql'}} pErrorCallback={error} /><Probe />
        </RecoilRoot>);
        fireEvent.click(screen.getByText('Open file'));
        expect(reading).toHaveBeenCalledTimes(1);
        const id = reading.mock.calls[0][1];
        act(() => update([keep, newer]));
        const loaded = {id, type: 'tql', name: 'task.tql', path: '/d/', code: 'CURRENT FILE', savedCode: 'CURRENT FILE'};
        await act(async () => release(outcome === 'success' ? {board: loaded} : {error: 'read unavailable', transport: outcome === 'transport'}));
        expect(current).toEqual(outcome === 'success' ? [keep, newer, loaded] : [keep, newer]);
        if (outcome !== 'success') expect(error).toHaveBeenLastCalledWith('read unavailable');
    });
});
