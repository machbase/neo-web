import { fireEvent, render } from '@testing-library/react';
import { PkgIcon } from './PkgIcon';
import { localIconPath, pkgIconSources } from './pkgIconSource';

const REMOTE = 'https://raw.githubusercontent.com/machbase/neo-pkg-demo/main/icon.png';

describe('localIconPath', () => {
    test('builds the installed copy path for a plain package name', () => {
        expect(localIconPath('neo-pkg-demo')).toBe('/public/neo-pkg-demo/icon.png');
    });

    // THE #1452 REGRESSION. The file name used to be hardcoded to `icon.png`, so
    // neo-pkg-dbus (which ships icon.svg) 404'd and fell through to the glyph.
    test('uses the file name it is given — icon.svg is a real package (neo-pkg-dbus)', () => {
        expect(localIconPath('neo-pkg-dbus', 'icon.svg')).toBe('/public/neo-pkg-dbus/icon.svg');
        expect(localIconPath('neo-pkg-a', 'icon.webp')).toBe('/public/neo-pkg-a/icon.webp');
    });

    test('refuses names that could escape /public/ or start a protocol-relative url', () => {
        expect(localIconPath('../etc')).toBeUndefined();
        expect(localIconPath('a/b')).toBeUndefined();
        expect(localIconPath('/evil')).toBeUndefined();
        expect(localIconPath('')).toBeUndefined();
        expect(localIconPath(undefined)).toBeUndefined();
    });

    // The file name is read off the server's disk, i.e. chosen by whoever can write
    // into /public/ — so it gets exactly the same guard as the directory name.
    test('refuses file names that could escape the package directory', () => {
        expect(localIconPath('neo-pkg-demo', '../../etc/passwd')).toBeUndefined();
        expect(localIconPath('neo-pkg-demo', 'a/b.png')).toBeUndefined();
        expect(localIconPath('neo-pkg-demo', '/etc/icon.png')).toBeUndefined();
        expect(localIconPath('neo-pkg-demo', 'a\\b.png')).toBeUndefined();
        expect(localIconPath('neo-pkg-demo', '..')).toBeUndefined();
        expect(localIconPath('neo-pkg-demo', '')).toBeUndefined();
    });
});

