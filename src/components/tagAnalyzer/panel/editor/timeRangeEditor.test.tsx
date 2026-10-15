import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { PanelInfo } from '../panelModel';
import { RangeModal } from '../rangeControl/RangeModal';
import EditorRangeTab from './tabs/EditorRangeTab';

const dataRange = { start: 1_700_000_000_000, end: 1_700_086_400_000 };
const currentRange = { start: dataRange.start, end: dataRange.start + 60_000 };

function renderModal() {
    const onApply = jest.fn();
    const onClose = jest.fn();
    render(<RangeModal kind="time" initialRangeInput={{ start: 'first', end: 'last' }}
        currentRange={currentRange} fullRange={dataRange} onApply={onApply} onClose={onClose} />);
    return { onApply, onClose };
}

test('the modal validates both fields and waits for Apply before changing the range', () => {
    const { onApply, onClose } = renderModal();
    const from = screen.getByTestId('tag-analyzer-range-from-input');
    fireEvent.change(from, { target: { value: '' } });
    fireEvent.click(screen.getByTestId('tag-analyzer-range-apply-button'));
    expect(screen.getByRole('alert')).toHaveTextContent('enter both From and To');
    expect(screen.getByRole('group', { name: 'From date and time' })).toHaveAttribute('aria-invalid', 'true');
    expect(onApply).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.change(from, { target: { value: 'first' } });
    fireEvent.change(screen.getByTestId('tag-analyzer-range-to-input'), { target: { value: 'first+5s' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(onApply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('tag-analyzer-range-apply-button'));
    expect(onApply).toHaveBeenCalledWith({ start: 'first', end: 'first+5s' }, { start: dataRange.start, end: dataRange.start + 5_000 });
    expect(onClose).toHaveBeenCalledTimes(1);
});

test('the modal keeps presets and reset pending until Apply, preserving automatic range behavior', () => {
    const { onApply } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'First 5 seconds of data' }));
    expect(screen.getByTestId('tag-analyzer-range-to-input')).toHaveValue('first+5s');
    expect(onApply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByTestId('tag-analyzer-range-from-input')).toHaveValue('');
    expect(screen.getByTestId('tag-analyzer-range-to-input')).toHaveValue('');
    fireEvent.click(screen.getByTestId('tag-analyzer-range-apply-button'));
    expect(onApply).toHaveBeenCalledWith({ start: '', end: '' }, currentRange);
});

test('the editor keeps its partial-input validation and updates its draft from the shared fields and presets', () => {
    const onChange = jest.fn();
    function Editor() {
        const [time, setTime] = useState<PanelInfo['time']>({
            rangeInput: { start: 'first', end: 'last' },
            useLastViewedRange: false,
            lastViewedRange: undefined,
        });
        return <EditorRangeTab pTimeConfig={time} pAxisKind="time" pDataRange={dataRange}
            pMainRange={currentRange} pNavigatorRange={dataRange} pIsActive
            pOnChangeTimeConfig={(next) => { onChange(next); setTime(next); }} />;
    }
    render(<Editor />);
    const main = within(screen.getByTestId('editor-main-range'));
    fireEvent.change(main.getByRole('textbox', { name: 'From' }), { target: { value: '' } });
    expect(main.queryByText('Enter both range boundaries in a valid order.')).not.toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ rangeInput: { start: '', end: 'last' } }));
    fireEvent.change(main.getByRole('textbox', { name: 'From' }), { target: { value: 'invalid' } });
    expect(main.getByText('Enter both range boundaries in a valid order.')).toHaveTextContent('valid order');
    fireEvent.click(main.getByRole('button', { name: 'First 5 seconds of data' }));
    expect(main.queryByText('Enter both range boundaries in a valid order.')).not.toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ rangeInput: { start: 'first', end: 'first+5s' } }));
    fireEvent.click(main.getByRole('button', { name: 'Reset' }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ rangeInput: { start: '', end: '' } }));
});
