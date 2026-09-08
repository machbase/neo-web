import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RecoilRoot } from 'recoil';
import TimeRangeModal from './TimeRangeModal';

const renderModal = (allowNegative: boolean) => {
    const save = jest.fn();
    render(
        <RecoilRoot>
            <TimeRangeModal
                pStartTime={-1000}
                pEndTime={1000}
                pSetTime={() => undefined}
                pSetTimeRangeModal={() => undefined}
                pSaveCallback={save}
                pLockTab="time"
                pAllowNegativeTime={allowNegative}
            />
        </RecoilRoot>
    );
    return save;
};

describe('TimeRangeModal negative timestamp opt-in', () => {
    test('allows a pre-1970 timestamp only when the caller opts in', () => {
        const save = renderModal(true);

        fireEvent.click(screen.getByText('Apply'));

        expect(save).toHaveBeenCalledWith(-1000, 1000);
    });

    test('keeps the existing negative timestamp rejection by default', () => {
        const save = renderModal(false);

        fireEvent.click(screen.getByText('Apply'));

        expect(save).not.toHaveBeenCalled();
    });
});
