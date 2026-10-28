// issue #1570 F-152 — `pkg copy` that could not fetch the package still answers
// success and leaves an empty /public/<name>. That is a failed install, and the
// empty directory must not stay behind to make the card read "installed".

import { getTqlChart } from '@/api/repository/machiot';
import { deleteFile, getFiles } from '@/api/repository/fileTree';
import { stepPkgCopy } from './pkgCopy';

jest.mock('@/api/repository/machiot', () => ({ getTqlChart: jest.fn() }));
jest.mock('@/api/repository/fileTree', () => ({ getFiles: jest.fn(), deleteFile: jest.fn() }));

const mockTql = getTqlChart as jest.MockedFunction<typeof getTqlChart>;
const mockGetFiles = getFiles as jest.MockedFunction<typeof getFiles>;
const mockDelete = deleteFile as jest.MockedFunction<typeof deleteFile>;

const ctx = () => ({ appName: 'neo-pkg-demo', fullName: 'machbase/neo-pkg-demo', tag: '99.0.0', logs: [] as string[] }) as any;
const listing = (children: unknown[]) => ({ data: { isDir: true, name: 'x', children } }) as any;

beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers();
    mockTql.mockResolvedValue({ data: { success: true, data: { rows: ['Clone failed, falling back to GitHub API download'] } } } as any);
    mockDelete.mockResolvedValue({} as any);
});
afterEach(() => jest.useRealTimers());

const run = async (opts?: { force?: boolean }) => {
    const p = stepPkgCopy(ctx(), opts);
    await jest.runAllTimersAsync();
    return p;
};

test('an empty package directory is a failed install, and the empty directory is removed', async () => {
    mockGetFiles.mockResolvedValue(listing([]));
    const r = await run();
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.reason).toContain('could not download github.com/machbase/neo-pkg-demo@99.0.0');
    expect(mockDelete).toHaveBeenCalledWith('public', 'neo-pkg-demo');
});

test('a directory that is not there at all is a failed install', async () => {
    mockGetFiles.mockRejectedValue(new Error('404'));
    expect((await run()).ok).toBe(false);
});

test('an update (force) never removes the installed directory', async () => {
    mockGetFiles.mockResolvedValue(listing([]));
    expect((await run({ force: true })).ok).toBe(false);
    expect(mockDelete).not.toHaveBeenCalled();
});

test('files present → ok, nothing removed', async () => {
    mockGetFiles.mockResolvedValue(listing([{ name: 'package.json', isDir: false }]));
    expect((await run()).ok).toBe(true);
    expect(mockDelete).not.toHaveBeenCalled();
});

test('files that appear on a later poll still count', async () => {
    mockGetFiles.mockResolvedValueOnce(listing([])).mockResolvedValue(listing([{ name: 'index.html', isDir: false }]));
    expect((await run()).ok).toBe(true);
});
