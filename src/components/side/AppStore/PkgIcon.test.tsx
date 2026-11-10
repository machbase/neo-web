import { act, fireEvent, render } from '@testing-library/react';
import { PkgIcon } from './PkgIcon';
import { localIconPath, pkgIconSources } from './pkgIconSource';
import { lightGlyphOf } from './pkgIconGlyph';

jest.mock('./pkgIconGlyph', () => ({ ...jest.requireActual('./pkgIconGlyph'), lightGlyphOf: jest.fn(() => Promise.resolve(false)) }));
const mockLightGlyphOf = lightGlyphOf as jest.MockedFunction<typeof lightGlyphOf>;

const REMOTE = 'https://raw.githubusercontent.com/machbase/neo-pkg-demo/main/icon.png';

describe('localIconPath', () => {
    test('builds the installed copy path for a plain package name', () => {
        expect(localIconPath('neo-pkg-demo')).toBe('/public/neo-pkg-demo/icon.png');
    });

    // THE #1452 REGRESSION. The file name used to be hardcoded to `icon.png`, so
    // neo-pkg-dbus (which ships icon.svg) 404'd and fell through to the glyph.
    test('uses the file name it is given — icon.svg is a real package (neo-pkg-dbus)', () => {
        expect(localIconPath('neo-pkg-dbus', 'icon.svg')).toBe('/public/neo-pkg-dbus/icon.svg');
        // the installed version in the address: an update is a new address, so the browser does not show its cached icon
        expect(localIconPath('neo-pkg-dbus', 'icon.svg', '1.13.51')).toBe('/public/neo-pkg-dbus/icon.svg?v=1.13.51');
        expect(localIconPath('neo-pkg-dbus', 'icon.svg', ' 2.0.0-rc+1 ')).toBe('/public/neo-pkg-dbus/icon.svg?v=2.0.0-rc%2B1');
        expect(localIconPath('neo-pkg-dbus', 'icon.svg', '')).toBe('/public/neo-pkg-dbus/icon.svg');
        expect(pkgIconSources('neo-pkg-demo', 'https://example.com/i.png', true, 'icon.png', '1.0.1')).toEqual(['/public/neo-pkg-demo/icon.png?v=1.0.1']);
        expect(pkgIconSources('neo-pkg-demo', 'https://example.com/i.png', false, 'icon.png', '1.0.1')).toEqual(['https://example.com/i.png']);
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
    // An installed package is drawn from its own tree and nowhere else: the remote
    // url is NOT a fallback for it (see `pkgIconSources`).
    test('installed package tries only its own icon — no remote fallback', () => {
        expect(pkgIconSources('neo-pkg-demo', REMOTE, true)).toEqual(['/public/neo-pkg-demo/icon.png']);
    });

    test('not installed ⇒ remote only', () => {
        expect(pkgIconSources('neo-pkg-demo', REMOTE, false)).toEqual([REMOTE]);
    });

    test('no candidate at all when not installed and no icon url', () => {
        expect(pkgIconSources('neo-pkg-demo', undefined, false)).toEqual([]);
        expect(pkgIconSources('neo-pkg-demo', '   ', false)).toEqual([]);
    });

    // ----------------------------------------------------------------------
    // The installed copy's REAL icon file name (issue #1452).
    // ----------------------------------------------------------------------
    // The four rows of the rule, one test each. The argument is three-valued and
    // the middle row is the one that is easy to lose: `''` is an ANSWER ("there is
    // no icon"), not a missing value.
    describe('installed icon file name', () => {
        // neo-pkg-dbus ships icon.svg; a guessed icon.png used to mean the glyph.
        test('installed + a reported file name ⇒ that exact path, and nothing else', () => {
            expect(pkgIconSources('neo-pkg-dbus', REMOTE, true, 'icon.svg')).toEqual(['/public/neo-pkg-dbus/icon.svg']);
        });

        test('installed + the scan reports NO icon ⇒ nothing to try: no 404, no remote request', () => {
            expect(pkgIconSources('neo-pkg-demo', REMOTE, true, '')).toEqual([]);
        });

        test('installed + nothing known ⇒ the historical icon.png guess (backward compatible)', () => {
            expect(pkgIconSources('neo-pkg-demo', REMOTE, true, undefined)).toEqual(['/public/neo-pkg-demo/icon.png']);
        });

        test('not installed ⇒ no local candidate, whatever the file name says', () => {
            expect(pkgIconSources('neo-pkg-dbus', REMOTE, false, 'icon.svg')).toEqual([REMOTE]);
        });

        // The name came off the server's disk. It is not trusted just because the
        // scan is ours — and a refused name does NOT reopen the remote route.
        test('a file name that would escape the package directory is refused', () => {
            expect(pkgIconSources('neo-pkg-demo', REMOTE, true, '../../etc/passwd')).toEqual([]);
            expect(pkgIconSources('neo-pkg-demo', REMOTE, true, 'sub/icon.png')).toEqual([]);
            expect(pkgIconSources('neo-pkg-demo', undefined, true, '..%2ficon.png')).toEqual([]);
        });

        test('whitespace around a reported name is trimmed, blank reads as "no icon"', () => {
            expect(pkgIconSources('neo-pkg-demo', undefined, true, '  icon.svg  ')).toEqual(['/public/neo-pkg-demo/icon.svg']);
            expect(pkgIconSources('neo-pkg-demo', undefined, true, '   ')).toEqual([]);
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

    test('an installed icon that fails to load falls back to the glyph — never to the remote url', () => {
        const { container } = render(<PkgIcon className="app-store-item-thumb" pName="neo-pkg-demo" pIcon={REMOTE} pInstalled />);

        fireEvent.error(container.querySelector('img') as HTMLImageElement);
        expect(container.querySelector('img')).toBeNull();
        expect(container.querySelector('svg')).not.toBeNull();
    });

    test('a not-installed package loads the remote url', () => {
        const { container } = render(<PkgIcon className="app-store-item-thumb" pName="neo-pkg-demo" pIcon={REMOTE} />);

        expect(container.querySelector('img')?.getAttribute('src')).toBe(REMOTE);
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

    // issue #1452 — the file name reaches the <img> as-is.
    test('pInstalledIcon="icon.svg" renders /public/{name}/icon.svg', () => {
        const { container } = render(<PkgIcon className="app-store-item-thumb" pName="neo-pkg-dbus" pIcon={REMOTE} pInstalled pInstalledIcon="icon.svg" />);

        expect(container.querySelector('img')?.getAttribute('src')).toBe('/public/neo-pkg-dbus/icon.svg');
    });

    test('pInstalledIcon="" (the scan found no icon) renders the glyph with NO request', () => {
        const { container } = render(<PkgIcon className="app-store-item-thumb" pName="neo-pkg-demo" pIcon={REMOTE} pInstalled pInstalledIcon="" />);

        expect(container.querySelector('img')).toBeNull();
        expect(container.querySelector('svg')).not.toBeNull();
    });

    test('the candidate list resets when the reported file name changes', () => {
        const { container, rerender } = render(<PkgIcon className="app-store-item-thumb" pName="neo-pkg-a" pIcon={REMOTE} pInstalled pInstalledIcon="icon.png" />);

        fireEvent.error(container.querySelector('img') as HTMLImageElement);
        expect(container.querySelector('img')).toBeNull();

        rerender(<PkgIcon className="app-store-item-thumb" pName="neo-pkg-a" pIcon={REMOTE} pInstalled pInstalledIcon="icon.svg" />);
        expect(container.querySelector('img')?.getAttribute('src')).toBe('/public/neo-pkg-a/icon.svg');
    });

    test('switching to another package retries its own local icon', () => {
        const { container, rerender } = render(<PkgIcon className="app-store-item-thumb" pName="neo-pkg-a" pIcon={REMOTE} pInstalled />);

        fireEvent.error(container.querySelector('img') as HTMLImageElement);
        expect(container.querySelector('img')).toBeNull();

        rerender(<PkgIcon className="app-store-item-thumb" pName="neo-pkg-b" pIcon={REMOTE} pInstalled />);
        expect(container.querySelector('img')?.getAttribute('src')).toBe('/public/neo-pkg-b/icon.png');
    });
});

// A white line drawing is painted as a shape in the theme's text colour; a logo stays an image.
describe('PkgIcon: a white line-drawn icon follows the theme', () => {
    afterEach(() => mockLightGlyphOf.mockImplementation(() => Promise.resolve(false)));

    test('a light glyph is drawn as a mask of the same image, not as an <img>', async () => {
        mockLightGlyphOf.mockImplementation(() => Promise.resolve(true));
        const { container } = render(<PkgIcon className="app-store-item-thumb" pName="neo-pkg-demo" pIcon={REMOTE} />);
        await act(async () => {});
        const glyph = container.querySelector('.pkg-icon-glyph') as HTMLElement;
        expect(glyph).not.toBeNull();
        expect(glyph.style.mask || glyph.getAttribute('style')).toContain(REMOTE);
        expect(container.querySelector('img')).toBeNull();
    });

    test('a logo, or an icon that cannot be read, stays the image it was', async () => {
        const { container } = render(<PkgIcon className="app-store-item-thumb" pName="neo-pkg-demo" pIcon={REMOTE} />);
        await act(async () => {});
        expect(container.querySelector('img')?.getAttribute('src')).toBe(REMOTE);
        expect(container.querySelector('.pkg-icon-glyph')).toBeNull();
    });
});
