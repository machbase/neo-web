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
    editInThemeBuilder,
    listenForThemeRequests,
    parseThemeEntry,
    parseThemeIndex,
    parseThemeManifest,
    previewTheme,
    readStoredTheme,
    setTheme,
    themeIndexFiles,
    themeKey,
    themeStylesheetUrl,
    themeStylesheetHref,
    themeLoginImageSrc,
    saveLocalTheme,
    deleteLocalTheme,
    forgetPackageTheme,
    localLoginPictureRef,
    refreshStoredThemeVersion,
    readLocalThemes,
    localThemeCss,
    themeVarsOf,
    themesEnabled,
    THEMES_OFF_REASON,
    THEME_CACHED_STYLE_ID,
    LOCAL_THEME_PKG,
} from './theme';
import { rgbToHex } from './resolveColor';
import { EXPERIMENT_CHANGE_EVENT } from '@/hooks/useExperiment';
import { LOGIN_PICTURE_MAX_BYTES, readThemePicture, usePictureStore } from './themePicture';

const LIGHT = { pkg: 'neo-pkg-theme-light', stylesheet: 'theme.css', label: 'Light', scheme: 'light' as const };

const link = () => document.getElementById(THEME_LINK_ID) as HTMLLinkElement | null;
const loadLink = () => link()?.dispatchEvent(new Event('load'));

