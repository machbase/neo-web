import { buildCatalog, mergeVersions, resetCatalogSyncTime } from './catalog';
import { fetchPkgHubList, type APP_INFO } from '@/api/repository/appStore';
import { fetchLocalArchiveEntries, getInstalledDirs, getInstalledIcons, getLastArchiveScanErrors, isLocalOnlyMode } from '@/api/repository/onpremCatalog';
import { getFiles } from '@/api/repository/fileTree';
import { readManifest } from './pkgLifecycle';

// Only the three source legs are stubbed; the merge, the experiment gate and the
// search filter all run for real.
jest.mock('@/api/repository/appStore', () => ({
    ...jest.requireActual('@/api/repository/appStore'),
    fetchPkgHubList: jest.fn(),
}));
jest.mock('@/api/repository/onpremCatalog', () => ({
    ...jest.requireActual('@/api/repository/onpremCatalog'),
    fetchLocalArchiveEntries: jest.fn(),
    // The local-only flag is a side channel on the cached scan, so with the scan
    // stubbed the real reader would always answer false. Stubbed alongside it.
    isLocalOnlyMode: jest.fn(),
    // Same deal for the installed copies' icon file names (issue #1452) — one more
    // side channel on the same stubbed scan.
    getInstalledIcons: jest.fn(),
    // …and for what each /public/ directory's own package.json claims, which is
    // what the stray-directory classification runs on (issue #1452).
    getInstalledDirs: jest.fn(),
    // …and for the per-file findings the same scan filed, which buildCatalog now
    // carries out on its result so a component can hold them in state (issue #1452).
    getLastArchiveScanErrors: jest.fn(),
}));
jest.mock('@/api/repository/fileTree', () => ({ getFiles: jest.fn() }));
jest.mock('@/api/repository/api', () => ({ getFileList: jest.fn() }));
jest.mock('./pkgLifecycle', () => ({ readManifest: jest.fn() }));

const mockHub = fetchPkgHubList as jest.MockedFunction<typeof fetchPkgHubList>;
const mockLocal = fetchLocalArchiveEntries as jest.MockedFunction<typeof fetchLocalArchiveEntries>;
const mockLocalOnly = isLocalOnlyMode as jest.MockedFunction<typeof isLocalOnlyMode>;
const mockInstalledIcons = getInstalledIcons as jest.MockedFunction<typeof getInstalledIcons>;
const mockInstalledDirs = getInstalledDirs as jest.MockedFunction<typeof getInstalledDirs>;
const mockScanErrors = getLastArchiveScanErrors as jest.MockedFunction<typeof getLastArchiveScanErrors>;
const mockGetFiles = getFiles as jest.MockedFunction<any>;
const mockManifest = readManifest as jest.MockedFunction<typeof readManifest>;

const github = (name: string, description = `${name} desc`) => ({
    organization: 'machbase',
    repo: name,
    full_name: `machbase/${name}`,
    description,
    default_branch: 'main',
    forks_count: 0,
    language: 'TypeScript',
    stargazers_count: 0,
    license: null,
});

/** A card as `fetchPkgHubList` would produce it. */
const hubCard = (name: string, over: Partial<APP_INFO> = {}): APP_INFO => ({
    name,
    latest_version: '1.0.0',
    published_at: '2026-01-01T00:00:00Z',
    versions: [{ version: '1.0.0', minServer: '8.5.0', released_at: '2026-01-01T00:00:00Z' }],
    github: github(name),
    ...over,
});

/** A card as `fetchLocalArchiveEntries` would produce it (rows already source-tagged). */
const localCard = (name: string, versions: string[] = ['1.0.0'], over: Partial<APP_INFO> = {}): APP_INFO =>
    hubCard(name, {
        latest_version: versions[0],
        versions: versions.map((version) => ({ version, minServer: '', source: 'local' as const })),
        github: github(name, `${name} from a local zip`),
        ...over,
    });

/** `/api/files/public/` listing holding the given installed package directories. */
const publicListing = (names: string[]) => ({
    data: { name: 'public', isDir: true, children: names.map((name) => ({ name, isDir: true })) },
});

const NO_LOCAL: APP_INFO[] = [];

beforeEach(() => {
    jest.clearAllMocks();
    resetCatalogSyncTime();
    mockHub.mockResolvedValue([]);
    mockLocal.mockResolvedValue(NO_LOCAL);
    mockLocalOnly.mockReturnValue(false);
    // Default: the scan said nothing about icons — the pre-#1452 world, in which
    // every card falls back to the `icon.png` guess.
    mockInstalledIcons.mockReturnValue(undefined);
    // Default: the scan said nothing about any directory, which classifies every
    // one of them as `unclaimed` — the pre-stray-card behaviour.
    mockInstalledDirs.mockReturnValue({});
    // Default: the scan found nothing wrong with any file.
    mockScanErrors.mockReturnValue([]);
    mockManifest.mockResolvedValue(null);
    mockGetFiles.mockResolvedValue(publicListing([]));
});

