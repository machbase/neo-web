// The shared name question behind every overwrite / clone confirm (issue-1544 r20 L3/L4).
import { useState } from 'react';
import { render, screen, fireEvent, act, waitFor, within } from '@testing-library/react';
import { useOverwritePrompt } from './useOverwritePrompt';

const Harness = ({ onResult }: { onResult: (aOk: boolean) => void }) => {
    const { ask, prompt } = useOverwritePrompt();
    const [sCount, setCount] = useState(0);
    return (
        <div>
            <button
                data-testid="save"
                onClick={() => {
                    setCount((c) => c + 1);
                    ask('a.sql').then(onResult);
                }}
            >
                save {sCount}
            </button>
            <input data-testid="other" />
            {prompt}
        </div>
    );
};

describe('useOverwritePrompt', () => {
    it('L3: a second ask while one is pending resolves false at once; the first still waits for the user', async () => {
        const sResults: boolean[] = [];
        render(<Harness onResult={(aOk) => sResults.push(aOk)} />);
        await act(async () => {
            fireEvent.click(screen.getByTestId('save'));
        });
        await act(async () => {
            fireEvent.click(screen.getByTestId('save'));
        });
        // the double click answered "no" for the second save only
        expect(sResults).toEqual([false]);
        expect(screen.getAllByTestId('file-overwrite-dialog')).toHaveLength(1);
        await act(async () => {
            fireEvent.click(within(screen.getByTestId('file-overwrite-dialog')).getByTestId('confirm'));
        });
        expect(sResults).toEqual([false, true]);
    });

    it('L3: a double OK on the question resolves once', async () => {
        const sOnResult = jest.fn();
        render(<Harness onResult={sOnResult} />);
        await act(async () => {
            fireEvent.click(screen.getByTestId('save'));
        });
        const sOk = within(screen.getByTestId('file-overwrite-dialog')).getByTestId('confirm');
        await act(async () => {
            fireEvent.click(sOk);
            fireEvent.click(sOk);
        });
        expect(sOnResult).toHaveBeenCalledTimes(1);
        expect(sOnResult).toHaveBeenCalledWith(true);
    });

    it('L4: focus returns to the element focused before the question when it closes', async () => {
        render(<Harness onResult={jest.fn()} />);
        const sSave = screen.getByTestId('save');
        sSave.focus();
        await act(async () => {
            fireEvent.click(sSave);
        });
        // the dialog takes focus (Cancel is autoFocus)
        expect(document.activeElement).not.toBe(sSave);
        await act(async () => {
            fireEvent.click(within(screen.getByTestId('file-overwrite-dialog')).getByTestId('cancel'));
        });
        await waitFor(() => expect(screen.queryByTestId('file-overwrite-dialog')).toBeNull());
        expect(document.activeElement).toBe(sSave);
    });
});
