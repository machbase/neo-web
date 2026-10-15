import { getWorksheetCellLoadError } from './worksheetCell';

describe('getWorksheetCellLoadError', () => {
    it.each([null, 'x', 7, []])('rejects a cell that is not a cell object: %j', (aCell) => {
        expect(getWorksheetCellLoadError(aCell)).toEqual(expect.any(String));
    });

    it.each([7, {}, []])('rejects contents that are not text: %j', (aContents) => {
        expect(getWorksheetCellLoadError({ id: 'c', contents: aContents })).toEqual(expect.any(String));
    });

    it.each([{ id: 'c', contents: '# text' }, { id: 'c', contents: '' }, { id: 'c' }, { id: 'c', contents: null }])('accepts %j', (aCell) => {
        expect(getWorksheetCellLoadError(aCell)).toBeUndefined();
    });
});