describe('pkgIconSources', () => {
    test('installed package prefers the local icon and keeps the remote url as fallback', () => {
        expect(pkgIconSources('neo-pkg-demo', REMOTE, true)).toEqual(['/public/neo-pkg-demo/icon.png', REMOTE]);
    });

    test('not installed ⇒ remote only', () => {
        expect(pkgIconSources('neo-pkg-demo', REMOTE, false)).toEqual([REMOTE]);
    });

    test('no candidate at all when not installed and no icon url', () => {
        expect(pkgIconSources('neo-pkg-demo', undefined, false)).toEqual([]);
        expect(pkgIconSources('neo-pkg-demo', '   ', false)).toEqual([]);
    });

    // issue #1452 — in local-only mode no request may leave the machine, and an
    // <img src> fires the instant it renders. The only way not to make the request
    // is never to hand over the URL, so the candidate is DROPPED, not deprioritised.
    describe('allowRemote=false (local-only mode)', () => {
        test('the remote url is removed from the candidate list', () => {
            expect(pkgIconSources('neo-pkg-demo', REMOTE, true, false)).toEqual(['/public/neo-pkg-demo/icon.png']);
        });

        test('a package that is not installed has NOTHING to try', () => {
            expect(pkgIconSources('neo-pkg-demo', REMOTE, false, false)).toEqual([]);
        });

        test('the local same-origin icon is never affected', () => {
            expect(pkgIconSources('neo-pkg-demo', undefined, true, false)).toEqual(['/public/neo-pkg-demo/icon.png']);
        });

        test('the default is true, so every pre-#1452 caller is unchanged', () => {
            expect(pkgIconSources('neo-pkg-demo', REMOTE, true)).toEqual(pkgIconSources('neo-pkg-demo', REMOTE, true, true));
        });
    });

    // ----------------------------------------------------------------------
    // The installed copy's REAL icon file name (issue #1452).
    // ----------------------------------------------------------------------
    // The four rows of the rule, one test each. The argument is three-valued and
    // the middle row is the one that is easy to lose: `''` is an ANSWER ("there is
    // no icon"), not a missing value.
    describe('installed icon file name', () => {
        test('installed + a reported file name ⇒ that exact path', () => {
            expect(pkgIconSources('neo-pkg-dbus', REMOTE, true, true, 'icon.svg')).toEqual(['/public/neo-pkg-dbus/icon.svg', REMOTE]);
        });

        // THE REAL CASE THIS FIX EXISTS FOR: neo-pkg-dbus is installed, ships
        // icon.svg, and the server is air-gapped — so the local candidate is the
        // ONLY one and a guessed icon.png meant the glyph, permanently.
        test('the neo-pkg-dbus regression: icon.svg loads even with no remote candidate', () => {
            expect(pkgIconSources('neo-pkg-dbus', REMOTE, true, false, 'icon.svg')).toEqual(['/public/neo-pkg-dbus/icon.svg']);
        });

        test('installed + the scan reports NO icon ⇒ no local candidate at all (no pointless 404)', () => {
            expect(pkgIconSources('neo-pkg-demo', REMOTE, true, true, '')).toEqual([REMOTE]);
            // …and with the remote candidate forbidden there is nothing left: the
            // glyph renders without a single request being fired.
            expect(pkgIconSources('neo-pkg-demo', REMOTE, true, false, '')).toEqual([]);
        });

        test('installed + nothing known ⇒ the historical icon.png guess (backward compatible)', () => {
            expect(pkgIconSources('neo-pkg-demo', REMOTE, true, true, undefined)).toEqual(['/public/neo-pkg-demo/icon.png', REMOTE]);
        });

        test('not installed ⇒ no local candidate, whatever the file name says', () => {
            expect(pkgIconSources('neo-pkg-dbus', REMOTE, false, true, 'icon.svg')).toEqual([REMOTE]);
        });

        // The name came off the server's disk. It is not trusted just because the
        // scan is ours.
        test('a file name that would escape the package directory is refused', () => {
            expect(pkgIconSources('neo-pkg-demo', REMOTE, true, true, '../../etc/passwd')).toEqual([REMOTE]);
            expect(pkgIconSources('neo-pkg-demo', REMOTE, true, true, 'sub/icon.png')).toEqual([REMOTE]);
            expect(pkgIconSources('neo-pkg-demo', undefined, true, true, '..%2ficon.png')).toEqual([]);
        });

        test('whitespace around a reported name is trimmed, blank reads as "no icon"', () => {
            expect(pkgIconSources('neo-pkg-demo', undefined, true, true, '  icon.svg  ')).toEqual(['/public/neo-pkg-demo/icon.svg']);
            expect(pkgIconSources('neo-pkg-demo', undefined, true, true, '   ')).toEqual([]);
        });
    });
});

