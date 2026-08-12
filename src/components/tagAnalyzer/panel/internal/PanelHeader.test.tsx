import { fireEvent, render, screen } from '@testing-library/react';
import { PanelHeader, type PanelHeaderState } from './PanelHeader';
import { PanelActionKey } from './panelActions';

beforeAll(() => {
    global.ResizeObserver = class {
        observe() {
            return undefined;
        }

        unobserve() {
            return undefined;
        }

        disconnect() {
            return undefined;
        }
    };
});

const HEADER_STATE: PanelHeaderState = {
    title: 'Initial title',
    mainRange: { start: 0, end: 10 },
    isNumericXAxis: true,
    isRaw: false,
    resolution: { kind: 'numeric', bucketWidth: 1 },
    seriesRollupStatusList: [],
    actionState: { active: [], disabled: [] },
    canExportCsv: true,
    isOverlapSelected: false,
};

describe('PanelHeader', () => {
    it('exposes stable IDs and preserves direct-control behavior', () => {
        const onAction = jest.fn();
        const onToggleOverlap = jest.fn();
        const onRenamePanelTitle = jest.fn();
        const onOpenMainRangeModal = jest.fn();
        render(
            <PanelHeader
                state={HEADER_STATE}
                onAction={onAction}
                onToggleOverlap={onToggleOverlap}
                onRenamePanelTitle={onRenamePanelTitle}
                onOpenMainRangeModal={onOpenMainRangeModal}
            />,
        );

        expect(
            screen.getByTestId('header'),
        ).toHaveClass('panel-header');
        fireEvent.click(
            screen.getByTestId('title-button'),
        );
        const titleInput = screen.getByTestId(
            'title-input',
        );
        fireEvent.change(titleInput, { target: { value: 'Renamed title' } });
        fireEvent.keyDown(titleInput, { key: 'Enter' });

        expect(onRenamePanelTitle).toHaveBeenCalledWith('Renamed title');
        fireEvent.click(
            screen.getByTestId('overlap-toggle'),
        );
        fireEvent.click(
            screen.getByTestId('main-range-button'),
        );
        expect(onToggleOverlap).toHaveBeenCalledTimes(1);
        expect(onOpenMainRangeModal).toHaveBeenCalledTimes(1);

        fireEvent.click(
            screen.getByRole('button', { name: 'Extra panel actions' }),
        );
        expect(
            screen.getByRole('button', { name: 'Set global range' }),
        ).toBeInTheDocument();
        fireEvent.click(
            screen.getByRole('button', { name: 'Set global range' }),
        );
        expect(onAction).toHaveBeenCalledWith(
            PanelActionKey.SET_GLOBAL_RANGE,
        );
    });
});
