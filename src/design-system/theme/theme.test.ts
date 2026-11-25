import {
    THEME_CHANGE_EVENT,
    THEME_STATE_KEY,
    THEME_STYLE_ID,
    applyThemeState,
    checkThemeOwner,
    currentScheme,
    declaresTheme,
    listenForThemeState,
    parseThemeState,
    readThemeState,
    resetThemeStateForTests,
    themeInUse,
    themeLoginPicture,
    themesEnabled,
} from './theme';
import { rgbToHex } from './resolveColor';
import { EXPERIMENT_CHANGE_EVENT } from '@/hooks/useExperiment';
import { LOGIN_PICTURE_MAX_BYTES, readThemePicture, usePictureStore } from './themePicture';

/** A theme state as the Theme Builder writes it (its contract/state-v1.md). */
const state = (aOver: Record<string, unknown> = {}) => ({
    v: 1,
    owner: 'neo-pkg-theme-builder',
    scheme: 'light',
    theme: { pkg: 'neo-pkg-theme-builder', stylesheet: 'presets/light.css', label: 'Light' },
    set: { 'bg-primary': '#f0f2fb', 'bg-panel': '#dfe3f6' },
    resolved: { 'bg-primary': '#f0f2fb', 'bg-panel': '#dfe3f6', 'side-bg': '#dfe3f6' },
    tokens: 'neo-web v8.9.0',
    at: 1,
    ...aOver,
});
const write = (aState: unknown) => localStorage.setItem(THEME_STATE_KEY, JSON.stringify(aState));
const styleText = () => document.getElementById(THEME_STYLE_ID)?.textContent ?? null;
const storageEvent = (aKey: string | null) => window.dispatchEvent(new StorageEvent('storage', { key: aKey }));

// themes are an experiment: on here, off where a test says
beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('experimentMode', 'true');
    resetThemeStateForTests();
    document.getElementById(THEME_STYLE_ID)?.remove();
    delete document.documentElement.dataset.neoScheme;
    document.documentElement.style.removeProperty('color-scheme');
});

describe('declaresTheme — what the App Store shows of a theme package', () => {
    test('a package whose package.json has a neoTheme object declares a theme', () => {
        expect(declaresTheme('neo-pkg-theme-builder', { neoTheme: { label: 'Theme Builder', index: 'themes.json' } })).toBe(true);
        expect(declaresTheme('neo-pkg-x', { neoTheme: { stylesheet: 'theme.css' } })).toBe(true);
        expect(declaresTheme('neo-pkg-x', {})).toBe(false);
        expect(declaresTheme('neo-pkg-x', { neoTheme: 'theme.css' })).toBe(false);
        expect(declaresTheme('../x', { neoTheme: {} })).toBe(false);
    });
});

describe('the theme state — read only, checked again', () => {
    test('read back as the builder wrote it', () => {
        write(state({ loginImage: { picture: 'my-blue' } }));
        expect(readThemeState()).toEqual({
            owner: 'neo-pkg-theme-builder',
            scheme: 'light',
            theme: { pkg: 'neo-pkg-theme-builder', stylesheet: 'presets/light.css', label: 'Light' },
            set: { 'bg-primary': '#f0f2fb', 'bg-panel': '#dfe3f6' },
            loginImage: { picture: 'my-blue' },
            at: 1,
        });
    });

    test.each([
        ['another format version', state({ v: 2 })],
        ['no owner', state({ owner: undefined })],
        ['an owner that is not a package name', state({ owner: '../x' })],
        ['no set', state({ set: undefined })],
        ['no theme', state({ theme: null })],
    ])('%s: no state', (_aWhy, aState) => {
        expect(parseThemeState(aState)).toBeNull();
    });

    test('storage is anyone\'s to edit: names and values that could leave a declaration are dropped', () => {
        const sState = parseThemeState(state({ set: { 'bg-primary': 'red; } body { color: red', 'Bad Name': '#fff', 'bg-panel': ' #dfe3f6 ' }, loginImage: { picture: '../x' } }));
        expect(sState?.set).toEqual({ 'bg-panel': '#dfe3f6' });
        expect(sState?.loginImage).toBeUndefined();
    });

    test('unreadable JSON is no state', () => {
        localStorage.setItem(THEME_STATE_KEY, '{not json');
        expect(readThemeState()).toBeNull();
    });
});

