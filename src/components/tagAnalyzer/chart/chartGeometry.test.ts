import {
    extractDataZoomEventRange,
    getPanelChartEventCoordinates,
} from './chartGeometry';

describe('panel chart geometry boundaries', () => {
    it('preserves pointer-coordinate fallback order', () => {
        const chartRect = {
            left: 100,
            top: 200,
        } as DOMRect;

        expect(getPanelChartEventCoordinates({
            zrX: 12,
            event: {
                clientX: 140,
                clientY: 250,
                zrX: 99,
                zrY: 18,
            },
        }, chartRect)).toEqual({
            pixel: [12, 18],
            position: { x: 140, y: 250 },
        });
    });

    it('uses the selected data-zoom batch item before fallback state', () => {
        expect(extractDataZoomEventRange(
            {
                batch: [
                    { id: 'other', start: 0, end: 100 },
                    { id: 'target', startValue: 40, endValue: 20 },
                ],
            },
            { start: 10, end: 30 },
            { start: 0, end: 100 },
            'target',
            { startValue: 1, endValue: 2 },
        )).toEqual({ start: 20, end: 40 });
    });
});
