// Variables window (header button): every value picked before Apply is applied, not only the last (#1566 F-137).
import { fireEvent, render, screen } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { VariableHeader } from './header';
import { VariableHeader as PublicVariableHeader } from '@/public-dashboard/components/variable/VariableHeader';

const variable = (id: string, label: string, key: string, values: string[]) => ({
    id,
    label,
    key,
    type: 'SELECT',
    use: { id: `${id}-0`, type: 'CSV', value: values[0] },
    valueList: values.map((value, idx) => ({ id: `${id}-${idx}`, type: 'CSV', value })),
});

const board = {
    id: 'board-1',
    dashboard: {
        variables: [variable('v-tag', 'Tag', '{{tag}}', ['tag-a', 'tag-b']), variable('v-agg', 'Aggregator', '{{agg}}', ['avg', 'max', 'min'])],
    },
};

// By visible text: the public copy carries no test ids. The trigger shows the current value.
const pick = (aCurrent: string, aValue: string) => {
    fireEvent.click(screen.getByText(aCurrent));
    const sOptions = screen.getAllByText(aValue);
    fireEvent.click(sOptions[sOptions.length - 1]);
};

describe.each([
    ['editor', (cb: jest.Mock) => <VariableHeader pBoardInfo={board} pSelectVariable="ALL" pViewMode callback={cb} />],
    ['public', (cb: jest.Mock) => <PublicVariableHeader pBoardInfo={board} pSelectVariable="ALL" callback={cb} />],
])('%s Variables window', (_, renderHeader) => {
    it('keeps an earlier pick when a second variable is changed', () => {
        const sCallback = jest.fn();
        render(<RecoilRoot>{renderHeader(sCallback)}</RecoilRoot>);
        pick('tag-a', 'tag-b');
        pick('avg', 'max');
        expect(screen.getByText('tag-b')).toBeInTheDocument();
        expect(screen.queryByText('tag-a')).toBeNull();
        fireEvent.click(screen.getByText('Apply'));
        const [sApplied] = sCallback.mock.calls[0];
        expect(sApplied.map((v: any) => v.use.value)).toEqual(['tag-b', 'max']);
    });
});