describe('wearing the state', () => {
    test('the values the theme sets go on :root, its scheme on <html>; the rest is the CSS\'s own fallbacks', () => {
        write(state());
        applyThemeState();
        expect(styleText()).toBe(':root { --neo-bg-primary: #f0f2fb; --neo-bg-panel: #dfe3f6; }');
        expect(styleText()).not.toContain('side-bg');
        expect(document.documentElement.dataset.neoScheme).toBe('light');
        expect(currentScheme()).toBe('light');
        expect(document.head.lastElementChild?.id).toBe(THEME_STYLE_ID);
    });

    test('no state: the dark defaults, nothing on the page', () => {
        write(state());
        applyThemeState();
        localStorage.removeItem(THEME_STATE_KEY);
        applyThemeState();
        expect(styleText()).toBeNull();
        expect(document.documentElement.dataset.neoScheme).toBeUndefined();
        expect(currentScheme()).toBe('dark');
    });

    test('THEME_CHANGE_EVENT fires when what the page wears changed, not again for the same', () => {
        const sSeen = jest.fn();
        window.addEventListener(THEME_CHANGE_EVENT, sSeen);
        write(state());
        applyThemeState();
        applyThemeState();
        expect(sSeen).toHaveBeenCalledTimes(1);
        write(state({ set: { 'bg-primary': '#000000' }, at: 2 }));
        applyThemeState();
        expect(sSeen).toHaveBeenCalledTimes(2);
        window.removeEventListener(THEME_CHANGE_EVENT, sSeen);
    });

    test('the theme in use names its sign-in picture', () => {
        write(state({ loginImage: { picture: 'my-blue' } }));
        expect(themeLoginPicture()).toBe('my-blue');
        write(state());
        expect(themeLoginPicture()).toBeNull();
    });
});

describe('following the Theme Builder (storage) and experiment mode', () => {
    test('another page wrote the state: the page wears it at once', () => {
        const sStop = listenForThemeState();
        applyThemeState();
        expect(styleText()).toBeNull();
        write(state());
        storageEvent(THEME_STATE_KEY);
        expect(styleText()).toContain('--neo-bg-panel: #dfe3f6');
        localStorage.removeItem(THEME_STATE_KEY);
        storageEvent(THEME_STATE_KEY);
        expect(styleText()).toBeNull();
        sStop();
    });

    test('themes are an experiment: off, the dark defaults — the state is kept and comes back', () => {
        const sStop = listenForThemeState();
        write(state());
        applyThemeState();
        localStorage.setItem('experimentMode', 'false');
        window.dispatchEvent(new Event(EXPERIMENT_CHANGE_EVENT));
        expect(themesEnabled()).toBe(false);
        expect(themeInUse()).toBeNull();
        expect(styleText()).toBeNull();
        expect(readThemeState()).not.toBeNull();
        localStorage.setItem('experimentMode', 'true');
        storageEvent('experimentMode');
        expect(styleText()).toContain('--neo-bg-primary');
        sStop();
    });

    test('the page writes no theme storage of its own', () => {
        const sSet = jest.spyOn(Storage.prototype, 'setItem');
        const sStop = listenForThemeState();
        write(state());
        sSet.mockClear();
        applyThemeState();
        storageEvent(THEME_STATE_KEY);
        expect(sSet).not.toHaveBeenCalled();
        sStop();
        sSet.mockRestore();
    });
});

describe('a state whose owner is not installed any more', () => {
    const answer = (aStatus: number) => jest.fn(() => Promise.resolve({ status: aStatus } as Response));
    afterEach(() => {
        (global as { fetch?: unknown }).fetch = undefined;
    });

    test('ignored when /public/<owner>/package.json is gone: the dark defaults', async () => {
        global.fetch = answer(404) as unknown as typeof fetch;
        write(state());
        applyThemeState();
        expect(styleText()).not.toBeNull();
        await checkThemeOwner();
        expect(global.fetch).toHaveBeenCalledWith('/public/neo-pkg-theme-builder/package.json', { cache: 'no-store' });
        expect(styleText()).toBeNull();
        expect(themeInUse()).toBeNull();
    });

    test('worn when the owner is there; looked for once per state', async () => {
        global.fetch = answer(200) as unknown as typeof fetch;
        write(state());
        applyThemeState();
        await checkThemeOwner();
        await checkThemeOwner();
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(styleText()).not.toBeNull();
    });

    test('uninstalled from the App Store: looked for again at once, when it was the owner', async () => {
        global.fetch = answer(200) as unknown as typeof fetch;
        write(state());
        applyThemeState();
        await checkThemeOwner();
        global.fetch = answer(404) as unknown as typeof fetch;
        await checkThemeOwner('neo-pkg-other');
        expect(global.fetch).not.toHaveBeenCalled();
        await checkThemeOwner('neo-pkg-theme-builder');
        expect(styleText()).toBeNull();
    });

    test('a failed request (offline) changes nothing', async () => {
        global.fetch = jest.fn(() => Promise.reject(new Error('offline'))) as unknown as typeof fetch;
        write(state());
        applyThemeState();
        await checkThemeOwner();
        expect(styleText()).not.toBeNull();
    });
});

describe('sign-in pictures are read, never written, by the web UI', () => {
    test('read from the store and checked again', async () => {
        const sKept = new Map<string, unknown>([
            ['ok', new Blob(['x'], { type: 'image/png' })],
            ['svg', new Blob(['<svg/>'], { type: 'image/svg+xml' })],
            ['big', new Blob([new Uint8Array(LOGIN_PICTURE_MAX_BYTES + 1)], { type: 'image/png' })],
        ]);
        usePictureStore({ get: async (k) => sKept.get(k), put: async () => undefined, delete: async () => undefined });
        expect(await readThemePicture('ok')).toBeInstanceOf(Blob);
        expect(await readThemePicture('svg')).toBeNull();
        expect(await readThemePicture('big')).toBeNull();
        expect(await readThemePicture('none')).toBeNull();
        usePictureStore(null);
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
