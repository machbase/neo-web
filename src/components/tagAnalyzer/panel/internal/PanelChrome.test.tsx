import { fireEvent, render, screen } from '@testing-library/react';
import {
    PanelActionKey,
    PanelContextMenu,
    PanelFooter,
    PanelHeader,
} from './PanelChrome';

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

const HEADER_STATE = {
    title: 'Initial title',
    range: {
        label: '0 ~ 10',
        actionLabel: 'Set current visible main chart value range',
    },
    resolution: { label: '1', kind: 'numeric' as const },
    seriesRollupStatusList: [],
    actionState: { active: [], disabled: [] },
    canExportCsv: true,
    isOverlapSelected: false,
};

describe('PanelChrome', () => {
    it('preserves the panel header title and direct-control behavior', () => {
        const onAction = jest.fn();
        const onToggleOverlap = jest.fn();
        const onRenamePanelTitle = jest.fn();
        const onOpenMainRangeModal = jest.fn();
        const { container } = render(
            <PanelHeader
                state={HEADER_STATE}
                onAction={onAction}
                onToggleOverlap={onToggleOverlap}
                onRenamePanelTitle={onRenamePanelTitle}
                onOpenMainRangeModal={onOpenMainRangeModal}
            />,
        );

        expect(container.firstElementChild).toHaveClass('panel-header');
        fireEvent.click(
            screen.getByRole('button', {
                name: 'Initial title',
            }),
        );
        const titleInput = screen.getByRole('textbox', {
            name: 'Chart title',
        });
        fireEvent.change(titleInput, { target: { value: 'Renamed title' } });
        fireEvent.keyDown(titleInput, { key: 'Enter' });

        expect(onRenamePanelTitle).toHaveBeenCalledWith('Renamed title');
        fireEvent.click(
            screen.getByRole('button', {
                name: 'Add to overlap chart',
            }),
        );
        fireEvent.click(
            screen.getByRole('button', {
                name: 'Set current visible main chart value range',
            }),
        );
        expect(onToggleOverlap).toHaveBeenCalledTimes(1);
        expect(onOpenMainRangeModal).toHaveBeenCalledTimes(1);

        fireEvent.click(
            screen.getByRole('button', { name: 'Extra panel actions' }),
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'Set global range' }),
        );
        expect(onAction).toHaveBeenCalledWith(
            PanelActionKey.SET_GLOBAL_RANGE,
        );
    });

    it('closes the context menu before dispatching its selected action', () => {
        const onClose = jest.fn();
        const onAction = jest.fn();
        render(
            <PanelContextMenu
                actionState={HEADER_STATE.actionState}
                position={{ x: 10, y: 20 }}
                onClose={onClose}
                onAction={onAction}
            />,
        );

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Enable raw data mode',
            }),
        );

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onAction).toHaveBeenCalledWith(PanelActionKey.TOGGLE_RAW);
        expect(onClose.mock.invocationCallOrder[0]).toBeLessThan(
            onAction.mock.invocationCallOrder[0],
        );
    });

    it('preserves navigator actions, range labels, and loading disablement', () => {
        const onRangeButtonPress = jest.fn();
        const onOpenNavigatorRangeModal = jest.fn();
        const { container, rerender } = render(
            <PanelFooter
                pShowLegend={false}
                pNavigatorRange={{ start: 0, end: 10 }}
                pIsLoading={false}
                pOnRangeButtonPress={onRangeButtonPress}
                pIsNumericXAxis
                pOnOpenNavigatorRangeModal={onOpenNavigatorRangeModal}
            />,
        );

        const toolbarButtons = container.querySelectorAll(
            '.toolbar-controls button',
        );
        toolbarButtons.forEach((button) => fireEvent.click(button));
        const shiftButtons = container.querySelectorAll(
            '.navigator-shift-controls button',
        );
        shiftButtons.forEach((button) => fireEvent.click(button));
        const rangeLabels = container.querySelectorAll('.range-label');
        rangeLabels.forEach((button) => fireEvent.click(button));

        expect(onRangeButtonPress.mock.calls.map(([action]) => action)).toEqual([
            'zoom-in-large',
            'zoom-in-small',
            'focus',
            'zoom-out-small',
            'zoom-out-large',
            'shift-navigator-left',
            'shift-navigator-right',
        ]);
        expect(onOpenNavigatorRangeModal).toHaveBeenCalledTimes(2);
        expect(Array.from(rangeLabels, (label) => label.textContent)).toEqual([
            '0',
            '10',
        ]);

        rerender(
            <PanelFooter
                pShowLegend={false}
                pNavigatorRange={{ start: 0, end: 10 }}
                pIsLoading
                pOnRangeButtonPress={onRangeButtonPress}
                pIsNumericXAxis
                pOnOpenNavigatorRangeModal={onOpenNavigatorRangeModal}
            />,
        );

        expect(screen.getByText('Loading navigator...')).toBeInTheDocument();
        expect(container.querySelectorAll('button:disabled')).toHaveLength(9);
    });
});
