import {
    THEME_CHANGE_EVENT,
    THEME_LINK_ID,
    THEME_PREVIEW_STYLE_ID,
    THEME_STORAGE_KEY,
    applyStoredTheme,
    applyTheme,
    clearThemePreview,
    currentScheme,
    declaresTheme,
    handleThemeRequest,
    parseThemeIndex,
    parseThemeManifest,
    previewTheme,
    readStoredTheme,
    setTheme,
    themeIndexFiles,
    themeKey,
    themeStylesheetUrl,
    themeUser,
    readLocalThemes,
    localThemeCss,
    LOCAL_THEME_PKG,
} from './theme';
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
        expect(document.documentElement.dataset.neoScheme).toBe('light');
        expect(currentScheme()).toBe('light');
    });

    test('the default removes all of it', () => {
        applyTheme(LIGHT);
        applyTheme(null);
        expect(link()).toBeNull();
        expect(document.documentElement.dataset.neoTheme).toBeUndefined();
        expect(document.documentElement.dataset.neoScheme).toBeUndefined();
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
        // a computed color-mix()
        ['color(srgb 1 0 0)', '#ff0000'],
        ['color(srgb 0.407843 0.466667 0.541176 / 0.28)', '#68778a47'],
    ])('%s → %s', (aIn, aOut) => {
        expect(rgbToHex(aIn)).toBe(aOut);
    });

    test('not rgb → undefined', () => {
        expect(rgbToHex('color(display-p3 1 0 0)')).toBeUndefined();
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

describe('a package holding several themes (neoTheme.index)', () => {
    const BUILDER = { name: 'neo-pkg-theme-builder', neoTheme: { label: 'Theme Builder', index: ['themes.json', 'user/themes.json'] } };

    test('the index files a manifest names; unusable paths are dropped', () => {
        expect(themeIndexFiles(BUILDER)).toEqual(['themes.json', 'user/themes.json']);
        expect(themeIndexFiles({ neoTheme: { index: 'themes.json' } })).toEqual(['themes.json']);
        expect(themeIndexFiles({ neoTheme: { index: ['../x.json', '/etc/x.json', 'x.css', 42, 'ok/list.json'] } })).toEqual(['ok/list.json']);
        expect(themeIndexFiles({ neoTheme: { stylesheet: 'theme.css' } })).toEqual([]);
    });

    test('an index-only manifest declares a theme but is no single theme', () => {
        expect(parseThemeManifest('neo-pkg-theme-builder', BUILDER)).toBeNull();
        expect(declaresTheme('neo-pkg-theme-builder', BUILDER)).toBe(true);
        expect(declaresTheme('neo-pkg-theme-light', { neoTheme: { stylesheet: 'theme.css' } })).toBe(true);
        expect(declaresTheme('neo-pkg-dbus', { name: 'neo-pkg-dbus' })).toBe(false);
        expect(declaresTheme('../x', BUILDER)).toBe(false);
    });

    test('an index lists entries; a bad entry is dropped, not the list', () => {
        const sIndex = [
            { id: 'light', label: 'Light', stylesheet: 'presets/light.css', scheme: 'light' },
            { id: 'evil', label: 'Evil', stylesheet: '../../x.css' },
            { label: 'Night', stylesheet: 'user/night.css' },
        ];
        expect(parseThemeIndex('p', sIndex)).toEqual([
            { pkg: 'p', stylesheet: 'presets/light.css', label: 'Light', scheme: 'light' },
            { pkg: 'p', stylesheet: 'user/night.css', label: 'Night', scheme: 'dark' },
        ]);
        expect(parseThemeIndex('p', { themes: sIndex })).toHaveLength(2);
        expect(parseThemeIndex('p', null)).toEqual([]);
        expect(parseThemeIndex('p', 'nope')).toEqual([]);
    });

    test('two themes of one package are told apart by stylesheet', () => {
        expect(themeKey({ pkg: 'p', stylesheet: 'presets/light.css' })).not.toBe(themeKey({ pkg: 'p', stylesheet: 'user/night.css' }));
    });
});

describe('reload: the stylesheet itself changed', () => {
    const HREF = '/public/neo-pkg-theme-light/theme.css';

    test('the same theme again is a no-op without reload', () => {
        applyTheme(LIGHT);
        const sFirst = link();
        applyTheme(LIGHT);
        expect(link()).toBe(sFirst);
    });

    test('with reload: the stale copy is dropped and the stylesheet is linked again past the cache', () => {
        localStorage.setItem('neo.theme.css', JSON.stringify({ href: HREF, css: ':root { --neo-bg-primary: #000; }' }));
        applyTheme(LIGHT);
        loadLink();
        applyTheme(LIGHT, { reload: true });
        expect(localStorage.getItem('neo.theme.css')).toBeNull();
        expect(document.getElementById('neo-theme-cached')).toBeNull();
        expect(link()?.getAttribute('href')).toMatch(/^\/public\/neo-pkg-theme-light\/theme\.css\?v=\d+$/);
        // Still the same theme: choosing it again without reload does not re-link.
        loadLink();
        const sLinked = link();
        applyTheme(LIGHT);
        expect(link()).toBe(sLinked);
    });
});

describe('preview', () => {
    afterEach(() => clearThemePreview());

    test('sets the given variables over everything, and only safe ones', () => {
        applyTheme(LIGHT);
        previewTheme({ 'bg-primary': '#123456', 'text-primary': 'rgba(1, 2, 3, 0.5)', 'bad name': '#fff', 'x': '#fff; } body { display: none', 'y': 42 });
        const sStyle = document.getElementById(THEME_PREVIEW_STYLE_ID);
        expect(sStyle?.textContent).toBe(':root { --neo-bg-primary: #123456; --neo-text-primary: rgba(1, 2, 3, 0.5); }');
        expect(document.head.lastElementChild).toBe(sStyle);
    });

    test('a scheme is shown while previewing and given back after', () => {
        applyTheme(null);
        previewTheme({ 'bg-primary': '#ffffff' }, 'light');
        expect(currentScheme()).toBe('light');
        expect(document.documentElement.dataset.neoScheme).toBe('light');
        clearThemePreview();
        expect(document.getElementById(THEME_PREVIEW_STYLE_ID)).toBeNull();
        expect(currentScheme()).toBe('dark');
        expect(document.documentElement.dataset.neoScheme).toBeUndefined();
    });

    test('choosing a theme ends the preview', () => {
        previewTheme({ 'bg-primary': '#ffffff' }, 'light');
        setTheme(LIGHT);
        expect(document.getElementById(THEME_PREVIEW_STYLE_ID)).toBeNull();
        expect(currentScheme()).toBe('light');
    });
});

describe('requests from a package app (postMessage)', () => {
    let sFrame: HTMLIFrameElement;
    beforeEach(() => {
        sFrame = document.createElement('iframe');
        document.body.appendChild(sFrame);
    });
    afterEach(() => {
        sFrame.remove();
        clearThemePreview();
    });
    const send = (aData: unknown, aFrom: { origin?: string; source?: unknown } = {}) =>
        handleThemeRequest(new MessageEvent('message', { data: aData, origin: aFrom.origin ?? window.location.origin, source: (aFrom.source ?? sFrame.contentWindow) as Window }));

    test('apply: chooses and remembers the theme', () => {
        send({ type: 'neo-theme', action: 'apply', choice: LIGHT });
        expect(readStoredTheme()).toEqual(LIGHT);
        expect(link()?.getAttribute('href')).toBe('/public/neo-pkg-theme-light/theme.css');
        send({ type: 'neo-theme', action: 'apply', choice: null });
        expect(readStoredTheme()).toBeNull();
    });

    test('apply with reload re-links the chosen stylesheet', () => {
        send({ type: 'neo-theme', action: 'apply', choice: LIGHT });
        send({ type: 'neo-theme', action: 'apply', choice: LIGHT, reload: true });
        expect(link()?.getAttribute('href')).toMatch(/\?v=\d+$/);
    });

    test('preview and clear', () => {
        send({ type: 'neo-theme', action: 'preview', vars: { 'bg-primary': '#abcdef' }, scheme: 'light' });
        expect(document.getElementById(THEME_PREVIEW_STYLE_ID)?.textContent).toContain('#abcdef');
        send({ type: 'neo-theme', action: 'preview', vars: null });
        expect(document.getElementById(THEME_PREVIEW_STYLE_ID)).toBeNull();
    });

    test('ignored: another origin, the page itself, an unknown window, a bad choice', () => {
        send({ type: 'neo-theme', action: 'apply', choice: LIGHT }, { origin: 'https://evil.example' });
        send({ type: 'neo-theme', action: 'apply', choice: LIGHT }, { source: window });
        send({ type: 'neo-theme', action: 'apply', choice: LIGHT }, { source: {} });
        send({ type: 'neo-theme', action: 'apply', choice: { ...LIGHT, stylesheet: '../../x.css' } });
        send({ type: 'other', action: 'apply', choice: LIGHT });
        expect(readStoredTheme()).toBeNull();
        expect(link()).toBeNull();
    });
});

describe('themes kept in the browser, per user', () => {
    const token = (aSub: string) => `h.${btoa(JSON.stringify({ sub: aSub })).replace(/=+$/, '')}.s`;
    const signIn = (aSub: string | null) => (aSub ? localStorage.setItem('accessToken', token(aSub)) : localStorage.removeItem('accessToken'));
    const NIGHT = { id: 'night', label: 'Night', scheme: 'dark', css: ':root { --neo-bg-primary: #101820; }', swatch: ['#101820'], note: 'Mine' };
    const NIGHT_CHOICE = { pkg: LOCAL_THEME_PKG, stylesheet: 'night.css', label: 'Night', scheme: 'dark' as const };
    const cached = () => document.getElementById('neo-theme-cached')?.textContent ?? null;

    test('the user is the token\'s sub; no token, no user', () => {
        signIn('Alice');
        expect(themeUser()).toBe('alice');
        signIn(null);
        expect(themeUser()).toBeNull();
        localStorage.setItem('accessToken', 'not-a-jwt');
        expect(themeUser()).toBeNull();
    });

    test('each user reads only their own list, and bad entries are dropped', () => {
        localStorage.setItem('neo.themes.alice', JSON.stringify([NIGHT, { id: '../x', css: '' }, { id: 'ok', css: 'x', label: '' }]));
        expect(readLocalThemes('alice').map((t) => t.id)).toEqual(['night', 'ok']);
        expect(readLocalThemes('bob')).toEqual([]);
        expect(readLocalThemes(null)).toEqual([]);
    });

    test('only --neo-* declarations survive from the kept text', () => {
        expect(localThemeCss('/* c */ :root { --neo-bg-primary: #fff; color: red; --neo-x: a; } body { display: none } --neo-y: url(x) }')).toBe(':root { --neo-bg-primary: #fff; --neo-x: a; --neo-y: url(x); }');
    });

    test('choosing one paints it from its text — no request — and remembers it for the user', () => {
        signIn('alice');
        localStorage.setItem('neo.themes.alice', JSON.stringify([NIGHT]));
        setTheme(NIGHT_CHOICE);
        expect(link()).toBeNull();
        expect(cached()).toBe(':root { --neo-bg-primary: #101820; }');
        expect(JSON.parse(localStorage.getItem('neo.theme.alice') ?? 'null')).toEqual(NIGHT_CHOICE);
        expect(readStoredTheme()).toEqual(NIGHT_CHOICE);
    });

    test('the sign-in page (no user yet) paints the browser\'s last choice from the remembered copy', () => {
        signIn('alice');
        localStorage.setItem('neo.themes.alice', JSON.stringify([NIGHT]));
        setTheme(NIGHT_CHOICE);
        applyTheme(null);
        signIn(null);
        applyStoredTheme();
        expect(cached()).toContain('#101820');
        expect(document.documentElement.dataset.neoTheme).toBe(LOCAL_THEME_PKG);
    });

    test('another user on the same browser: their own choice, and Alice\'s theme is not theirs', () => {
        signIn('alice');
        localStorage.setItem('neo.themes.alice', JSON.stringify([NIGHT]));
        setTheme(NIGHT_CHOICE);
        signIn('bob');
        localStorage.setItem('neo.theme.bob', 'null');
        expect(readStoredTheme()).toBeNull();
        localStorage.removeItem('neo.theme.bob');
        // no choice of his own: the browser's last — which is not in his list, so the dark defaults
        localStorage.removeItem('neo.theme.css');
        applyStoredTheme();
        expect(cached()).toBeNull();
        expect(document.documentElement.dataset.neoTheme).toBeUndefined();
    });

    test('a theme its user deleted falls back to the dark defaults', () => {
        signIn('alice');
        localStorage.setItem('neo.themes.alice', JSON.stringify([NIGHT]));
        setTheme(NIGHT_CHOICE);
        localStorage.setItem('neo.themes.alice', '[]');
        applyTheme(NIGHT_CHOICE);
        expect(cached()).toBeNull();
        expect(document.documentElement.dataset.neoTheme).toBeUndefined();
    });

    test('Dark chosen by a user is theirs, not the browser\'s last', () => {
        signIn('alice');
        setTheme(LIGHT);
        signIn('bob');
        setTheme(null);
        expect(readStoredTheme()).toBeNull();
        signIn('alice');
        expect(readStoredTheme()).toEqual(LIGHT);
    });
});
