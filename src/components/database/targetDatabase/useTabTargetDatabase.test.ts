import { act, renderHook } from '@testing-library/react';
import { useTabTargetDatabase } from './useTabTargetDatabase';
import { useTargetDatabases, TargetDatabaseEntry } from './useTargetDatabases';
import { applyTargetDatabase } from '@/utils/sqlTargetDatabase';

jest.mock('./useTargetDatabases', () => ({ useTargetDatabases: jest.fn() }));

const mockCatalogue = useTargetDatabases as jest.MockedFunction<typeof useTargetDatabases>;
const database = (name: string): TargetDatabaseEntry => ({
    name, kind: 'ACTIVE', accessMode: 'READ_WRITE', mounted: false, readOnly: false, canUse: true, hasPrivilege: true,
});
const setCatalogue = (names: string[]) => mockCatalogue.mockReturnValue({
    databases: names.map(database), sessionDatabase: 'MACHBASEDB', loading: false, reload: jest.fn(),
});

beforeEach(() => {
    localStorage.clear();
    setCatalogue(['MACHBASEDB', 'FACTORY_A']);
});

test('ignores legacy saved selections and does not persist the open tab target', () => {
    const saved = JSON.stringify({ '/example.sql': 'DELETED_DB', '/example.wrk': 'DELETED_DB' });
    localStorage.setItem('neo-web.sql.target-db.by-path', saved);
    const { result, rerender, unmount } = renderHook(() => useTabTargetDatabase());
    expect(result.current.targetDatabase).toBeNull();
    act(() => result.current.setTargetDatabase('FACTORY_A'));
    rerender();
    expect(result.current.targetDatabase).toBe('FACTORY_A');
    expect(localStorage.getItem('neo-web.sql.target-db.by-path')).toBe(saved);
    unmount();
    expect(renderHook(() => useTabTargetDatabase()).result.current.targetDatabase).toBeNull();
});

test('uses the default when a refreshed catalogue contains one DB and never restores the old selection', () => {
    const { result, rerender } = renderHook(() => useTabTargetDatabase());
    act(() => result.current.setTargetDatabase('FACTORY_A'));
    setCatalogue(['MACHBASEDB']);
    rerender();
    expect(result.current.targetDatabase).toBeNull();
    expect(applyTargetDatabase([{ env: {} }], result.current.targetDatabase)).toEqual([{ env: {} }]);
    setCatalogue(['MACHBASEDB', 'FACTORY_A']);
    rerender();
    expect(result.current.targetDatabase).toBeNull();
});

test('keeps the selected target while the catalogue is empty or unresolved', () => {
    const { result, rerender } = renderHook(() => useTabTargetDatabase());
    act(() => result.current.setTargetDatabase('FACTORY_A'));
    setCatalogue([]);
    rerender();
    expect(result.current.targetDatabase).toBe('FACTORY_A');
});

test('does not silently change the target if multiple DBs remain', () => {
    const { result, rerender } = renderHook(() => useTabTargetDatabase());
    act(() => result.current.setTargetDatabase('FACTORY_A'));
    setCatalogue(['MACHBASEDB', 'FACTORY_B']);
    rerender();
    expect(result.current.targetDatabase).toBe('FACTORY_A');
});

test('keeps separate targets for separate tabs', () => {
    const first = renderHook(() => useTabTargetDatabase());
    const second = renderHook(() => useTabTargetDatabase());
    act(() => first.result.current.setTargetDatabase('FACTORY_A'));
    expect(first.result.current.targetDatabase).toBe('FACTORY_A');
    expect(second.result.current.targetDatabase).toBeNull();
});

test('preserves explicit SQL use/bridge directives after falling back to the default', () => {
    const { result, rerender } = renderHook(() => useTabTargetDatabase());
    act(() => result.current.setTargetDatabase('FACTORY_A'));
    setCatalogue(['MACHBASEDB']);
    rerender();
    const statements = [{ env: { use: 'EXPLICIT_DB' } }, { env: { bridge: 'EXPLICIT_BRIDGE' } }];
    expect(applyTargetDatabase(statements, result.current.targetDatabase)).toEqual(statements);
});
