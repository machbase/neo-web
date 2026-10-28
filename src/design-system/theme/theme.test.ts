import { THEME_CHANGE_EVENT, THEME_LINK_ID, THEME_STORAGE_KEY, applyStoredTheme, applyTheme, currentScheme, parseThemeManifest, readStoredTheme, setTheme, themeStylesheetUrl } from './theme';
import { rgbToHex } from './resolveColor';

const LIGHT = { pkg: 'neo-pkg-theme-light', stylesheet: 'theme.css', label: 'Light', scheme: 'light' as const };

const link = () => document.getElementById(THEME_LINK_ID) as HTMLLinkElement | null;
const loadLink = () => link()?.dispatchEvent(new Event('load'));

afterEach(() => {
    applyTheme(null);
    document.querySelectorAll('link').forEach((l) => l.remove());
    localStorage.clear();
});

describe('parseThemeManifest', () => {
    test('reads label, stylesheet and scheme', () => {
        expect(parseThemeManifest('neo-pkg-theme-light', { neoTheme: { label: 'Light', stylesheet: 'theme.css', scheme: 'light' } })).toEqual(LIGHT);
    });

    test('a package without neoTheme is not a theme', () => {
        expect(parseThemeManifest('neo-pkg-dbus', { name: 'neo-pkg-dbus', version: '1.0.0' })).toBeNull();
        expect(parseThemeManifest('neo-pkg-dbus', null)).toBeNull();
    });

    test('label defaults to the package name, scheme to dark', () => {
        expect(parseThemeManifest('my-theme', { neoTheme: { stylesheet: 'css/theme.css' } })).toEqual({ pkg: 'my-theme', stylesheet: 'css/theme.css', label: 'my-theme', scheme: 'dark' });
    });

    test.each([['../other/theme.css'], ['./theme.css'], ['css/../../x.css'], ['/etc/theme.css'], ['https://example.com/t.css'], ['theme.js'], ['theme.css?x=1'], [''], [42]])('refuses stylesheet %p', (aStylesheet) => {
        expect(parseThemeManifest('t', { neoTheme: { stylesheet: aStylesheet } })).toBeNull();
    });

    test.each([['../x'], ['a/b'], [''], ['.hidden']])('refuses package name %p', (aPkg) => {
        expect(parseThemeManifest(aPkg, { neoTheme: { stylesheet: 'theme.css' } })).toBeNull();
    });
});

describe('applyTheme / setTheme', () => {
    test('adds the stylesheet link, the attribute and the colour scheme', () => {
        applyTheme(LIGHT);
        expect(link()?.getAttribute('href')).toBe('/public/neo-pkg-theme-light/theme.css');
        expect(document.documentElement.dataset.neoTheme).toBe('neo-pkg-theme-light');
        expect(currentScheme()).toBe('light');
    });

    test('the default removes all of it', () => {
        applyTheme(LIGHT);
        applyTheme(null);
        expect(link()).toBeNull();
        expect(document.documentElement.dataset.neoTheme).toBeUndefined();
        expect(currentScheme()).toBe('dark');
    });

    test('the change event fires once the stylesheet has loaded', () => {
        const sSeen: unknown[] = [];
        const sOn = (e: Event) => sSeen.push((e as CustomEvent).detail);
        window.addEventListener(THEME_CHANGE_EVENT, sOn);
        applyTheme(LIGHT);
        expect(sSeen).toEqual([]);
        loadLink();
        expect(sSeen).toEqual([LIGHT]);
        window.removeEventListener(THEME_CHANGE_EVENT, sOn);
    });

    test('switching keeps the old sheet until the new one has loaded', () => {
        applyTheme(LIGHT);
        loadLink();
        applyTheme({ ...LIGHT, pkg: 'neo-pkg-theme-solar' });
        expect(document.querySelectorAll('link[rel="stylesheet"]')).toHaveLength(2);
        loadLink();
        const sLinks = [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.getAttribute('href'));
        expect(sLinks).toEqual(['/public/neo-pkg-theme-solar/theme.css']);
    });

    test('a stylesheet that fails to load still ends the switch (the dark defaults show)', () => {
        const sOn = jest.fn();
        window.addEventListener(THEME_CHANGE_EVENT, sOn);
        applyTheme(LIGHT);
        link()?.dispatchEvent(new Event('error'));
        expect(sOn).toHaveBeenCalledTimes(1);
        window.removeEventListener(THEME_CHANGE_EVENT, sOn);
    });

    test('setTheme remembers the choice; the next load applies it before any request', () => {
        setTheme(LIGHT);
        expect(JSON.parse(localStorage.getItem(THEME_STORAGE_KEY) ?? 'null')).toEqual(LIGHT);
        applyTheme(null);
        applyStoredTheme();
        expect(link()?.getAttribute('href')).toBe('/public/neo-pkg-theme-light/theme.css');
        setTheme(null);
        expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
        expect(link()).toBeNull();
    });

    test('a hand-edited stored value is validated like a manifest', () => {
        localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ pkg: 'x', stylesheet: '../../evil.css' }));
        expect(readStoredTheme()).toBeNull();
        localStorage.setItem(THEME_STORAGE_KEY, '{not json');
        expect(readStoredTheme()).toBeNull();
    });

    test('url segments are encoded', () => {
        expect(themeStylesheetUrl({ ...LIGHT, pkg: 'a.b_c-d', stylesheet: 'css/t.css' })).toBe('/public/a.b_c-d/css/t.css');
    });
});