describe('buildCatalog — hub reachable', () => {
    test('with no local archives the result is the plain hub catalog', async () => {
        mockHub.mockResolvedValue([hubCard('pkg-a'), hubCard('pkg-b')]);

        const res = await buildCatalog({ experimentOn: false });

        expect(res.pkgs.map((p) => p.name)).toEqual(['pkg-a', 'pkg-b']);
        expect(res.mode).toBe('online');
        expect(res.hubError).toBeUndefined();
        expect(res.lastSyncAt).toEqual(expect.any(Number));
        // Hub-only rows are tagged explicitly — the offline masking keys off it.
        expect(res.pkgs[0].versions?.map((v) => v.source)).toEqual(['hub']);
    });

    test('installed state comes from /public + package.json, never from the hub', async () => {
        mockHub.mockResolvedValue([hubCard('pkg-a'), hubCard('pkg-b')]);
        mockGetFiles.mockResolvedValue(publicListing(['pkg-a']));
        mockManifest.mockResolvedValue({ version: '0.9.0', packageService: { managed: false, reason: 'child services' } });

        const { pkgs } = await buildCatalog({ experimentOn: false });

        expect(pkgs[0]).toMatchObject({ name: 'pkg-a', installed_frontend: true, installed_version: '0.9.0' });
        expect(pkgs[0].installed_packageService).toEqual({ managed: false, reason: 'child services' });
        expect(pkgs[1].installed_frontend).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// installed_icon — the real icon FILE NAME, not a guess (issue #1452)
// ---------------------------------------------------------------------------
// `/public/neo-pkg-dbus/icon.svg` exists; the browser used to ask for
// `icon.png` and get a 404. The scan reports the name it actually saw, and this
// is where it lands on the card. Three-valued on purpose — see `installedIconOf`.
describe('buildCatalog — installed_icon', () => {
    test('a known card carries the file name the scan reported', async () => {
        mockHub.mockResolvedValue([hubCard('neo-pkg-dbus'), hubCard('neo-pkg-opcua-client')]);
        mockGetFiles.mockResolvedValue(publicListing(['neo-pkg-dbus', 'neo-pkg-opcua-client']));
        mockInstalledIcons.mockReturnValue({ 'neo-pkg-dbus': 'icon.svg', 'neo-pkg-opcua-client': 'icon.png' });

        const { pkgs } = await buildCatalog({ experimentOn: false });

        expect(pkgs.map((p) => [p.name, p.installed_icon])).toEqual([
            ['neo-pkg-dbus', 'icon.svg'],
            ['neo-pkg-opcua-client', 'icon.png'],
        ]);
    });

    test('a scanned package with no icon gets "" — "there is none", not "unknown"', async () => {
        mockHub.mockResolvedValue([hubCard('pkg-a')]);
        mockGetFiles.mockResolvedValue(publicListing(['pkg-a']));
        mockInstalledIcons.mockReturnValue({ 'pkg-b': 'icon.svg' });

        const { pkgs } = await buildCatalog({ experimentOn: false });

        expect(pkgs[0].installed_icon).toBe('');
    });

    test('no scan information ⇒ undefined, so the icon chain keeps the icon.png fallback', async () => {
        mockHub.mockResolvedValue([hubCard('pkg-a')]);
        mockGetFiles.mockResolvedValue(publicListing(['pkg-a']));
        mockInstalledIcons.mockReturnValue(undefined);

        const { pkgs } = await buildCatalog({ experimentOn: false });

        expect(pkgs[0].installed_frontend).toBe(true);
        expect(pkgs[0].installed_icon).toBeUndefined();
    });

    test('a package that is not installed never gets the field', async () => {
        mockHub.mockResolvedValue([hubCard('pkg-a')]);
        mockGetFiles.mockResolvedValue(publicListing([]));
        mockInstalledIcons.mockReturnValue({ 'pkg-a': 'icon.svg' });

        const { pkgs } = await buildCatalog({ experimentOn: false });

        expect(pkgs[0].installed_icon).toBeUndefined();
    });

    // The orphan path — installed, but no hub and no archive knows it. Those cards
    // are the only entry point to stop/uninstall a running package, so they need
    // the icon just as much.
    test('a synthesized (orphan) card carries it too', async () => {
        mockHub.mockRejectedValue(new Error('offline'));
        mockGetFiles.mockResolvedValue(publicListing(['neo-pkg-dbus']));
        mockInstalledIcons.mockReturnValue({ 'neo-pkg-dbus': 'icon.svg' });

        const { pkgs } = await buildCatalog({ experimentOn: false });

        expect(pkgs.map((p) => [p.name, p.installed_icon])).toEqual([['neo-pkg-dbus', 'icon.svg']]);
    });
});

describe('buildCatalog — hub unreachable (the #1452 regression)', () => {
    const offline = () => mockHub.mockRejectedValue(new Error('Failed to fetch pkg hub: 404'));

    test('local archives alone still produce a catalog', async () => {
        offline();
        mockLocal.mockResolvedValue([localCard('pkg-a'), localCard('pkg-b')]);

        const res = await buildCatalog({ experimentOn: false });

        expect(res.pkgs.map((p) => p.name)).toEqual(['pkg-a', 'pkg-b']);
        expect(res.mode).toBe('offline');
        expect(res.hubError).toBe('Failed to fetch pkg hub: 404');
        expect(res.pkgs[0].versions?.map((v) => v.source)).toEqual(['local']);
    });

    // THE core regression: no hub, no archive — but the package is installed and
    // possibly running. Losing the card loses uninstall and stop with it.
    test('an installed package with no hub and no archive keeps its card', async () => {
        offline();
        mockGetFiles.mockResolvedValue(publicListing(['neo-pkg-installed']));
        mockManifest.mockResolvedValue({ version: '1.2.3' });

        const { pkgs, mode } = await buildCatalog({ experimentOn: false });

        expect(mode).toBe('offline');
        expect(pkgs).toHaveLength(1);
        expect(pkgs[0]).toMatchObject({ name: 'neo-pkg-installed', installed_frontend: true, installed_version: '1.2.3' });
        // Synthesized from package.json alone — must still be safe to search.
        expect(() => pkgs[0].github.description.toLowerCase()).not.toThrow();
    });

    // `/public/{name}/package.json` IS THE ONLY METADATA an installed copy has.
    // The `onprem.json` this used to prefer does not exist in any archive (real
    // ones are GitHub source zips rooted at `{repo}-{branch}`), so it never
    // reached `/public/` either — do not reintroduce a second reader.
    test('the same package gets its metadata back from its installed package.json', async () => {
        offline();
        mockGetFiles.mockResolvedValue(publicListing(['neo-pkg-installed']));
        mockManifest.mockResolvedValue({ name: 'neo-pkg-installed', version: '1.2.3', description: 'shipped in a zip' });

        const { pkgs } = await buildCatalog({ experimentOn: false });

        expect(pkgs[0].github.description).toBe('shipped in a zip');
        expect(pkgs[0].installed_frontend).toBe(true);
        expect(pkgs[0].installed_version).toBe('1.2.3');
    });

    // package.json's `description` is optional — neo-pkg-opcua-client 1.0.8 and
    // neo-pkg-replication 1.0.6 both ship without one.
    test('a package.json with no description still yields a searchable card', async () => {
        offline();
        mockGetFiles.mockResolvedValue(publicListing(['neo-pkg-installed']));
        mockManifest.mockResolvedValue({ name: 'neo-pkg-installed', version: '1.0.8' });

        const { pkgs } = await buildCatalog({ experimentOn: false, search: 'INSTALLED' });

        expect(pkgs.map((p) => p.name)).toEqual(['neo-pkg-installed']);
        expect(pkgs[0].github.description).toBe('');
        expect(() => pkgs[0].github.description.toLowerCase()).not.toThrow();
    });

    // Defence in depth: fetchLocalArchiveEntries and readManifest are both
    // documented never-throw, but buildCatalog must not be one regression in
    // either of them away from blanking the panel again.
    test('a card is kept even when every source but the /public listing throws', async () => {
        offline();
        mockLocal.mockRejectedValue(new Error('boom'));
        mockGetFiles.mockResolvedValue(publicListing(['neo-pkg-installed']));
        mockManifest.mockRejectedValue(new Error('unreadable manifest'));

        const { pkgs, mode } = await buildCatalog({ experimentOn: false });

        expect(mode).toBe('offline');
        expect(pkgs.map((p) => p.name)).toEqual(['neo-pkg-installed']);
        expect(pkgs[0].installed_frontend).toBe(true);
    });

    test('an unreadable /public listing degrades to "nothing installed", not to an empty catalog', async () => {
        offline();
        mockLocal.mockResolvedValue([localCard('pkg-a')]);
        mockGetFiles.mockRejectedValue(new Error('404'));

        const { pkgs } = await buildCatalog({ experimentOn: false });
        expect(pkgs.map((p) => p.name)).toEqual(['pkg-a']);
        expect(pkgs[0].installed_frontend).toBeUndefined();
    });

    test('lastSyncAt keeps reporting the last SUCCESSFUL sync after the hub drops', async () => {
        mockHub.mockResolvedValue([hubCard('pkg-a')]);
        const { lastSyncAt: first } = await buildCatalog({ experimentOn: false });

        offline();
        const { lastSyncAt: second, mode } = await buildCatalog({ experimentOn: false });

        expect(mode).toBe('offline');
        expect(second).toBe(first);
    });
});

// `/public/` is a web root, not a package registry — real servers keep backend
// work directories (`stage`) next to the installed packages, and synthesizing a
// card for those hands the user uninstall controls for a non-package.
// ---------------------------------------------------------------------------
// LOCAL-ONLY MODE (issue #1452)
// ---------------------------------------------------------------------------
// The deliverable is NEGATIVE: with `/public/.pkg-conf.json` saying
// `{ "localOnly": true }`, no request may leave the machine. Filtering the hub's
// answer afterwards would look identical on screen and be exactly wrong — the
// packets are what the customer is air-gapping.
describe('buildCatalog — local-only mode', () => {
    const policyOn = () => mockLocalOnly.mockReturnValue(true);

    // THE CORE REGRESSION TEST FOR THIS FEATURE.
    test('the hub fetch is NEVER CALLED — not called and filtered, not called at all', async () => {
        policyOn();
        mockLocal.mockResolvedValue([localCard('pkg-a')]);

        const res = await buildCatalog({ experimentOn: false });

        expect(mockHub).not.toHaveBeenCalled();
        expect(res.mode).toBe('localOnly');
        expect(res.pkgs.map((p) => p.name)).toEqual(['pkg-a']);
    });

    // The ordering guard. The legs used to fire together under Promise.allSettled,
    // which meant the flag arrived AFTER the request it was supposed to prevent.
    // A cold cache (nothing scanned yet) is precisely the case that would leak.
    test('a cold first scan still gets the policy in before the hub leg could fire', async () => {
        policyOn();
        let scanResolved = false;
        mockLocal.mockImplementation(
            () =>
                new Promise((resolve) => {
                    setTimeout(() => {
                        scanResolved = true;
                        resolve([localCard('pkg-a')]);
                    }, 10);
                })
        );
        // If the hub leg ever runs, prove the scan had already finished — i.e. the
        // decision was made with the flag in hand, never speculatively.
        mockHub.mockImplementation(async () => {
            expect(scanResolved).toBe(true);
            return [];
        });

        await buildCatalog({ experimentOn: false });

        expect(mockHub).not.toHaveBeenCalled();
    });

    test('hubError stays undefined — nothing failed', async () => {
        policyOn();

        const res = await buildCatalog({ experimentOn: false });
        expect(res.hubError).toBeUndefined();
    });

    // lastSyncAt is the last SUCCESSFUL hub sync. Local-only performs none, so an
    // earlier one must survive untouched rather than be refreshed by a build that
    // never talked to the hub.
    test('lastSyncAt is not advanced by a local-only build', async () => {
        mockHub.mockResolvedValue([hubCard('pkg-a')]);
        const { lastSyncAt: first } = await buildCatalog({ experimentOn: false });

        policyOn();
        const { lastSyncAt: second, mode } = await buildCatalog({ experimentOn: false });

        expect(mode).toBe('localOnly');
        expect(second).toBe(first);
    });

    // Installed packages must keep their cards — start / stop / uninstall live
    // there, and an air-gapped site is exactly where that matters most.
    test('installed packages are still listed and annotated', async () => {
        policyOn();
        mockGetFiles.mockResolvedValue(publicListing(['neo-pkg-installed']));
        mockManifest.mockResolvedValue({ version: '1.2.3' });

        const { pkgs, mode } = await buildCatalog({ experimentOn: false });

        expect(mode).toBe('localOnly');
        expect(pkgs[0]).toMatchObject({ name: 'neo-pkg-installed', installed_frontend: true, installed_version: '1.2.3' });
        expect(mockHub).not.toHaveBeenCalled();
    });

    test('an empty archive directory in local-only mode is an empty catalog, still localOnly', async () => {
        policyOn();

        const res = await buildCatalog({ experimentOn: false });

        expect(res.pkgs).toEqual([]);
        expect(res.mode).toBe('localOnly');
        expect(mockHub).not.toHaveBeenCalled();
    });

    // The flag rides on the scan, so a scan that never completed cannot have
    // established the policy. Failing closed here would let a TQL hiccup hide the
    // entire hub catalog.
    test('a scan that throws falls back to the hub rather than to a fake air gap', async () => {
        mockLocal.mockRejectedValue(new Error('boom'));
        mockHub.mockResolvedValue([hubCard('pkg-a')]);

        const res = await buildCatalog({ experimentOn: false });

        expect(mockHub).toHaveBeenCalled();
        expect(res.mode).toBe('online');
        expect(res.pkgs.map((p) => p.name)).toEqual(['pkg-a']);
    });

    test('turning the policy off restores the hub leg', async () => {
        policyOn();
        await buildCatalog({ experimentOn: false });
        expect(mockHub).not.toHaveBeenCalled();

        mockLocalOnly.mockReturnValue(false);
        mockHub.mockResolvedValue([hubCard('pkg-a')]);
        const res = await buildCatalog({ experimentOn: false });

        expect(mockHub).toHaveBeenCalledTimes(1);
        expect(res.mode).toBe('online');
    });
});

describe('buildCatalog — /public/ directories that are not packages', () => {
    test('an unknown directory becomes a card only when it is named like a package', async () => {
        mockHub.mockRejectedValue(new Error('offline'));
        mockGetFiles.mockResolvedValue(publicListing(['neo-pkg-a', 'stage']));
        mockManifest.mockResolvedValue({ version: '1.0.0' });

        const { pkgs } = await buildCatalog({ experimentOn: false });

        expect(pkgs.map((p) => p.name)).toEqual(['neo-pkg-a']);
        expect(pkgs.map((p) => p.name)).not.toContain('stage');
    });

    test('a non-package directory is never even read off disk', async () => {
        mockGetFiles.mockResolvedValue(publicListing(['stage']));

        await buildCatalog({ experimentOn: false });

        expect(mockManifest).not.toHaveBeenCalled();
    });

    // Regression guard for the fix itself: the prefix decides whether to SYNTHESIZE
    // a card, never whether a known package counts as installed. A hub package
    // published under some other name must keep its installed state.
    test('a known package in /public/ is still flagged installed, prefix or not', async () => {
        mockHub.mockResolvedValue([hubCard('neo-pkg-a'), hubCard('legacy-tool')]);
        mockLocal.mockResolvedValue([localCard('zipped-tool')]);
        mockGetFiles.mockResolvedValue(publicListing(['neo-pkg-a', 'legacy-tool', 'zipped-tool', 'stage']));
        mockManifest.mockResolvedValue({ version: '0.9.0' });

        const { pkgs } = await buildCatalog({ experimentOn: false });

        expect(pkgs.map((p) => p.name)).toEqual(['neo-pkg-a', 'legacy-tool', 'zipped-tool']);
        expect(pkgs.every((p) => p.installed_frontend === true)).toBe(true);
        expect(pkgs.find((p) => p.name === 'legacy-tool')?.installed_version).toBe('0.9.0');
    });

    // Decision: the prefix is the ONLY gate. `readManifest` reports a missing
    // package.json and a failed read identically (null), so a manifest guard would
    // drop the card of a running package on a flaky request — the very #1452
    // regression — and uninstall does not need a manifest anyway (rm -rf always
    // runs). A half-copied `neo-pkg-*` directory therefore keeps its card.
    test('a prefixed directory with no readable manifest still gets its card', async () => {
        mockHub.mockRejectedValue(new Error('offline'));
        mockGetFiles.mockResolvedValue(publicListing(['neo-pkg-halfcopied']));
        mockManifest.mockResolvedValue(null);

        const { pkgs } = await buildCatalog({ experimentOn: false });

        expect(pkgs.map((p) => p.name)).toEqual(['neo-pkg-halfcopied']);
        expect(pkgs[0].installed_frontend).toBe(true);
        expect(pkgs[0].installed_version).toBe('');
    });
});

// ---------------------------------------------------------------------------
// WHICH /public/ DIRECTORY IS WHAT (issue #1452)
// ---------------------------------------------------------------------------
// `/public/neo-pkg-foo-main/` is what unpacking `neo-pkg-foo.tar.gz` by hand
// leaves behind, and it is NOT dead: /public/ is statically served, so that tree's
// cgi-bin answers requests while nothing registered it as a service. It now gets a
// card of its own — stripped of every lifecycle action, because none of them apply
// — instead of being skipped with a warning.
//
// The rule itself is asserted in strayDirs.test.ts; these tests are about what
// buildCatalog DOES with each verdict.
describe('buildCatalog — stray directories', () => {
    /** The scan\'s answer for one hand-unpacked directory. */
    const unpacked = (dir: string, name: string, over: Record<string, unknown> = {}) => ({
        [dir]: { name, version: '1.0.0', description: `${name} desc`, git: false, ...over },
    });

    test('THE CASE: a hand-unpacked {repo}-{branch} directory gets a stray card', async () => {
        mockGetFiles.mockResolvedValue(publicListing(['neo-pkg-foo-main']));
        mockInstalledDirs.mockReturnValue(unpacked('neo-pkg-foo-main', 'neo-pkg-foo'));

        const { pkgs } = await buildCatalog({ experimentOn: false });

        // Named after the PACKAGE, identified by the DIRECTORY.
        expect(pkgs.map((p) => p.name)).toEqual(['neo-pkg-foo']);
        expect(pkgs[0].stray).toEqual({ dir: 'neo-pkg-foo-main', removable: true, duplicate: false });
        // NOT an install: every lifecycle affordance keys off this field.
        expect(pkgs[0].installed_frontend).toBeUndefined();
        // …and it offers no version to install either.
        expect(pkgs[0].versions).toEqual([]);
    });

    test('name / version / description come from the directory\'s own package.json', async () => {
        mockGetFiles.mockResolvedValue(publicListing(['neo-pkg-foo-1.0.5']));
        mockInstalledDirs.mockReturnValue({ 'neo-pkg-foo-1.0.5': { name: 'neo-pkg-foo', version: '2.3.4', description: 'unpacked by hand', git: false } });

        const { pkgs } = await buildCatalog({ experimentOn: false });

        expect(pkgs[0]).toMatchObject({ name: 'neo-pkg-foo', latest_version: '2.3.4' });
        expect(pkgs[0].github.description).toBe('unpacked by hand');
    });

    // RULE 1, AND IT OUTRANKS EVERYTHING. A directory named after a package the
    // catalog publishes IS that package's install, whatever its package.json says.
    test('a name the catalog knows is a normal install even when the manifest disagrees', async () => {
        mockHub.mockResolvedValue([hubCard('neo-pkg-foo')]);
        mockGetFiles.mockResolvedValue(publicListing(['neo-pkg-foo']));
        mockManifest.mockResolvedValue({ version: '1.0.0' });
        mockInstalledDirs.mockReturnValue({ 'neo-pkg-foo': { name: 'something-else', git: false } });

        const { pkgs } = await buildCatalog({ experimentOn: false });

        expect(pkgs.map((p) => p.name)).toEqual(['neo-pkg-foo']);
        expect(pkgs[0].stray).toBeUndefined();
        expect(pkgs[0]).toMatchObject({ installed_frontend: true, installed_version: '1.0.0' });
    });

    // RULE 2. An interrupted `pkg copy` has no package.json, and its card is the
    // only way to uninstall it. Never take that away.
    test('a directory with no manifest keeps its ordinary card', async () => {
        mockHub.mockRejectedValue(new Error('offline'));
        mockGetFiles.mockResolvedValue(publicListing(['neo-pkg-halfcopied']));
        mockManifest.mockResolvedValue(null);
        mockInstalledDirs.mockReturnValue({});

        const { pkgs } = await buildCatalog({ experimentOn: false });

        expect(pkgs.map((p) => p.name)).toEqual(['neo-pkg-halfcopied']);
        expect(pkgs[0].installed_frontend).toBe(true);
        expect(pkgs[0].stray).toBeUndefined();
    });

    // RULE 4 vs 5. `.git` is the whole difference between "somebody unpacked a zip"
    // and "somebody is working here".
    test('a prefix match WITH .git is a card without a Remove action', async () => {
        mockGetFiles.mockResolvedValue(publicListing(['neo-pkg-foo-dev']));
        mockInstalledDirs.mockReturnValue(unpacked('neo-pkg-foo-dev', 'neo-pkg-foo', { git: true }));

        const { pkgs } = await buildCatalog({ experimentOn: false });

        expect(pkgs[0].stray).toEqual({ dir: 'neo-pkg-foo-dev', removable: false, duplicate: false });
    });

    test('an unknown .git state is treated as a clone, never as removable', async () => {
        mockGetFiles.mockResolvedValue(publicListing(['neo-pkg-foo-main']));
        mockInstalledDirs.mockReturnValue({ 'neo-pkg-foo-main': { name: 'neo-pkg-foo' } });

        const { pkgs } = await buildCatalog({ experimentOn: false });

        expect(pkgs[0].stray?.removable).toBe(false);
    });

    // RULE 5 (prefix mismatch). `stage` is the backend's work directory; it happens
    // to contain a copy of a package and is none of the App Store's business.
    //
    // NO CARD AND NO WARNING. The warning was removed on user instruction: the
    // directory is not ours to act on, and "its name does not start with the
    // package name inside it" is equally true of a deliberate work directory and
    // of a mistake — so the line was an unactionable guess, re-filed on every
    // catalog build. Silence is the whole fix; if this test starts failing because
    // a warning came back, that is the regression.
    test('a directory whose name does not start with the package name is ignored entirely', async () => {
        mockGetFiles.mockResolvedValue(publicListing(['stage']));
        mockInstalledDirs.mockReturnValue({ stage: { name: 'neo-pkg-opcua-client', git: false } });

        const { pkgs, scanWarnings } = await buildCatalog({ experimentOn: false });

        expect(pkgs).toEqual([]);
        expect(scanWarnings).toEqual([]);
    });

    // The same directory next to real cards: it must not cost them anything either.
    test('a foreign directory neither adds a card nor disturbs the real ones', async () => {
        mockHub.mockResolvedValue([hubCard('neo-pkg-foo')]);
        mockGetFiles.mockResolvedValue(publicListing(['neo-pkg-foo', 'stage']));
        mockManifest.mockResolvedValue({ version: '1.0.0' });
        mockInstalledDirs.mockReturnValue({
            'neo-pkg-foo': { name: 'neo-pkg-foo', git: false },
            stage: { name: 'neo-pkg-opcua-client', git: false },
        });

        const { pkgs, scanWarnings } = await buildCatalog({ experimentOn: false });

        expect(pkgs.map((p) => p.name)).toEqual(['neo-pkg-foo']);
        expect(scanWarnings).toEqual([]);
    });

    // RULE 6. dir === name and no catalog knows it: exactly what a synthesized
    // orphan card has always been.
    test('dir name === package name is an ordinary installed card', async () => {
        mockGetFiles.mockResolvedValue(publicListing(['neo-pkg-orphan']));
        mockManifest.mockResolvedValue({ version: '1.0.0' });
        mockInstalledDirs.mockReturnValue({ 'neo-pkg-orphan': { name: 'neo-pkg-orphan', git: false } });

        const { pkgs } = await buildCatalog({ experimentOn: false });

        expect(pkgs.map((p) => p.name)).toEqual(['neo-pkg-orphan']);
        expect(pkgs[0].stray).toBeUndefined();
        expect(pkgs[0].installed_frontend).toBe(true);
    });

    // TWO CARDS, ON PURPOSE. Both directories are on disk and both are served, so
    // merging them would leave the user unable to tell which one a button acts on.
    test('a real install and a stray copy of the same package produce two cards', async () => {
        mockHub.mockResolvedValue([hubCard('neo-pkg-foo')]);
        mockGetFiles.mockResolvedValue(publicListing(['neo-pkg-foo', 'neo-pkg-foo-main']));
        mockManifest.mockResolvedValue({ version: '1.0.0' });
        mockInstalledDirs.mockReturnValue({
            'neo-pkg-foo': { name: 'neo-pkg-foo', git: false },
            ...unpacked('neo-pkg-foo-main', 'neo-pkg-foo'),
        });

        const { pkgs } = await buildCatalog({ experimentOn: false });

        expect(pkgs).toHaveLength(2);
        const real = pkgs.find((p) => !p.stray)!;
        const stray = pkgs.find((p) => p.stray)!;
        expect(real).toMatchObject({ name: 'neo-pkg-foo', installed_frontend: true });
        expect(stray.stray).toEqual({ dir: 'neo-pkg-foo-main', removable: true, duplicate: true });
        expect(stray.installed_frontend).toBeUndefined();
    });

    test('several strays are ordered by directory, after every real card', async () => {
        mockHub.mockResolvedValue([hubCard('neo-pkg-foo')]);
        mockGetFiles.mockResolvedValue(publicListing(['neo-pkg-zed-main', 'neo-pkg-foo-main']));
        mockInstalledDirs.mockReturnValue({
            ...unpacked('neo-pkg-zed-main', 'neo-pkg-zed'),
            ...unpacked('neo-pkg-foo-main', 'neo-pkg-foo'),
        });

        const { pkgs } = await buildCatalog({ experimentOn: false });

        expect(pkgs.map((p) => p.stray?.dir ?? p.name)).toEqual(['neo-pkg-foo', 'neo-pkg-foo-main', 'neo-pkg-zed-main']);
    });

    test('the stray card is not read off disk as an installed package', async () => {
        mockGetFiles.mockResolvedValue(publicListing(['neo-pkg-foo-main']));
        mockInstalledDirs.mockReturnValue(unpacked('neo-pkg-foo-main', 'neo-pkg-foo'));

        await buildCatalog({ experimentOn: false });

        expect(mockManifest).not.toHaveBeenCalled();
    });

    test('the icon is looked up under the DIRECTORY, not the package name', async () => {
        mockGetFiles.mockResolvedValue(publicListing(['neo-pkg-foo-main']));
        mockInstalledDirs.mockReturnValue(unpacked('neo-pkg-foo-main', 'neo-pkg-foo'));
        mockInstalledIcons.mockReturnValue({ 'neo-pkg-foo-main': 'icon.svg' });

        const { pkgs } = await buildCatalog({ experimentOn: false });

        expect(pkgs[0].installed_icon).toBe('icon.svg');
    });

    test('a stray card is searchable by its directory name', async () => {
        mockGetFiles.mockResolvedValue(publicListing(['neo-pkg-foo-main']));
        mockInstalledDirs.mockReturnValue(unpacked('neo-pkg-foo-main', 'neo-pkg-foo'));

        const { pkgs } = await buildCatalog({ experimentOn: false, search: 'foo-main' });

        expect(pkgs.map((p) => p.stray?.dir)).toEqual(['neo-pkg-foo-main']);
    });

    // An empty verdict map (an older script body, a failed scan) must leave the
    // catalog exactly as it was before stray cards existed.
    test('an empty verdict changes nothing', async () => {
        mockGetFiles.mockResolvedValue(publicListing(['neo-pkg-foo-main']));
        mockManifest.mockResolvedValue({ version: '1.0.0' });
        mockInstalledDirs.mockReturnValue({});

        const { pkgs } = await buildCatalog({ experimentOn: false });

        expect(pkgs.map((p) => p.name)).toEqual(['neo-pkg-foo-main']);
        expect(pkgs[0].stray).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// THE SCAN'S FINDINGS RIDE OUT ON THE RESULT (issue #1452)
// ---------------------------------------------------------------------------
// They used to sit in module scope only (`getLastArchiveScanErrors`), where no
// component could subscribe to them: a React tree reading that side channel gets
// whatever the last scan left behind and never re-renders when it changes. Both
// `buildCatalog` call sites now push `scanWarnings` into `gCatalogScanWarnings`,
// so the value has to be ON the result.
describe('buildCatalog — scanWarnings', () => {
    test('a clean scan reports an empty list, never undefined', async () => {
        const res = await buildCatalog({ experimentOn: false });
        expect(res.scanWarnings).toEqual([]);
    });

    // A HAND-UNPACKED DIRECTORY IS NOT IN HERE ANY MORE — it is a card. The same
    // finding in two places is how a user reads an accusation about a directory
    // they already removed.
    test('a stray directory produces a card and NO warning', async () => {
        mockLocal.mockResolvedValue([localCard('neo-pkg-foo')]);
        mockGetFiles.mockResolvedValue(publicListing(['neo-pkg-foo-main']));
        mockInstalledDirs.mockReturnValue({ 'neo-pkg-foo-main': { name: 'neo-pkg-foo', git: false } });

        const res = await buildCatalog({ experimentOn: false });

        expect(res.pkgs.map((p) => p.stray?.dir ?? p.name)).toEqual(['neo-pkg-foo', 'neo-pkg-foo-main']);
        expect(res.scanWarnings).toEqual([]);
    });

    // A `foreign` directory USED TO file one here. It does not any more (user
    // decision — see the verdict branch in catalog.ts), and the risk of removing it
    // was that the removal would take the archive findings with it. It did not:
    // `scanWarnings` is now exactly the scan's own list, passed through untouched.
    test('a foreign directory contributes nothing, and the archive findings are unaffected', async () => {
        const archiveWarnings = [
            { archive: 'weird.tar.zst', error: 'unsupported compression (only zip, tar, tar.gz/tgz)' },
            { archive: 'broken.zip', error: 'zip: not a valid zip file' },
        ];
        mockGetFiles.mockResolvedValue(publicListing(['stage']));
        mockInstalledDirs.mockReturnValue({ stage: { name: 'neo-pkg-opcua-client', git: false } });
        mockScanErrors.mockReturnValue(archiveWarnings);

        const res = await buildCatalog({ experimentOn: false });

        expect(res.scanWarnings).toEqual(archiveWarnings);
        expect(res.scanWarnings.map((w) => w.archive)).not.toContain('stage');
    });

    // EVERY OTHER FINDING KIND STILL REPORTS. Nothing about the `foreign` removal
    // may narrow the list to a subset of archive problems: these are real faults in
    // files the user placed on the server expecting them to be installable.
    test.each([
        ['unsupported compression', { archive: 'pkg.tar.zst', error: 'unsupported compression (only zip, tar, tar.gz/tgz)' }],
        ['a corrupt archive', { archive: 'broken.zip', error: 'zip: not a valid zip file' }],
        ['no root package.json', { archive: 'weird.zip', error: 'no <root>/package.json' }],
        ['a name+version collision', { archive: 'dup.zip', error: 'duplicate name+version (neo-pkg-foo@1.0.0)' }],
        ['an unreadable file', { archive: 'gone.zip', error: 'stat failed' }],
    ])('%s is still reported', async (_label, warning) => {
        mockScanErrors.mockReturnValue([warning]);

        const res = await buildCatalog({ experimentOn: false });

        expect(res.scanWarnings).toEqual([warning]);
    });

    // A hub that answered normally must not suppress them — that is the whole
    // reason these do not live behind the offline banner.
    test('findings survive a perfectly healthy hub', async () => {
        mockHub.mockResolvedValue([hubCard('pkg-a')]);
        mockScanErrors.mockReturnValue([{ archive: 'weird.tar.zst', error: 'unsupported compression' }]);

        const res = await buildCatalog({ experimentOn: false });

        expect(res.mode).toBe('online');
        expect(res.scanWarnings).toEqual([{ archive: 'weird.tar.zst', error: 'unsupported compression' }]);
    });

    // The search box filters CARDS. A warning names a file that has no card at
    // all, so a search term must not be able to hide it.
    test('the search filter does not touch them', async () => {
        mockHub.mockResolvedValue([hubCard('pkg-a')]);
        mockScanErrors.mockReturnValue([{ archive: 'broken.zip', error: 'zip: not a valid zip file' }]);

        const res = await buildCatalog({ search: 'nothing-matches-this', experimentOn: false });

        expect(res.pkgs).toEqual([]);
        expect(res.scanWarnings).toHaveLength(1);
    });

    // The scan is documented never-throw, but buildCatalog also promises never to
    // reject: if the leg blows up there are simply no findings to report.
    test('a scan that throws yields no findings rather than a crash', async () => {
        mockLocal.mockRejectedValue(new Error('scan exploded'));

        const res = await buildCatalog({ experimentOn: false });

        expect(res.scanWarnings).toEqual([]);
    });
});

describe('buildCatalog — name-keyed union', () => {
    test('a package in both catalogs is one card whose versions[] is the union', async () => {
        mockHub.mockResolvedValue([hubCard('pkg-a', { versions: [{ version: '2.0.0', minServer: '8.6.0' }, { version: '1.0.0', minServer: '8.5.0' }] })]);
        mockLocal.mockResolvedValue([localCard('pkg-a', ['1.0.0'])]);

        const { pkgs } = await buildCatalog({ experimentOn: false });

        expect(pkgs).toHaveLength(1);
        // Union, newest first; the shared version folds into ONE row.
        expect(pkgs[0].versions).toEqual([
            { version: '2.0.0', minServer: '8.6.0', source: 'hub' },
            // local wins the source (it is the only installable copy offline) but
            // must not lose the hub's minServer constraint.
            { version: '1.0.0', minServer: '8.5.0', source: 'local' },
        ]);
        // Recomputed over the union — not the local card's "newest zip on disk".
        expect(pkgs[0].latest_version).toBe('2.0.0');
    });

    test('hub metadata wins over the frozen local copy', async () => {
        mockHub.mockResolvedValue([hubCard('pkg-a', { icon: 'hub.png', docs: 'HUB.md' })]);
        mockLocal.mockResolvedValue([localCard('pkg-a', ['1.0.0'], { icon: 'zip.png', docs: 'ZIP.md' })]);

        const { pkgs } = await buildCatalog({ experimentOn: false });

        expect(pkgs[0]).toMatchObject({ icon: 'hub.png', docs: 'HUB.md' });
        expect(pkgs[0].github.description).toBe('pkg-a desc');
    });

    test('hub ordering is preserved and local-only packages follow it', async () => {
        mockHub.mockResolvedValue([hubCard('b'), hubCard('a')]);
        mockLocal.mockResolvedValue([localCard('a'), localCard('z')]);

        const { pkgs } = await buildCatalog({ experimentOn: false });
        expect(pkgs.map((p) => p.name)).toEqual(['b', 'a', 'z']);
    });

    // issue #1452 — the local leg publishes CARDS ONLY. It used to return an
    // `archivePathMap` that `buildCatalog` passed through to a recoil atom so the
    // install could quote a zip path back at the server; the install now finds the
    // zip itself from name+version, so there is nothing to thread through.
    test('the result carries no file paths for the caller to thread anywhere', async () => {
        mockLocal.mockResolvedValue([localCard('pkg-a')]);

        const res = await buildCatalog({ experimentOn: false });

        // `scanWarnings` joined this list (issue #1452) and is NOT a path channel:
        // it holds the scan's DIAGNOSTIC records, which name a file only to say it
        // could not be used. Nothing installs from them — hence the `.zip` assertion
        // below, which still has to hold with the list present (it is empty here).
        expect(Object.keys(res).sort()).toEqual(['hubError', 'lastSyncAt', 'mode', 'pkgs', 'scanWarnings']);
        expect(JSON.stringify(res)).not.toContain('.zip');
        // The one thing the offline path DOES need survives: the source tag.
        expect(res.pkgs[0].versions?.[0].source).toBe('local');
    });
});

describe('buildCatalog — experiment gate (issue #1438 preserved)', () => {
    // The archive's package.json is a packaging-time snapshot: it cannot know the
    // hub pulled the package back for revalidation after the archive was cut.
    test('the hub experiment flag overrides the local one', async () => {
        mockHub.mockResolvedValue([hubCard('pkg-a', { experiment: true })]);
        mockLocal.mockResolvedValue([localCard('pkg-a', ['1.0.0'], { experiment: false })]);

        const on = await buildCatalog({ experimentOn: true });
        expect(on.pkgs[0].experiment).toBe(true);

        // …and with experiment mode off, the merged flag hides the card.
        const off = await buildCatalog({ experimentOn: false });
        expect(off.pkgs).toEqual([]);
    });

    test('an installed experiment package keeps its card with the mode off (grandfathered)', async () => {
        mockHub.mockResolvedValue([hubCard('pkg-a', { experiment: true })]);
        mockGetFiles.mockResolvedValue(publicListing(['pkg-a']));
        mockManifest.mockResolvedValue({ version: '1.0.0' });

        const { pkgs } = await buildCatalog({ experimentOn: false });
        expect(pkgs.map((p) => p.name)).toEqual(['pkg-a']);
        expect(pkgs[0].installed_frontend).toBe(true);
    });

    test('a local-only experiment package is gated by its own flag', async () => {
        mockHub.mockRejectedValue(new Error('offline'));
        mockLocal.mockResolvedValue([localCard('pkg-a', ['1.0.0'], { experiment: true })]);

        expect((await buildCatalog({ experimentOn: false })).pkgs).toEqual([]);
        expect((await buildCatalog({ experimentOn: true })).pkgs).toHaveLength(1);
    });
});

describe('buildCatalog — search filter', () => {
    test('matches on name and on github.description, case-insensitively', async () => {
        mockHub.mockResolvedValue([hubCard('pkg-a', { github: github('pkg-a', 'Collects OPC UA tags') }), hubCard('pkg-b')]);

        expect((await buildCatalog({ experimentOn: false, search: 'PKG-A' })).pkgs.map((p) => p.name)).toEqual(['pkg-a']);
        expect((await buildCatalog({ experimentOn: false, search: 'opc ua' })).pkgs.map((p) => p.name)).toEqual(['pkg-a']);
        expect((await buildCatalog({ experimentOn: false, search: 'nothing' })).pkgs).toEqual([]);
    });

    // Local entries come from a file on disk that may have no github block at all.
    // The filter dereferences github.description unguarded, so this used to be a
    // TypeError on the first keystroke.
    test('a degraded local-only entry matches without throwing', async () => {
        mockHub.mockRejectedValue(new Error('offline'));
        mockLocal.mockResolvedValue([localCard('pkg-a', ['1.0.0'], { github: {} as any })]);

        const { pkgs } = await buildCatalog({ experimentOn: false, search: 'pkg' });
        expect(pkgs.map((p) => p.name)).toEqual(['pkg-a']);
        expect(pkgs[0].github.description).toBe('');
    });

    test('a synthesized installed-only card is searchable too', async () => {
        mockHub.mockRejectedValue(new Error('offline'));
        mockGetFiles.mockResolvedValue(publicListing(['neo-pkg-installed']));
        mockManifest.mockResolvedValue({ version: '1.2.3' });

        const { pkgs } = await buildCatalog({ experimentOn: false, search: 'installed' });
        expect(pkgs.map((p) => p.name)).toEqual(['neo-pkg-installed']);
    });
});

describe('mergeVersions', () => {
    test('sorts newest-first and tags every row with a source', () => {
        expect(mergeVersions([{ version: '1.0.0', minServer: '' }], [{ version: '2.0.0', minServer: '', source: 'local' }])).toEqual([
            { version: '2.0.0', minServer: '', source: 'local' },
            { version: '1.0.0', minServer: '', source: 'hub' },
        ]);
    });

    test('a blank local minServer does not erase the hub constraint for the same version', () => {
        expect(mergeVersions([{ version: '1.0.0', minServer: '8.5.0', released_at: 'T' }], [{ version: '1.0.0', minServer: '' }])).toEqual([
            { version: '1.0.0', minServer: '8.5.0', released_at: 'T', source: 'local' },
        ]);
    });

    test('missing / malformed inputs degrade to an empty list', () => {
        expect(mergeVersions(undefined, undefined)).toEqual([]);
        expect(mergeVersions([{ version: '', minServer: '' }], undefined)).toEqual([]);
    });
});
