// issue #1452 — the six-way verdict for a `/public/` directory, in isolation.
//
// The inputs are the real ones measured on a server:
//
//   neo-pkg-opcua-client-main    name neo-pkg-opcua-client   prefix ✓   .git ✗
//   neo-pkg-replication-1.0.5    name neo-pkg-replication    prefix ✓   .git ✗
//   stage                        name neo-pkg-opcua-client   prefix ✗   .git ✗

import { classifyInstalledDir, isStrayRemovable, isStrayVerdict } from './strayDirs';

describe('classifyInstalledDir — the rule, in order', () => {
    // RULE 1 — AND IT IS FIRST FOR A REASON. Both install paths produce a directory
    // named exactly `package.json.name`, so a name any catalog publishes IS that
    // package's install. The naming heuristics below only ever judge directories
    // nobody has heard of.
    test('a name the catalog knows is an install, whatever its manifest says', () => {
        expect(classifyInstalledDir('neo-pkg-foo', { name: 'something-else', git: false }, true)).toBe('installed');
        expect(classifyInstalledDir('neo-pkg-foo', undefined, true)).toBe('installed');
        expect(classifyInstalledDir('stage', { name: 'neo-pkg-foo', git: false }, true)).toBe('installed');
    });

    // RULE 2 — an interrupted `pkg copy` has no readable package.json, and its card
    // is the only way to uninstall it. It must keep behaving exactly as before.
    test.each([
        ['no info at all', undefined],
        ['an empty name', { name: '' }],
        ['a whitespace name', { name: '   ' }],
    ])('%s ⇒ unclaimed (historical behaviour applies)', (_label, info) => {
        expect(classifyInstalledDir('neo-pkg-half', info as never, false)).toBe('unclaimed');
    });

    // RULE 3 — it looks exactly like an install of a package no catalog lists,
    // which is the case buildCatalog has always synthesized a card for.
    test('dir name === package name ⇒ unclaimed', () => {
        expect(classifyInstalledDir('neo-pkg-orphan', { name: 'neo-pkg-orphan', git: false }, false)).toBe('unclaimed');
    });

    // RULE 4 — what GitHub's zip and tarball actually unpack to.
    test.each([
        ['{repo}-{branch}', 'neo-pkg-opcua-client-main', 'neo-pkg-opcua-client'],
        ['{repo}-{tag}', 'neo-pkg-replication-1.0.5', 'neo-pkg-replication'],
    ])('%s with no .git ⇒ strayArchive', (_label, dir, name) => {
        expect(classifyInstalledDir(dir, { name, git: false }, false)).toBe('strayArchive');
    });

    // RULE 5 — deleting a working clone destroys uncommitted work, so `.git`
    // withdraws the Remove action while keeping the card.
    test('the same directory WITH .git ⇒ strayClone', () => {
        expect(classifyInstalledDir('neo-pkg-foo-dev', { name: 'neo-pkg-foo', git: true }, false)).toBe('strayClone');
    });

    // THE FAIL-SAFE DIRECTION. `undefined` is "we could not ask" (an older script
    // body), and it must never be read as "there is no .git".
    test('an unknown .git state lands on strayClone, not strayArchive', () => {
        expect(classifyInstalledDir('neo-pkg-foo-main', { name: 'neo-pkg-foo' }, false)).toBe('strayClone');
    });

    // RULE 6 — `stage` is the backend's work directory. It contains a package copy
    // and is not a package.
    test('a name that does not start with the package name ⇒ foreign', () => {
        expect(classifyInstalledDir('stage', { name: 'neo-pkg-opcua-client', git: false }, false)).toBe('foreign');
    });

    test('a prefix is a PREFIX, not a substring', () => {
        expect(classifyInstalledDir('my-neo-pkg-foo-copy', { name: 'neo-pkg-foo', git: false }, false)).toBe('foreign');
    });
});

describe('the verdict → what the card may do', () => {
    test('both stray verdicts get a card', () => {
        expect(isStrayVerdict('strayArchive')).toBe(true);
        expect(isStrayVerdict('strayClone')).toBe(true);
    });

    test('nothing else does', () => {
        expect(isStrayVerdict('installed')).toBe(false);
        expect(isStrayVerdict('unclaimed')).toBe(false);
        expect(isStrayVerdict('foreign')).toBe(false);
    });

    // ONLY the unpacked archive. An `installed` / `unclaimed` directory goes through
    // the real uninstall flow (which runs scripts.uninstall); a clone is a workspace.
    test('only an unpacked archive may be removed', () => {
        expect(isStrayRemovable('strayArchive')).toBe(true);
        expect(isStrayRemovable('strayClone')).toBe(false);
        expect(isStrayRemovable('installed')).toBe(false);
        expect(isStrayRemovable('unclaimed')).toBe(false);
        expect(isStrayRemovable('foreign')).toBe(false);
    });
});

// A `foreign` VERDICT SAYS NOTHING TO THE USER. The module used to export a
// `foreignDirWarning` string builder and this file used to assert its wording;
// both are gone. The verdict is still produced — that is what keeps `stage/` out
// of the stray cards, asserted above — but it now leads nowhere, because a
// directory we neither own nor can distinguish from a deliberate one is not a
// finding worth repeating on every catalog build.
//
// The end of that story is in catalog.test.ts, where `stage` yields no card AND
// no warning while the archive findings keep coming.
describe('a foreign directory has no user-facing message', () => {
    test('the module exports no warning builder for it', async () => {
        const mod = await import('./strayDirs');

        expect(Object.keys(mod)).not.toContain('foreignDirWarning');
    });
});
