import { renderHook, waitFor } from '@testing-library/react';
import { readLocalReadme } from '@/api/repository/onpremCatalog';
import { getInstalledVersion } from '@/components/side/AppStore/pkgLifecycle/manifest';
import { useInstalledReadme } from './useInstalledReadme';

jest.mock('@/api/repository/onpremCatalog', () => ({ readLocalReadme: jest.fn() }));
jest.mock('@/components/side/AppStore/pkgLifecycle/manifest', () => ({ getInstalledVersion: jest.fn() }));

const mockReadme = readLocalReadme as jest.MockedFunction<typeof readLocalReadme>;
const mockVersion = getInstalledVersion as jest.MockedFunction<typeof getInstalledVersion>;

beforeEach(() => {
    jest.clearAllMocks();
    mockReadme.mockResolvedValue('# demo');
    mockVersion.mockResolvedValue('1.0.8');
});

describe('useInstalledReadme', () => {
    test('reads the INSTALLED copy on mount — same origin, and the version actually on disk', async () => {
        const { result } = renderHook(() => useInstalledReadme('neo-pkg-demo'));

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(mockReadme).toHaveBeenCalledWith('neo-pkg-demo');
        expect(result.current).toEqual({ readme: '# demo', version: '1.0.8', loading: false });
    });

    // The caller offers the README button only when this is non-null, so "ships
    // none" has to be distinguishable from "still loading".
    test('a package with no README settles on null rather than staying loading', async () => {
        mockReadme.mockResolvedValue(null);
        const { result } = renderHook(() => useInstalledReadme('neo-pkg-demo'));

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.readme).toBeNull();
    });

    test('an unreadable package.json costs the version, not the README', async () => {
        mockVersion.mockResolvedValue('');
        const { result } = renderHook(() => useInstalledReadme('neo-pkg-demo'));

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.readme).toBe('# demo');
        expect(result.current.version).toBe('');
    });

    test('starts loading, so the button does not flicker in before the answer', () => {
        const { result } = renderHook(() => useInstalledReadme('neo-pkg-demo'));

        expect(result.current).toEqual({ readme: null, version: '', loading: true });
    });

    test('re-reads for a different package and does not carry the previous one over', async () => {
        const { result, rerender } = renderHook(({ name }) => useInstalledReadme(name), { initialProps: { name: 'neo-pkg-a' } });
        await waitFor(() => expect(result.current.loading).toBe(false));

        mockReadme.mockResolvedValue('# other');
        rerender({ name: 'neo-pkg-b' });

        // Reset in the same pass as the switch: the previous package's README must
        // not be on screen under the new package's name, even for one frame.
        expect(result.current).toEqual({ readme: null, version: '', loading: true });
        await waitFor(() => expect(result.current.readme).toBe('# other'));
    });

    test('a late answer for a package the user has left is discarded', async () => {
        let resolveA: (v: string | null) => void = () => undefined;
        mockReadme.mockImplementationOnce(() => new Promise((r) => (resolveA = r)));
        const { result, rerender } = renderHook(({ name }) => useInstalledReadme(name), { initialProps: { name: 'neo-pkg-a' } });

        mockReadme.mockResolvedValue('# b');
        rerender({ name: 'neo-pkg-b' });
        await waitFor(() => expect(result.current.readme).toBe('# b'));

        resolveA('# a (stale)');
        await new Promise((r) => setTimeout(r, 0));

        expect(result.current.readme).toBe('# b');
    });
});
