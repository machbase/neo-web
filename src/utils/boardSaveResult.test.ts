import { applyBoardSaveResult, getBoardSaveData, hasBoardContentChanged } from './boardSaveResult';
import { isBoardSaved } from './boardSaveStatus';
import { createTazBoardSnapshot } from '@/components/tagAnalyzer/persistence/tazBoardSnapshot';

it.each(['sql', 'tql', 'txt'])('%s keeps later edits dirty against the submitted snapshot', (type) => {
    const current = { type, code: 'LATER EDIT', savedCode: 'OLD' };
    const result = applyBoardSaveResult(current, type, 'SUBMITTED');
    expect(result.code).toBe('LATER EDIT');
    expect(result.savedCode).toBe('SUBMITTED');
    expect(isBoardSaved(result)).toBe(false);
    expect(isBoardSaved({ ...result, code: 'SUBMITTED' })).toBe(true);
});

it('normalizes an unchanged JSON object, while preserving later text edits', () => {
    const submitted = { value: 1 };
    const current = { type: 'json', code: submitted, savedCode: '' };
    const saved = applyBoardSaveResult(current, 'json', submitted);
    expect(saved.code).toBe(JSON.stringify(submitted, null, 4));
    expect(isBoardSaved(saved)).toBe(true);
    const edited = applyBoardSaveResult({ ...current, code: '{"value":2}' }, 'json', submitted);
    expect(edited.code).toBe('{"value":2}');
    expect(isBoardSaved(edited)).toBe(false);
});

it('keeps current worksheet cells instead of restoring the submitted cells', () => {
    const current = { type: 'wrk', code: '', savedCode: '', sheet: [{ contents: 'LATER' }] };
    const submitted = { data: [{ contents: 'SUBMITTED' }] };
    const saved = applyBoardSaveResult(current, 'wrk', submitted);
    expect(saved.sheet).toBe(current.sheet);
    expect(saved.savedCode).toBe(JSON.stringify(submitted.data));
    expect(isBoardSaved(saved)).toBe(false);
});

it('keeps current dashboard settings dirty against the submitted dashboard', () => {
    const current = { type: 'dsh', code: '', savedCode: '', dashboard: { title: 'LATER', panels: [] } };
    const submitted = { ...current, dashboard: { title: 'SUBMITTED', panels: [] } };
    const saved = applyBoardSaveResult(current, 'dsh', submitted);
    expect(saved.dashboard).toBe(current.dashboard);
    expect(saved.savedCode).toBe(JSON.stringify(submitted.dashboard));
    expect(isBoardSaved(saved)).toBe(false);
});

it('keeps TAZ range edits and applies the existing saved snapshot metadata', () => {
    const submitted = createTazBoardSnapshot({
        id: 'tab', name: 'board.taz', path: '/', type: 'taz', version: '2.1.0', code: '',
        boardTimeRange: { start: 'now-1h', end: 'now' }, boardNumericRange: { start: '', end: '' }, panels: [], savedCode: false,
    });
    const current = { ...submitted, boardTimeRange: { start: 'now-2h', end: 'now' } };
    const saved = applyBoardSaveResult(current, 'taz', submitted);
    expect(saved.boardTimeRange).toBe(current.boardTimeRange);
    expect(saved.panels).toBe(current.panels);
    expect(isBoardSaved(saved)).toBe(false);
    expect(isBoardSaved(submitted)).toBe(true);
});


it.each(['sql', 'tql', 'json', 'txt'])('%s compares a later draft against the approved content, not its old saved baseline', type => {
    const previous = { type, code: 'APPROVED UNSAVED', savedCode: 'OLDER FILE' };
    expect(hasBoardContentChanged({ ...previous }, previous)).toBe(false);
    expect(hasBoardContentChanged({ ...previous, code: 'AFTER CONFIRM' }, previous)).toBe(true);
});

it('uses the existing WRK comparison for contents, cell order and settings', () => {
    const previous = { type: 'wrk', code: '', savedCode: false, sheet: [{ id: 'one', contents: 'A', height: 200 }, { id: 'two', contents: 'B' }] };
    expect(getBoardSaveData(previous)).toEqual({ data: previous.sheet });
    expect(hasBoardContentChanged({ ...previous }, previous)).toBe(false);
    expect(hasBoardContentChanged({ ...previous, sheet: [...previous.sheet].reverse() }, previous)).toBe(true);
    expect(hasBoardContentChanged({ ...previous, sheet: previous.sheet.map(cell => ({ ...cell, height: 300 })) }, previous)).toBe(true);
});

it('uses the existing dashboard and TAZ snapshot criteria', () => {
    const dashboard = { type: 'dsh', code: '', savedCode: false, dashboard: { title: 'APPROVED', panels: [] } };
    expect(hasBoardContentChanged({ ...dashboard }, dashboard)).toBe(false);
    expect(hasBoardContentChanged({ ...dashboard, dashboard: { ...dashboard.dashboard, title: 'LATER' } }, dashboard)).toBe(true);
    const analyzer = { id: 'taz', type: 'taz', name: 'a.taz', path: '/', version: '2.1.0', code: '', panels: [], savedCode: false,
        boardTimeRange: { start: 'now-1h', end: 'now' }, boardNumericRange: { start: '', end: '' } };
    expect(hasBoardContentChanged({ ...analyzer }, analyzer)).toBe(false);
    expect(hasBoardContentChanged({ ...analyzer, boardTimeRange: { start: 'now-2h', end: 'now' } }, analyzer)).toBe(true);
});