describe('rgbToHex', () => {
    test.each([
        ['rgb(37, 37, 37)', '#252525'],
        ['rgba(255, 255, 255, 0.5)', '#ffffff80'],
        ['rgb(0 108 210 / 50%)', '#006cd280'],
        ['rgba(1, 2, 3, 1)', '#010203'],
    ])('%s → %s', (aIn, aOut) => {
        expect(rgbToHex(aIn)).toBe(aOut);
    });

    test('not rgb → undefined', () => {
        expect(rgbToHex('color(srgb 1 0 0)')).toBeUndefined();
        expect(rgbToHex('red')).toBeUndefined();
    });
});

describe('the remembered stylesheet copy', () => {
    const HREF = '/public/neo-pkg-theme-light/theme.css';

    test('paints at once on the next load, before the package stylesheet answers', () => {
        localStorage.setItem('neo.theme.css', JSON.stringify({ href: HREF, css: ':root { --neo-bg-primary: #fff; }' }));
        applyTheme(LIGHT);
        expect(document.getElementById('neo-theme-cached')?.textContent).toContain('--neo-bg-primary');
        // The package's own stylesheet comes after it, so a newer copy wins.
        const sHead = [...document.head.children].map((e) => e.id);
        expect(sHead.indexOf('neo-theme-cached')).toBeLessThan(sHead.indexOf(THEME_LINK_ID));
    });

    test('a stylesheet that fails to load drops the copy: no stale theme keeps painting', () => {
        localStorage.setItem('neo.theme.css', JSON.stringify({ href: HREF, css: ':root { --neo-bg-primary: #fff; }' }));
        applyTheme(LIGHT);
        link()?.dispatchEvent(new Event('error'));
        expect(document.getElementById('neo-theme-cached')).toBeNull();
        expect(localStorage.getItem('neo.theme.css')).toBeNull();
    });

    test('a copy of another stylesheet is not used', () => {
        localStorage.setItem('neo.theme.css', JSON.stringify({ href: '/public/other/theme.css', css: ':root{}' }));
        applyTheme(LIGHT);
        expect(document.getElementById('neo-theme-cached')).toBeNull();
    });

    test('Dark forgets the copy too', () => {
        localStorage.setItem('neo.theme.css', JSON.stringify({ href: HREF, css: ':root{}' }));
        setTheme(LIGHT);
        setTheme(null);
        expect(localStorage.getItem('neo.theme.css')).toBeNull();
        expect(document.getElementById('neo-theme-cached')).toBeNull();
    });
});