describe('PkgIcon', () => {
    test('installed package starts at /public/{name}/icon.png', () => {
        const { container } = render(<PkgIcon className="app-store-item-thumb" pName="neo-pkg-demo" pIcon={REMOTE} pInstalled />);

        const img = container.querySelector('img');
        expect(img).not.toBeNull();
        expect(img?.getAttribute('src')).toBe('/public/neo-pkg-demo/icon.png');
    });

    test('first onError falls back to the remote url, second onError falls back to the glyph', () => {
        const { container } = render(<PkgIcon className="app-store-item-thumb" pName="neo-pkg-demo" pIcon={REMOTE} pInstalled />);

        fireEvent.error(container.querySelector('img') as HTMLImageElement);
        expect(container.querySelector('img')?.getAttribute('src')).toBe(REMOTE);

        fireEvent.error(container.querySelector('img') as HTMLImageElement);
        expect(container.querySelector('img')).toBeNull();
        expect(container.querySelector('svg')).not.toBeNull();
    });

    test('not installed and no icon url ⇒ glyph with no request attempted', () => {
        const { container } = render(<PkgIcon className="app-store-item-thumb" pName="neo-pkg-demo" />);

        expect(container.querySelector('img')).toBeNull();
        expect(container.querySelector('svg')).not.toBeNull();
    });

    test('keeps the container class each call site passes in', () => {
        const { container: item } = render(<PkgIcon className="app-store-item-thumb" pName="neo-pkg-demo" pIcon={REMOTE} />);
        const { container: info } = render(<PkgIcon className="app-store-item-info-thumb" pName="neo-pkg-demo" pIcon={REMOTE} />);

        expect(item.querySelector('.app-store-item-thumb')).not.toBeNull();
        expect(info.querySelector('.app-store-item-info-thumb')).not.toBeNull();
    });

    // issue #1452 — the two shapes local-only mode can produce.
    test('pAllowRemote={false}: an installed package tries only its own icon, then the glyph', () => {
        const { container } = render(<PkgIcon className="app-store-item-thumb" pName="neo-pkg-demo" pIcon={REMOTE} pInstalled pAllowRemote={false} />);

        expect(container.querySelector('img')?.getAttribute('src')).toBe('/public/neo-pkg-demo/icon.png');

        // The local file is missing too — and there is no remote candidate to fall
        // back to, so the very next state is the glyph and NOT a github request.
        fireEvent.error(container.querySelector('img') as HTMLImageElement);
        expect(container.querySelector('img')).toBeNull();
        expect(container.querySelector('svg')).not.toBeNull();
    });

    test('pAllowRemote={false}: a not-installed package renders the glyph with NO request at all', () => {
        const { container } = render(<PkgIcon className="app-store-item-thumb" pName="neo-pkg-demo" pIcon={REMOTE} pAllowRemote={false} />);

        expect(container.querySelector('img')).toBeNull();
        expect(container.querySelector('svg')).not.toBeNull();
    });

    test('flipping pAllowRemote back on restores the remote candidate', () => {
        const { container, rerender } = render(<PkgIcon className="app-store-item-thumb" pName="neo-pkg-demo" pIcon={REMOTE} pAllowRemote={false} />);
        expect(container.querySelector('img')).toBeNull();

        rerender(<PkgIcon className="app-store-item-thumb" pName="neo-pkg-demo" pIcon={REMOTE} pAllowRemote />);
        expect(container.querySelector('img')?.getAttribute('src')).toBe(REMOTE);
    });

    // issue #1452 — the file name reaches the <img> as-is.
    test('pInstalledIcon="icon.svg" renders /public/{name}/icon.svg', () => {
        const { container } = render(<PkgIcon className="app-store-item-thumb" pName="neo-pkg-dbus" pIcon={REMOTE} pInstalled pInstalledIcon="icon.svg" />);

        expect(container.querySelector('img')?.getAttribute('src')).toBe('/public/neo-pkg-dbus/icon.svg');
    });

    test('pInstalledIcon="" (the scan found no icon) goes straight to the remote url', () => {
        const { container } = render(<PkgIcon className="app-store-item-thumb" pName="neo-pkg-demo" pIcon={REMOTE} pInstalled pInstalledIcon="" />);

        expect(container.querySelector('img')?.getAttribute('src')).toBe(REMOTE);
    });

    test('pInstalledIcon="" in local-only mode renders the glyph with NO request', () => {
        const { container } = render(
            <PkgIcon className="app-store-item-thumb" pName="neo-pkg-demo" pIcon={REMOTE} pInstalled pAllowRemote={false} pInstalledIcon="" />
        );

        expect(container.querySelector('img')).toBeNull();
        expect(container.querySelector('svg')).not.toBeNull();
    });

    test('the candidate list resets when the reported file name changes', () => {
        const { container, rerender } = render(<PkgIcon className="app-store-item-thumb" pName="neo-pkg-a" pIcon={REMOTE} pInstalled pInstalledIcon="icon.png" />);

        fireEvent.error(container.querySelector('img') as HTMLImageElement);
        expect(container.querySelector('img')?.getAttribute('src')).toBe(REMOTE);

        rerender(<PkgIcon className="app-store-item-thumb" pName="neo-pkg-a" pIcon={REMOTE} pInstalled pInstalledIcon="icon.svg" />);
        expect(container.querySelector('img')?.getAttribute('src')).toBe('/public/neo-pkg-a/icon.svg');
    });

    test('switching to another package retries its own local icon', () => {
        const { container, rerender } = render(<PkgIcon className="app-store-item-thumb" pName="neo-pkg-a" pIcon={REMOTE} pInstalled />);

        fireEvent.error(container.querySelector('img') as HTMLImageElement);
        expect(container.querySelector('img')?.getAttribute('src')).toBe(REMOTE);

        rerender(<PkgIcon className="app-store-item-thumb" pName="neo-pkg-b" pIcon={REMOTE} pInstalled />);
        expect(container.querySelector('img')?.getAttribute('src')).toBe('/public/neo-pkg-b/icon.png');
    });
});