// themes are an experiment: on here, off in 'themes are an experiment' below
beforeEach(() => localStorage.setItem('experimentMode', 'true'));
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

    test('a manifest naming neither a stylesheet nor an index (the theme builder) is a theme package for its app', () => {
        const sAppOnly = { name: 'neo-pkg-theme-builder', neoTheme: { label: 'Theme Builder' } };
        expect(parseThemeManifest('neo-pkg-theme-builder', sAppOnly)).toBeNull();
        expect(themeIndexFiles(sAppOnly)).toEqual([]);
        expect(declaresTheme('neo-pkg-theme-builder', sAppOnly)).toBe(true);
        expect(declaresTheme('neo-pkg-x', { neoTheme: 'yes' })).toBe(false);
        expect(declaresTheme('../x', sAppOnly)).toBe(false);
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

// The server sends package files without Cache-Control: after an update a browser kept the old
// stylesheet. The package's version is in the address, and a signed-in start checks it.
describe('the stylesheet address carries the package version', () => {
    const V1 = { ...LIGHT, version: '1.0.0' };

    test('a choice keeps a version it is given, not one that could break the address', () => {
        expect(parseThemeManifest('neo-pkg-theme-light', { neoTheme: { ...LIGHT, version: '1.2.0-beta+1' } })?.version).toBe('1.2.0-beta+1');
        expect(parseThemeManifest('neo-pkg-theme-light', { neoTheme: { ...LIGHT, version: '1?x=<y>' } })).toEqual(LIGHT);
        expect(themeStylesheetHref(V1)).toBe('/public/neo-pkg-theme-light/theme.css?v=1.0.0');
        expect(themeStylesheetHref(LIGHT)).toBe('/public/neo-pkg-theme-light/theme.css');
    });

    test('linked from the versioned address; a new version links again, the remembered copy (kept by path) paints meanwhile', () => {
        applyTheme(V1);
        expect(link()?.getAttribute('href')).toBe('/public/neo-pkg-theme-light/theme.css?v=1.0.0');
        localStorage.setItem('neo.theme.css', JSON.stringify({ href: '/public/neo-pkg-theme-light/theme.css', css: ':root { --neo-bg-primary: #fff; }' }));
        const sFirst = link();
        applyTheme(V1);
        expect(link()).toBe(sFirst);
        applyTheme({ ...LIGHT, version: '1.1.0' });
        expect(link()).not.toBe(sFirst);
        expect(link()?.getAttribute('href')).toBe('/public/neo-pkg-theme-light/theme.css?v=1.1.0');
        expect(document.getElementById('neo-theme-cached')?.textContent).toContain('#fff');
    });

    test('signed in: an updated package is linked from its new address and remembered', async () => {
        setTheme(V1);
        const sRead = jest.fn(async () => '1.1.0');
        await refreshStoredThemeVersion(sRead);
        expect(sRead).toHaveBeenCalledWith('neo-pkg-theme-light');
        expect(readStoredTheme()?.version).toBe('1.1.0');
        expect(link()?.getAttribute('href')).toBe('/public/neo-pkg-theme-light/theme.css?v=1.1.0');
    });

    test('the same version, no version read, a theme kept in the browser: nothing moves', async () => {
        setTheme(V1);
        const sLinked = link();
        await refreshStoredThemeVersion(async () => '1.0.0');
        await refreshStoredThemeVersion(async () => '');
        await refreshStoredThemeVersion(() => Promise.reject(new Error('offline')));
        expect(link()).toBe(sLinked);
        expect(readStoredTheme()?.version).toBe('1.0.0');
        setTheme({ pkg: LOCAL_THEME_PKG, stylesheet: 'mine.css', label: 'Mine', scheme: 'light' });
        const sRead = jest.fn(async () => '9.9.9');
        await refreshStoredThemeVersion(sRead);
        expect(sRead).not.toHaveBeenCalled();
    });
});

describe("a theme package's sign-in picture (neoTheme.loginImage)", () => {
    const OCEAN = { label: 'Ocean', stylesheet: 'theme.css', scheme: 'light' };

    test('an image inside the package is kept with the theme, from the manifest and from an index', () => {
        expect(parseThemeManifest('neo-pkg-theme-ocean', { neoTheme: { ...OCEAN, loginImage: 'login.webp' } })?.loginImage).toBe('login.webp');
        expect(parseThemeIndex('neo-pkg-theme-ocean', [{ ...OCEAN, loginImage: 'img/Sign-In.JPG' }])[0].loginImage).toBe('img/Sign-In.JPG');
        for (const sFile of ['login.png', 'a/b/login.jpeg', 'logo.svg']) expect(parseThemeManifest('p', { neoTheme: { ...OCEAN, loginImage: sFile } })?.loginImage).toBe(sFile);
    });

    test('anything that is not a picture file inside the package is dropped, the theme itself stays', () => {
        for (const sFile of ['../login.png', '/login.png', 'https://example.com/login.png', 'img/../../x.png', 'login.gif', 'login.png?x=1', 'login', '', 42]) {
            const sChoice = parseThemeManifest('neo-pkg-theme-ocean', { neoTheme: { ...OCEAN, loginImage: sFile } });
            expect(sChoice?.stylesheet).toBe('theme.css');
            expect(sChoice).not.toHaveProperty('loginImage');
        }
    });

    test("the picture's address is the package's, with its version; none without a picture, and never for a theme kept in the browser", () => {
        const sChoice = { pkg: 'neo-pkg-theme-ocean', stylesheet: 'theme.css', label: 'Ocean', scheme: 'light' as const, loginImage: 'img/login.webp' };
        expect(themeLoginImageSrc({ ...sChoice, version: '1.2.0' })).toBe('/public/neo-pkg-theme-ocean/img/login.webp?v=1.2.0');
        expect(themeLoginImageSrc(sChoice)).toBe('/public/neo-pkg-theme-ocean/img/login.webp');
        expect(themeLoginImageSrc(LIGHT)).toBeNull();
        expect(themeLoginImageSrc(null)).toBeNull();
        expect(themeLoginImageSrc({ ...sChoice, pkg: LOCAL_THEME_PKG })).toBeNull();
    });

    test('remembered with the choice, so the sign-in page (no user yet) finds it', () => {
        setTheme({ pkg: 'neo-pkg-theme-ocean', stylesheet: 'theme.css', label: 'Ocean', scheme: 'light', version: '1.0.0', loginImage: 'login.webp' });
        expect(readStoredTheme()?.loginImage).toBe('login.webp');
        localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ pkg: 'neo-pkg-theme-ocean', stylesheet: 'theme.css', loginImage: '../../etc/x.png' }));
        expect(readStoredTheme()).not.toHaveProperty('loginImage');
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

describe('themes kept in the browser — one list and one choice for the browser, whoever signs in', () => {
    const token = (aSub: string) => `h.${btoa(JSON.stringify({ sub: aSub })).replace(/=+$/, '')}.s`;
    const signIn = (aSub: string | null) => (aSub ? localStorage.setItem('accessToken', token(aSub)) : localStorage.removeItem('accessToken'));
    const NIGHT = { id: 'night', label: 'Night', scheme: 'dark', css: ':root { --neo-bg-primary: #101820; }', swatch: ['#101820'], note: 'Mine' };
    const NIGHT_CHOICE = { pkg: LOCAL_THEME_PKG, stylesheet: 'night.css', label: 'Night', scheme: 'dark' as const };
    const cached = () => document.getElementById('neo-theme-cached')?.textContent ?? null;

    test('the browser\'s list, bad entries dropped', () => {
        localStorage.setItem('neo.themes', JSON.stringify([NIGHT, { id: '../x', css: '' }, { id: 'ok', css: 'x', label: '' }]));
        expect(readLocalThemes().map((t) => t.id)).toEqual(['night', 'ok']);
        localStorage.setItem('neo.themes', 'not json');
        expect(readLocalThemes()).toEqual([]);
    });

    test('only --neo-* declarations survive from the kept text', () => {
        expect(localThemeCss('/* c */ :root { --neo-bg-primary: #fff; color: red; --neo-x: a; } body { display: none } --neo-y: url(x) }')).toBe(':root { --neo-bg-primary: #fff; --neo-x: a; --neo-y: url(x); }');
        // the same declarations by name, for whatever reads a theme without wearing it (Settings → Theme's cards)
        expect(themeVarsOf('/* --neo-z: red; */ :root { --neo-bg-primary: #fff; --neo-Bad: x; --neo-y: a}b; --neo-bg-primary: #000 }')).toEqual({ 'bg-primary': '#000', y: 'a' });
    });

    test('choosing one paints it from its text — no request — and the browser remembers it', () => {
        localStorage.setItem('neo.themes', JSON.stringify([NIGHT]));
        setTheme(NIGHT_CHOICE);
        expect(link()).toBeNull();
        expect(cached()).toBe(':root { --neo-bg-primary: #101820; }');
        expect(JSON.parse(localStorage.getItem('neo.theme') ?? 'null')).toEqual(NIGHT_CHOICE);
        expect(readStoredTheme()).toEqual(NIGHT_CHOICE);
    });

    test('the same theme before and after sign-in, and for any account on this browser', () => {
        localStorage.setItem('neo.themes', JSON.stringify([NIGHT]));
        setTheme(NIGHT_CHOICE);
        for (const sUser of [null, 'alice', 'bob']) {
            signIn(sUser);
            applyTheme(null);
            applyStoredTheme();
            expect(readStoredTheme()).toEqual(NIGHT_CHOICE);
            expect(readLocalThemes().map((t) => t.id)).toEqual(['night']);
            expect(cached()).toContain('#101820');
            expect(document.documentElement.dataset.neoTheme).toBe(LOCAL_THEME_PKG);
        }
        // Dark chosen by anyone is the browser's choice too
        signIn('bob');
        setTheme(null);
        signIn('alice');
        expect(readStoredTheme()).toBeNull();
    });

    test('a theme deleted since falls back to the dark defaults', () => {
        localStorage.setItem('neo.themes', JSON.stringify([NIGHT]));
        setTheme(NIGHT_CHOICE);
        localStorage.setItem('neo.themes', '[]');
        applyTheme(NIGHT_CHOICE);
        expect(cached()).toBeNull();
        expect(document.documentElement.dataset.neoTheme).toBeUndefined();
    });

    describe('the sign-in picture set in the theme builder: the file itself, in IndexedDB', () => {
        // jsdom has no IndexedDB: the same calls, kept in memory
        let sKept: Map<string, unknown>;
        beforeEach(() => {
            sKept = new Map();
            usePictureStore({ get: async (k) => sKept.get(k), put: async (k, b) => void sKept.set(k, b), delete: async (k) => void sKept.delete(k) });
        });
        afterEach(() => usePictureStore(null));
        const PIC = new Blob([new Uint8Array([82, 73, 70, 70])], { type: 'image/webp' });
        const NIGHT_PIC = { ...NIGHT, loginImage: true };

        test('the entry only says it has one; a picture kept as text by an older builder is not read', () => {
            localStorage.setItem('neo.themes', JSON.stringify([NIGHT_PIC, { ...NIGHT, id: 'old', loginImage: 'data:image/webp;base64,UklGR' }, { ...NIGHT, id: 'odd', loginImage: 'yes' }]));
            expect(readLocalThemes().map((t) => t.loginImage ?? null)).toEqual([true, null, null]);
        });

        test('saved with its picture: the file goes to IndexedDB under the theme\'s id, the entry gets the mark', async () => {
            await expect(saveLocalTheme(NIGHT, PIC)).resolves.toMatchObject({ ok: true });
            expect(sKept.get('night')).toBe(PIC);
            expect(JSON.parse(localStorage.getItem('neo.themes') ?? '[]')[0].loginImage).toBe(true);
            await expect(readThemePicture('night')).resolves.toBe(PIC);
            // saved again without saying: the picture stays; null takes it away
            await saveLocalTheme({ ...NIGHT, label: 'Night 2' });
            expect(readLocalThemes()[0]).toMatchObject({ label: 'Night 2', loginImage: true });
            await saveLocalTheme(NIGHT, null);
            expect(sKept.has('night')).toBe(false);
            expect(readLocalThemes()[0]).not.toHaveProperty('loginImage');
        });

        test('what is not a picture it shows as it is (SVG, text, too large) is refused with a reason, and nothing is kept', async () => {
            const sBad = [new Blob(['<svg onload=alert(1)>'], { type: 'image/svg+xml' }), new Blob(['x'], { type: 'text/html' }), new Blob([], { type: 'image/png' }), new Blob([new Uint8Array(LOGIN_PICTURE_MAX_BYTES + 1)], { type: 'image/png' }), 'data:image/png;base64,AA', 42];
            for (const sPicture of sBad) {
                const sResult = await saveLocalTheme(NIGHT, sPicture);
                expect(sResult.ok).toBe(false);
                expect(!sResult.ok && sResult.reason).toMatch(/sign-in picture/);
            }
            expect(sKept.size).toBe(0);
            expect(localStorage.getItem('neo.themes')).toBeNull();
            // a picture the store will not take (quota): refused, the theme not saved half
            usePictureStore({ get: async () => undefined, put: async () => Promise.reject(new DOMException('full', 'QuotaExceededError')), delete: async () => undefined });
            const sFull = await saveLocalTheme(NIGHT, PIC);
            expect(!sFull.ok && sFull.reason).toMatch(/storage .* is full/);
            expect(localStorage.getItem('neo.themes')).toBeNull();
        });

        test('the sign-in page finds the picture of the theme in use from its entry; the stored file is checked again', async () => {
            await saveLocalTheme(NIGHT, PIC);
            setTheme(NIGHT_CHOICE);
            signIn(null);
            const sRef = localLoginPictureRef(readStoredTheme());
            expect(sRef).toEqual({ id: 'night' });
            await expect(readThemePicture(sRef!.id)).resolves.toBe(PIC);
            // someone else's edit of what is stored: not a picture, so none
            sKept.set('night', new Blob(['<svg/>'], { type: 'image/svg+xml' }));
            await expect(readThemePicture('night')).resolves.toBeNull();
            // a theme without one, a package theme, Dark: none
            localStorage.setItem('neo.themes', JSON.stringify([NIGHT_PIC, { ...NIGHT, id: 'dawn', label: 'Dawn' }]));
            expect(localLoginPictureRef({ ...NIGHT_CHOICE, stylesheet: 'dawn.css' })).toBeNull();
            expect(localLoginPictureRef(LIGHT)).toBeNull();
            expect(localLoginPictureRef(null)).toBeNull();
            expect(themeLoginImageSrc(NIGHT_CHOICE)).toBeNull();
        });

        test('taken away or the theme deleted: the file goes', async () => {
            await saveLocalTheme(NIGHT, PIC);
            setTheme(NIGHT_CHOICE);
            await saveLocalTheme(NIGHT, null);
            expect(localLoginPictureRef(readStoredTheme())).toBeNull();
            await saveLocalTheme(NIGHT, PIC);
            expect(deleteLocalTheme('night')).toEqual({ ok: true });
            await new Promise((r) => setTimeout(r, 0));
            expect(sKept.has('night')).toBe(false);
            expect(readStoredTheme()).toBeNull();
        });

        test('the choice the builder sends carries no picture of its own', () => {
            expect(parseThemeEntry(LOCAL_THEME_PKG, { ...NIGHT_CHOICE, loginImage: 'login.webp' })).not.toHaveProperty('loginImage');
        });
    });
});

describe("the builder's requests for this browser's themes (postMessage)", () => {
    const token = (aSub: string) => `h.${btoa(JSON.stringify({ sub: aSub })).replace(/=+$/, '')}.s`;
    const NIGHT = { id: 'night', label: 'Night', scheme: 'dark', css: ':root { --neo-bg-primary: #101820; }', swatch: ['#101820'], note: 'Mine' };
    const NIGHT_CHOICE = { pkg: LOCAL_THEME_PKG, stylesheet: 'night.css', label: 'Night', scheme: 'dark' as const };
    let sFrame: HTMLIFrameElement;
    let sPosted: jest.SpyInstance;
    beforeEach(() => {
        localStorage.setItem('accessToken', token('alice'));
        sFrame = document.createElement('iframe');
        document.body.appendChild(sFrame);
        sPosted = jest.spyOn(sFrame.contentWindow as Window, 'postMessage').mockImplementation(() => {});
    });
    afterEach(() => sFrame.remove());
    const send = (aData: Record<string, unknown>) => handleThemeRequest(new MessageEvent('message', { data: { type: 'neo-theme', ...aData }, origin: window.location.origin, source: sFrame.contentWindow as Window }));
    const posted = (aAction: string) => sPosted.mock.calls.map((c) => c[0]).filter((m) => m.action === aAction);
    const lastReply = () => posted('reply').at(-1);
    // a save answers once its picture is written (IndexedDB): after the queued work
    const settled = () => new Promise((r) => setTimeout(r, 0));
    const stored = () => JSON.parse(localStorage.getItem('neo.themes') ?? 'null');

    test('themes: answers with the browser\'s themes (validated) and the theme in use, in the frame that asked — no user in it', () => {
        localStorage.setItem('neo.themes', JSON.stringify([NIGHT, { id: '../x', css: '' }]));
        setTheme(NIGHT_CHOICE);
        send({ action: 'themes', request: 7 });
        expect(lastReply()).toMatchObject({ type: 'neo-theme', action: 'reply', request: 7, ok: true, choice: NIGHT_CHOICE });
        expect(lastReply()).not.toHaveProperty('user');
        expect(lastReply().themes.map((t: { id: string }) => t.id)).toEqual(['night']);
        expect(sPosted.mock.calls.at(-1)[1]).toBe(window.location.origin);
    });

    test('edit: a theme asked to be opened in the builder goes with its next themes answer, once, and the frames are told to ask', () => {
        localStorage.setItem('neo.themes', JSON.stringify([NIGHT]));
        editInThemeBuilder({ ...NIGHT_CHOICE, version: '1' });
        // the builder, open already, is told to ask again
        expect(posted('changed')).toHaveLength(1);
        send({ action: 'themes', request: 1 });
        expect(lastReply()).toMatchObject({ request: 1, ok: true, edit: NIGHT_CHOICE });
        expect(lastReply().edit).not.toHaveProperty('version');
        send({ action: 'themes', request: 2 });
        expect(lastReply()).toMatchObject({ request: 2, ok: true });
        expect(lastReply()).not.toHaveProperty('edit');
    });

    test('edit: a request nobody picks up within a minute lapses', () => {
        const sNow = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
        try {
            editInThemeBuilder(NIGHT_CHOICE);
            sNow.mockReturnValue(1_000_000 + 61_000);
            send({ action: 'themes', request: 3 });
            expect(lastReply()).not.toHaveProperty('edit');
        } finally {
            sNow.mockRestore();
        }
    });

    test('save: adds a theme, then saves over it in its place; roles and pinned tokens come back to edit it again', async () => {
        const DAWN = { ...NIGHT, id: 'dawn', label: 'Dawn' };
        send({ action: 'save', request: 1, theme: NIGHT });
        await settled();
        send({ action: 'save', request: 2, theme: DAWN });
        await settled();
        send({ action: 'save', request: 3, theme: { ...NIGHT, label: 'Night 2', roles: { surface: '#101820', gnbBg: '#000000', 'x}': '#fff' }, pinned: { 'hover-bg': 'rgba(0, 0, 0, 0.1)', 'bad;': 'x', 'text-primary': 'red; }' }, saved: 5 } });
        await settled();
        expect(lastReply()).toMatchObject({ request: 3, ok: true });
        expect(stored().map((t: { id: string; label: string }) => `${t.id}:${t.label}`)).toEqual(['night:Night 2', 'dawn:Dawn']);
        expect(stored()[0]).toMatchObject({ roles: { surface: '#101820', gnbBg: '#000000' }, pinned: { 'hover-bg': 'rgba(0, 0, 0, 0.1)' }, saved: 5 });
        expect(readLocalThemes()[0].roles).toEqual({ surface: '#101820', gnbBg: '#000000' });
        expect(lastReply().themes).toHaveLength(2);
    });

    test('save: refused, with a reason, when the entry is unusable or the picture is not one it keeps — signed in or not makes no difference', async () => {
        localStorage.removeItem('accessToken');
        send({ action: 'save', request: 1, theme: NIGHT });
        await settled();
        expect(lastReply()).toMatchObject({ request: 1, ok: true });
        localStorage.removeItem('neo.themes');
        localStorage.setItem('accessToken', token('alice'));
        send({ action: 'save', request: 2, theme: { ...NIGHT, id: '../x' } });
        await settled();
        expect(lastReply()).toMatchObject({ request: 2, ok: false });
        send({ action: 'save', request: 3, theme: NIGHT, picture: new Blob(['<svg/>'], { type: 'image/svg+xml' }) });
        await settled();
        expect(lastReply()).toMatchObject({ request: 3, ok: false });
        expect(lastReply().reason).toMatch(/sign-in picture/);
        expect(localStorage.getItem('neo.themes')).toBeNull();
    });

    test("save: the browser's storage full is said, and nothing changes", async () => {
        localStorage.setItem('neo.themes', JSON.stringify([NIGHT]));
        const sSet = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new DOMException('full', 'QuotaExceededError');
        });
        try {
            send({ action: 'save', request: 9, theme: { ...NIGHT, id: 'dawn' } });
            await settled();
        } finally {
            sSet.mockRestore();
        }
        expect(lastReply()).toMatchObject({ request: 9, ok: false });
        expect(lastReply().reason).toMatch(/storage .* is full/);
        expect(stored().map((t: { id: string }) => t.id)).toEqual(['night']);
    });

    test('delete: removes the theme; the one in use gives way to Dark', () => {
        localStorage.setItem('neo.themes', JSON.stringify([NIGHT, { ...NIGHT, id: 'dawn' }]));
        setTheme(NIGHT_CHOICE);
        send({ action: 'delete', request: 4, id: 'dawn' });
        expect(lastReply()).toMatchObject({ request: 4, ok: true, choice: NIGHT_CHOICE });
        send({ action: 'delete', request: 5, id: 'night' });
        expect(lastReply()).toMatchObject({ request: 5, ok: true, choice: null, themes: [] });
        expect(readStoredTheme()).toBeNull();
        send({ action: 'delete', request: 6, id: '../x' });
        expect(lastReply()).toMatchObject({ request: 6, ok: false });
    });

    test("the frames are told when the themes or the choice change — here or in another tab", async () => {
        send({ action: 'save', request: 1, theme: NIGHT });
        await settled();
        expect(posted('changed')).toHaveLength(1);
        setTheme(NIGHT_CHOICE);
        expect(posted('changed')).toHaveLength(2);
        const sStop = listenForThemeRequests();
        try {
            window.dispatchEvent(new StorageEvent('storage', { key: 'neo.themes' }));
            window.dispatchEvent(new StorageEvent('storage', { key: 'neo.theme' }));
            window.dispatchEvent(new StorageEvent('storage', { key: 'accessToken' }));
        } finally {
            sStop();
        }
        expect(posted('changed')).toHaveLength(4);
    });

    test("picture: answers with the theme's sign-in picture, a save carries one (null takes it away)", async () => {
        const sKept = new Map<string, unknown>();
        usePictureStore({ get: async (k) => sKept.get(k), put: async (k, b) => void sKept.set(k, b), delete: async (k) => void sKept.delete(k) });
        try {
            const sPic = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' });
            send({ action: 'save', request: 1, theme: NIGHT, picture: sPic });
            await settled();
            expect(lastReply()).toMatchObject({ request: 1, ok: true });
            expect(lastReply().themes[0].loginImage).toBe(true);
            send({ action: 'picture', request: 2, id: 'night' });
            await settled();
            expect(lastReply()).toMatchObject({ request: 2, ok: true });
            expect(lastReply().picture).toBe(sPic);
            send({ action: 'save', request: 3, theme: NIGHT, picture: null });
            await settled();
            send({ action: 'picture', request: 4, id: 'night' });
            await settled();
            expect(lastReply()).toMatchObject({ request: 4, ok: true, picture: null });
            send({ action: 'picture', request: 5, id: '../x' });
            await settled();
            expect(lastReply()).toMatchObject({ request: 5, picture: null });
        } finally {
            usePictureStore(null);
        }
    });

    test('ignored when it does not come from a frame of this page', async () => {
        handleThemeRequest(new MessageEvent('message', { data: { type: 'neo-theme', action: 'save', request: 1, theme: NIGHT }, origin: window.location.origin, source: window }));
        handleThemeRequest(new MessageEvent('message', { data: { type: 'neo-theme', action: 'delete', request: 1, id: 'night' }, origin: 'https://evil.example', source: sFrame.contentWindow as Window }));
        handleThemeRequest(new MessageEvent('message', { data: { type: 'neo-theme', action: 'picture', request: 1, id: 'night' }, origin: 'https://evil.example', source: sFrame.contentWindow as Window }));
        await settled();
        expect(localStorage.getItem('neo.themes')).toBeNull();
        expect(sPosted).not.toHaveBeenCalled();
    });
});

describe('themes are an experiment', () => {
    const NIGHT = { id: 'night', label: 'Night', scheme: 'dark', css: ':root { --neo-bg-primary: #101820; }', swatch: ['#101820'], note: 'Mine' };
    const NIGHT_CHOICE = { pkg: LOCAL_THEME_PKG, stylesheet: 'night.css', label: 'Night', scheme: 'dark' as const };
    const off = () => localStorage.removeItem('experimentMode');
    const root = () => document.documentElement;

    test('off: the dark defaults draw the page, and the choice is kept for when it is on again', () => {
        localStorage.setItem('neo.themes', JSON.stringify([NIGHT]));
        setTheme(NIGHT_CHOICE);
        expect(root().dataset.neoTheme).toBe(LOCAL_THEME_PKG);
        off();
        expect(themesEnabled()).toBe(false);
        expect(readStoredTheme()).toBeNull();
        applyStoredTheme();
        expect(root().dataset.neoTheme).toBeUndefined();
        expect(document.getElementById(THEME_CACHED_STYLE_ID)).toBeNull();
        applyTheme(LIGHT);
        expect(link()).toBeNull();
        expect(JSON.parse(localStorage.getItem('neo.theme') ?? 'null')).toMatchObject({ stylesheet: 'night.css' });
        localStorage.setItem('experimentMode', 'true');
        expect(readStoredTheme()).toMatchObject({ stylesheet: 'night.css' });
    });

    test('off: an app\'s requests are answered with why, its previews and choices are not taken', () => {
        off();
        const sFrame = document.createElement('iframe');
        document.body.appendChild(sFrame);
        const sPosted = jest.spyOn(sFrame.contentWindow as Window, 'postMessage').mockImplementation(() => {});
        const send = (aData: Record<string, unknown>) => handleThemeRequest(new MessageEvent('message', { data: { type: 'neo-theme', ...aData }, origin: window.location.origin, source: sFrame.contentWindow as Window }));
        send({ action: 'themes', request: 1 });
        send({ action: 'save', request: 2, theme: NIGHT });
        expect(sPosted.mock.calls.map((c) => c[0])).toEqual([
            expect.objectContaining({ action: 'reply', request: 1, ok: false, reason: THEMES_OFF_REASON, choice: null }),
            expect.objectContaining({ action: 'reply', request: 2, ok: false, reason: THEMES_OFF_REASON }),
        ]);
        send({ action: 'preview', vars: { 'bg-primary': '#ffffff' } });
        send({ action: 'apply', choice: LIGHT });
        expect(document.getElementById(THEME_PREVIEW_STYLE_ID)).toBeNull();
        expect(link()).toBeNull();
        expect(localStorage.getItem('neo.themes')).toBeNull();
        expect(localStorage.getItem('neo.theme')).toBeNull();
        previewTheme({ 'bg-primary': '#ffffff' });
        expect(document.getElementById(THEME_PREVIEW_STYLE_ID)).toBeNull();
        sFrame.remove();
    });

    test('turned on or off — here or in another tab — the page takes the theme or the dark defaults at once', () => {
        const sStop = listenForThemeRequests();
        localStorage.setItem('neo.themes', JSON.stringify([NIGHT]));
        setTheme(NIGHT_CHOICE);
        off();
        window.dispatchEvent(new Event(EXPERIMENT_CHANGE_EVENT));
        expect(root().dataset.neoTheme).toBeUndefined();
        localStorage.setItem('experimentMode', 'true');
        window.dispatchEvent(new StorageEvent('storage', { key: 'experimentMode' }));
        expect(root().dataset.neoTheme).toBe(LOCAL_THEME_PKG);
        sStop();
    });
});

describe('a package uninstalled (forgetPackageTheme)', () => {
    test('its theme in use goes at once: the dark default shows and the choice is not kept for a reinstall', () => {
        setTheme(LIGHT);
        expect(document.getElementById(THEME_LINK_ID)).not.toBeNull();
        forgetPackageTheme('neo-pkg-theme-light');
        expect(readStoredTheme()).toBeNull();
        expect(document.getElementById(THEME_LINK_ID)).toBeNull();
        expect(document.documentElement.dataset.neoTheme).toBeUndefined();
    });

    test('another package\'s theme, and this browser\'s own themes, stay', async () => {
        setTheme(LIGHT);
        forgetPackageTheme('neo-pkg-dbus');
        expect(readStoredTheme()).toEqual(LIGHT);
        await saveLocalTheme({ id: 'mine', label: 'Mine', scheme: 'dark', css: ':root { --neo-bg-primary: #101010; }' });
        const sMine = { pkg: LOCAL_THEME_PKG, stylesheet: 'mine.css', label: 'Mine', scheme: 'dark' as const };
        setTheme(sMine);
        // the theme builder uninstalled: what was made with it is the user's, and needs no package
        forgetPackageTheme('neo-pkg-theme-builder');
        expect(readStoredTheme()).toEqual(sMine);
        expect(readLocalThemes().map((t) => t.id)).toEqual(['mine']);
    });

    test('with themes off (experiment mode off) the kept choice of the package goes too', () => {
        setTheme(LIGHT);
        localStorage.setItem('experimentMode', 'false');
        forgetPackageTheme('neo-pkg-theme-light');
        localStorage.setItem('experimentMode', 'true');
        expect(readStoredTheme()).toBeNull();
    });
});

