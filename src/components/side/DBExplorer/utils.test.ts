import { canOpenTagAnalyzerFromMetaColumns } from './utils';

describe('canOpenTagAnalyzerFromMetaColumns', () => {
    test('allows numeric default value column', () => {
        expect(
            canOpenTagAnalyzerFromMetaColumns([
                ['NAME', 'varchar'],
                ['TIME', 'datetime'],
                ['VALUE', 'double'],
            ])
        ).toBe(true);
    });

    test('blocks JSON default value column', () => {
        expect(
            canOpenTagAnalyzerFromMetaColumns([
                ['NAME', 'varchar'],
                ['TIME', 'datetime'],
                ['PAYLOAD', 'json'],
            ])
        ).toBe(false);
        expect(
            canOpenTagAnalyzerFromMetaColumns([
                ['NAME', 5],
                ['TIME', 6],
                ['PAYLOAD', 61],
            ])
        ).toBe(false);
    });

    test('blocks BINARY default value column', () => {
        expect(
            canOpenTagAnalyzerFromMetaColumns([
                ['NAME', 'varchar'],
                ['TIME', 'datetime'],
                ['FRAME', 'binary'],
            ])
        ).toBe(false);
        expect(
            canOpenTagAnalyzerFromMetaColumns([
                ['NAME', 5],
                ['TIME', 6],
                ['FRAME', 97],
            ])
        ).toBe(false);
    });

    test('blocks when default value column is missing', () => {
        expect(
            canOpenTagAnalyzerFromMetaColumns([
                ['NAME', 'varchar'],
                ['TIME', 'datetime'],
            ])
        ).toBe(false);
    });
});
