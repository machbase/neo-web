// Variable editor (EDIT): a saved name is always wrapped as {{name}}, whatever else the edit changed.
// Covers: dsh-variable-edit-normalize-name, dsh-var-table-no-raw-json, dsh-var-table-row-edit-delete.
jest.mock('@/api/repository/api', () => ({ postFileList: jest.fn() }));

import { fireEvent, render, screen, within } from '@testing-library/react';
import { RecoilRoot, useRecoilValue } from 'recoil';
import { gBoardList } from '@/recoil/recoil';
import { Variable } from './index';

const BOARD_ID = 'board-1';

const OTHER_VARIABLE = {
    id: 'v2',
    label: 'UnitLabel',
    type: 'SELECT',
    key: '{{unit}}',
    use: { id: 'c', type: 'CSV', value: 'c' },
    valueList: [
        { id: 'c', type: 'CSV', value: 'c' },
        { id: 'f', type: 'CSV', value: 'f' },
    ],
};

const makeBoard = (aExtraVariables: any[] = []) => ({
    id: BOARD_ID,
    type: 'dsh',
    name: 'var.dsh',
    path: '',
    savedCode: false,
    dashboard: {
        title: 'var',
        timeRange: { start: 'now-1h', end: 'now', refresh: 'Off' },
        distanceRange: { start: '', end: '' },
        panels: [],
        variables: [
            {
                id: 'v1',
                label: 'TagLabel',
                type: 'SELECT',
                key: '{{tag}}',
                use: { id: 'a', type: 'CSV', value: 'A' },
                valueList: [
                    { id: 'a', type: 'CSV', value: 'A' },
                    { id: 'b', type: 'CSV', value: 'B' },
                ],
            },
            ...aExtraVariables,
        ],
    },
});

// The editor writes through gBoardList and reads the board back from its prop, as the dashboard passes it.
const BoardVariable = () => {
    const sBoardList = useRecoilValue(gBoardList);
    return <Variable pBoardInfo={sBoardList.find((aItem) => aItem.id === BOARD_ID)} pSetModal={jest.fn()} />;
};

const renderEditor = (aExtraVariables: any[] = []) => {
    render(
        <RecoilRoot initializeState={({ set }) => set(gBoardList, [makeBoard(aExtraVariables) as any])}>
            <BoardVariable />
        </RecoilRoot>
    );
};

const openVariable = () => fireEvent.click(screen.getByText('TagLabel'));

const renameTo = (aName: string) => fireEvent.change(screen.getByDisplayValue('{{tag}}'), { target: { value: aName } });

const deleteValueRow = (aValue: string) => {
    const sRow = screen.getByDisplayValue(aValue).closest('div:has(button)') as HTMLElement;
    fireEvent.click(within(sRow).getAllByRole('button')[0]);
};

describe('variable editor saves a normalized name', () => {
    it('wraps a renamed variable as {{name}}', () => {
        renderEditor();
        openVariable();
        renameTo('tag2');
        fireEvent.click(screen.getByText('Save'));

        expect(screen.getByText('{{tag2}}')).toBeInTheDocument();
    });

    it('wraps a renamed variable as {{name}} after its selected value is deleted', () => {
        renderEditor();
        openVariable();
        deleteValueRow('A');
        renameTo('tag2');
        fireEvent.click(screen.getByText('Save'));

        expect(screen.getByText('{{tag2}}')).toBeInTheDocument();
        expect(screen.queryByText('tag2')).not.toBeInTheDocument();
    });
});

describe('variable table', () => {
    it('shows label, name, and values only', () => {
        renderEditor();
        const sRow = screen.getByTestId('variable-v1');

        const sDataCells = Array.from(sRow.querySelectorAll('td')).filter((aCell) => !aCell.classList.contains('action'));
        expect(sDataCells.map((aCell) => aCell.textContent)).toEqual(['TagLabel', '{{tag}}', 'A, B']);
        expect(sRow).not.toHaveTextContent('valueList');
    });

    it('opens the variable of the clicked row', () => {
        renderEditor([OTHER_VARIABLE]);
        fireEvent.click(screen.getByText('UnitLabel'));

        expect(screen.getByDisplayValue('{{unit}}')).toBeInTheDocument();
        expect(screen.getByDisplayValue('f')).toBeInTheDocument();
    });

    it('deletes only the variable of its row', () => {
        renderEditor([OTHER_VARIABLE]);
        fireEvent.click(within(screen.getByTestId('variable-v2')).getByTestId('delete'));

        expect(screen.queryByTestId('variable-v2')).not.toBeInTheDocument();
        expect(screen.getByTestId('variable-v1')).toHaveTextContent('{{tag}}');
    });
});
