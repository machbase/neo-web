// OpenFileBtn picked the file only when the last segment contained `.${pType}` — case-sensitive and anywhere in the
// name: `X.TQL` did nothing, `a.tqlx` was opened as a tql (issue-1544 r20 M4).
import { render, screen, fireEvent, act } from '@testing-library/react';
import { RecoilRoot, useRecoilValue } from 'recoil';
import { OpenFileBtn } from './OpenFileBtn';
import { getFiles } from '@/api/repository/fileTree';
import { gBoardList } from '@/recoil/recoil';

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
