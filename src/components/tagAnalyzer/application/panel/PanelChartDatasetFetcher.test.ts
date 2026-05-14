import { calculateSampleCount } from './PanelChartDatasetFetcher';

describe('PanelChartDatasetFetcher', () => {
    describe('calculateSampleCount', () => {
        it('returns the explicit row limit when one is configured', () => {
            expect(calculateSampleCount(10, false, 20, 40, 500)).toBe(10);
        });

        it('uses raw pixels per tick for raw data', () => {
            expect(calculateSampleCount(-1, true, 10, 25, 500)).toBe(20);
        });

        it('caps raw data with the raw pixel setting even when sampling is disabled', () => {
            expect(calculateSampleCount(-1, true, 25, 10, 500)).toBe(50);
        });

        it('uses regular pixels per tick when sampling non-raw data', () => {
            expect(calculateSampleCount(-1, false, 25, 10, 500)).toBe(20);
        });
    });
});
