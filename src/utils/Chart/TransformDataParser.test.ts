import { TRX_PARSER, TRX_REPLACE_LIST } from './TransformDataParser';
import { TRX_PARSER as PUBLIC_TRX_PARSER } from '../../public-dashboard/utils/Chart/TransformDataParser';

// #1566 (F-82): a panel holds up to 12 query blocks, and each can be named by its letter in a Transform formula.
const queries = Array.from({ length: 12 }, (_, idx) => ({ idx, sql: `SELECT TIME, VALUE FROM T WHERE NAME = 't${idx}'`, tql: '' }));
const transform = (aBlockIdx: number, aFormula: string) => ({ id: 'tr', alias: aFormula, color: '#000', value: aFormula, valid: true, isVisible: true, selectedBlockIdxList: [aBlockIdx] });

describe.each([
    ['editor', TRX_PARSER],
    ['public', PUBLIC_TRX_PARSER],
])('%s Transform letters', (_, parse) => {
    test('every one of the 12 blocks has a letter', () => {
        expect(TRX_REPLACE_LIST).toHaveLength(12);
        expect(TRX_REPLACE_LIST[11]).toBe('L');
    });

    test.each([
        [10, 'K * 2'],
        [11, 'L * 2'],
    ])('block %i written as %s becomes value(1)', (aBlockIdx, aFormula) => {
        const [, trx]: any = parse('line', 'TIME_VALUE', [transform(aBlockIdx, aFormula)] as any, queries, undefined, false);
        expect(trx[0].query).toContain('MAPVALUE(1, value(1) * 2)');
        expect(trx[0].query).toContain(`'t${aBlockIdx}'`);
    });
});
