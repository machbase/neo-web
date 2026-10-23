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

// #1565: the order check #1561 added refused a single-point range in the Data Viewer, which reads it.
describe('TimeRangeModal point range opt-in', () => {
    const renderPoint = (aTab: 'time' | 'distance', aAllowPoint: boolean) => {
        const save = jest.fn();
        render(
            <RecoilRoot>
                <TimeRangeModal
                    pStartTime={aTab === 'time' ? 1767225600000 : 50}
                    pEndTime={aTab === 'time' ? 1767225600000 : 50}
                    pSetTime={() => undefined}
                    pSetTimeRangeModal={() => undefined}
                    pSaveCallback={save}
                    pLockTab={aTab}
                    pAllowPointRange={aAllowPoint}
                />
            </RecoilRoot>
        );
        return save;
    };

    test.each(['time', 'distance'] as const)('applies a %s range whose edges are the same point when the caller opts in', (aTab) => {
        const save = renderPoint(aTab, true);
        fireEvent.click(screen.getByText('Apply'));
        expect(save).toHaveBeenCalledWith(...(aTab === 'time' ? [1767225600000, 1767225600000] : [50, 50]));
    });

    test.each(['time', 'distance'] as const)('keeps refusing a %s point range by default', (aTab) => {
        const save = renderPoint(aTab, false);
        fireEvent.click(screen.getByText('Apply'));
        expect(save).not.toHaveBeenCalled();
    });
});
