import { calculateSampleCount, getQualifiedTableName } from './FetchHelpers';

describe('FetchHelpers', () => {
    describe('getQualifiedTableName', () => {
        it('keeps fully qualified tables unchanged', () => {
            expect(getQualifiedTableName('APP.table_name', 'admin')).toBe('APP.table_name');
        });

        it('prefixes bare tables with the admin id', () => {
            expect(getQualifiedTableName('table_name', 'admin')).toBe('ADMIN.table_name');
        });
    });

    describe('calculateSampleCount', () => {
        it('returns -1 when the limit is already capped', () => {
            expect(calculateSampleCount(10, false, false, 20, 40, 500)).toBe(-1);
        });

        it('uses raw pixels per tick when sampling raw data', () => {
            expect(calculateSampleCount(-1, true, true, 10, 25, 500)).toBe(20);
        });

        it('uses regular pixels per tick when sampling non-raw data', () => {
            expect(calculateSampleCount(-1, false, false, 25, 10, 500)).toBe(20);
        });
    });
});
