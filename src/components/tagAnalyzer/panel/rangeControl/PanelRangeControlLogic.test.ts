import {
    createPanelRangeControlHandlers,
    getFocusedPanelRange,
    getMovedNavigatorRange,
    getMovedPanelRange,
    normalizeNavigatorRange,
    getZoomInPanelRange,
    getZoomOutRange,
} from './PanelRangeControlLogic';

describe('PanelRangeControlLogic', () => {
    describe('normalizeNavigatorRange', () => {
        it('enforces a minimum navigator span of one second', () => {
            expect(
                normalizeNavigatorRange({ startTime: 100, endTime: 500 }),
            ).toEqual({
                startTime: 100,
                endTime: 1100,
            });
        });

        it('uses the event max when the range is already wide enough', () => {
            expect(
                normalizeNavigatorRange({ startTime: 100, endTime: 1500 }),
            ).toEqual({
                startTime: 100,
                endTime: 1500,
            });
        });
    });

    describe('zoom helpers', () => {
        it('zooms in around the middle of the panel range', () => {
            expect(getZoomInPanelRange({ startTime: 0, endTime: 100 }, 0.25)).toEqual({
                startTime: 25,
                endTime: 75,
            });
        });

        it('keeps a minimum width when zooming in on a tiny range', () => {
            expect(getZoomInPanelRange({ startTime: 0, endTime: 5 }, 0.5)).toEqual({
                startTime: 2.5,
                endTime: 12.5,
            });
        });

        it('zooms out and extends the navigator when the new range escapes the current bounds', () => {
            expect(
                getZoomOutRange({ startTime: 10, endTime: 30 }, { startTime: 5, endTime: 40 }, 1),
            ).toEqual({
                panelRange: { startTime: 5, endTime: 50 },
                navigatorRange: { startTime: 5, endTime: 50 },
            });
        });

        it('focuses on the center of a sufficiently wide panel range and halves the slider range', () => {
            expect(
                getFocusedPanelRange(
                    { startTime: 0, endTime: 1000 },
                    { startTime: 0, endTime: 4000 },
                ),
            ).toEqual({
                panelRange: { startTime: 400, endTime: 600 },
                navigatorRange: { startTime: 0, endTime: 2000 },
            });
        });

        it('does not focus ranges narrower than one second', () => {
            expect(
                getFocusedPanelRange(
                    { startTime: 0, endTime: 999 },
                    { startTime: 0, endTime: 4000 },
                ),
            ).toBeUndefined();
        });

        it('builds separate shift and zoom handlers around the shared setter', () => {
            const sSetExtremes = jest.fn();
            const { shiftHandlers, zoomHandlers } = createPanelRangeControlHandlers(
                sSetExtremes,
                { startTime: 1_000, endTime: 2_000 },
                { startTime: 800, endTime: 2_200 },
            );

            shiftHandlers.onShiftPanelRangeRight();
            shiftHandlers.onShiftNavigatorRangeLeft();
            zoomHandlers.onZoomIn(0.25);
            zoomHandlers.onZoomOut(0.5);
            zoomHandlers.onFocus();

            expect(sSetExtremes).toHaveBeenNthCalledWith(
                1,
                { startTime: 1_500, endTime: 2_500 },
                { startTime: 1_300, endTime: 2_500 },
            );
            expect(sSetExtremes).toHaveBeenNthCalledWith(
                2,
                { startTime: 300, endTime: 1_300 },
                { startTime: 100, endTime: 1_500 },
            );
            expect(sSetExtremes).toHaveBeenNthCalledWith(
                3,
                { startTime: 1_250, endTime: 1_750 },
                undefined,
            );
            expect(sSetExtremes).toHaveBeenNthCalledWith(
                4,
                { startTime: 500, endTime: 2_500 },
                { startTime: 500, endTime: 2_500 },
            );
            expect(sSetExtremes).toHaveBeenNthCalledWith(
                5,
                { startTime: 1_400, endTime: 1_600 },
                { startTime: 1_000, endTime: 2_000 },
            );
        });
    });

    describe('move helpers', () => {
        it('moves the panel range left and extends the navigator when needed', () => {
            expect(
                getMovedPanelRange(
                    { startTime: 100, endTime: 200 },
                    { startTime: 120, endTime: 220 },
                    'left',
                ),
            ).toEqual({
                panelRange: { startTime: 50, endTime: 150 },
                navigatorRange: { startTime: 50, endTime: 170 },
            });
        });

        it('moves the panel range right and extends the navigator when needed', () => {
            expect(
                getMovedPanelRange(
                    { startTime: 100, endTime: 200 },
                    { startTime: 80, endTime: 180 },
                    'right',
                ),
            ).toEqual({
                panelRange: { startTime: 150, endTime: 250 },
                navigatorRange: { startTime: 130, endTime: 250 },
            });
        });

        it('moves the navigator left and keeps the main panel within view', () => {
            expect(
                getMovedNavigatorRange(
                    { startTime: 120, endTime: 180 },
                    { startTime: 100, endTime: 200 },
                    'left',
                ),
            ).toEqual({
                panelRange: { startTime: 70, endTime: 130 },
                navigatorRange: { startTime: 50, endTime: 150 },
            });
        });

        it('moves the navigator right and shifts the panel when it falls behind', () => {
            expect(
                getMovedNavigatorRange(
                    { startTime: 100, endTime: 160 },
                    { startTime: 90, endTime: 150 },
                    'right',
                ),
            ).toEqual({
                panelRange: { startTime: 130, endTime: 190 },
                navigatorRange: { startTime: 120, endTime: 180 },
            });
        });
    });
});
