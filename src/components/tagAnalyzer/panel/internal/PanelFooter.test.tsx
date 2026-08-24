import { fireEvent, render, screen } from '@testing-library/react';
import { PanelFooter } from './PanelFooter';

describe('PanelFooter', () => {
    it('exposes stable IDs and preserves navigator behavior', () => {
        const onRangeButtonPress = jest.fn();
        const onOpenNavigatorRangeModal = jest.fn();
        const { rerender } = render(
            <PanelFooter
                pShowLegend={false}
                pNavigatorRange={{ start: 0, end: 10 }}
                pIsLoading={false}
                pOnRangeButtonPress={onRangeButtonPress}
                pIsNumericXAxis
                pOnOpenNavigatorRangeModal={onOpenNavigatorRangeModal}
            />,
        );

        expect(
            screen.getByTestId('footer'),
        ).toBeInTheDocument();
        [
            'zoom-in-large',
            'zoom-in-small',
            'focus',
            'zoom-out-small',
            'zoom-out-large',
        ].forEach((control) => {
            fireEvent.click(
                screen.getByTestId(
                    `navigator-${control}`,
                ),
            );
        });
        fireEvent.click(
            screen.getByTestId(
                'navigator-shift-backward',
            ),
        );
        fireEvent.click(
            screen.getByTestId(
                'navigator-shift-forward',
            ),
        );
        fireEvent.click(
            screen.getByTestId('navigator-range-start'),
        );
        fireEvent.click(
            screen.getByTestId('navigator-range-end'),
        );

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

        expect(
            screen.getByTestId('navigator-loading'),
        ).toHaveTextContent('Loading navigator...');
        expect(
            screen
                .getByTestId('footer')
                .querySelectorAll('button:disabled'),
        ).toHaveLength(9);
    });
});
