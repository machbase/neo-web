import { fireEvent, render as rtlRender, screen, waitFor } from '@testing-library/react';
import { RecoilRoot, useRecoilValue } from 'recoil';
import type { ReactElement } from 'react';
import { ThemeModal } from './ThemeModal';
import { THEME_LINK_ID, THEME_STORAGE_KEY, applyTheme, handleThemeRequest } from '@/design-system/theme';
import { gBoardList } from '@/recoil/recoil';

const mockGetFileList = jest.fn();
jest.mock('@/api/repository/api', () => ({ getFileList: (...a: unknown[]) => mockGetFileList(...a) }));
const mockHasHtml = jest.fn();
jest.mock('@/components/side/AppStore/appTabs', () => ({
    ...jest.requireActual('@/components/side/AppStore/appTabs'),
    checkHtmlExists: (...a: unknown[]) => mockHasHtml(...a),
}));

let sBoards: any[] = [];
const BoardSpy = () => {
    sBoards = useRecoilValue(gBoardList);
    return null;
};
const render = (aUi: ReactElement) =>
    rtlRender(
        <RecoilRoot>
            {aUi}
            <BoardSpy />
        </RecoilRoot>
    );

const MANIFESTS: Record<string, unknown> = {
    'neo-pkg-theme-light': { name: 'neo-pkg-theme-light', version: '1.0.0', neoTheme: { label: 'Light', stylesheet: 'theme.css', scheme: 'light' } },
    'neo-pkg-dbus': { name: 'neo-pkg-dbus', version: '1.0.0' },
    'neo-pkg-theme-builder': { name: 'neo-pkg-theme-builder', version: '1.0.0', neoTheme: { label: 'Theme Builder', index: ['themes.json', 'user/themes.json'] } },
};
let sFiles: Record<string, unknown> = {};
let sDirs: string[] = [];

// What a strip a theme does not list is worked out from: the token list (a few, one with a fallback) and the stylesheet.
const TOKENS = [
    { name: 'bg-primary', dark: '#1e1e1e' },
    { name: 'gnb-bg', dark: '#1e1e1e', fallback: 'bg-primary' },
    { name: 'accent-main', dark: '#005fb8' },
];
const SHEETS: Record<string, string> = {
    '/public/neo-pkg-theme-builder/presets/light.css?v=1.0.0': ':root { --neo-bg-primary: #cdd3f0; --neo-accent-main: #f5c33b; }',
    '/public/neo-pkg-theme-light/theme.css?v=1.0.0': ':root { --neo-bg-primary: #ffffff; }',
};
beforeAll(() => {
    (globalThis as { fetch?: unknown }).fetch = jest.fn(async (aUrl: string) => {
        if (aUrl === '/web/ui/theme-tokens.json') return { ok: true, json: async () => TOKENS };
        if (SHEETS[aUrl] !== undefined) return { ok: true, text: async () => SHEETS[aUrl] };
        return { ok: false };
    });
});
afterAll(() => {
    delete (globalThis as { fetch?: unknown }).fetch;
});
/** The colors a card's strip shows. */
const stripOf = (aTestId: string) => Array.from(screen.getByTestId(`theme-option-${aTestId}`).querySelectorAll<HTMLElement>('.theme-modal__swatch i')).map((i) => i.style.background);

beforeEach(() => {
    localStorage.setItem('experimentMode', 'true');
    sDirs = ['neo-pkg-dbus', 'neo-pkg-theme-light'];
    sFiles = {};
    mockHasHtml.mockResolvedValue(false);
    mockGetFileList.mockImplementation(async (_f: string, aDir: string, aName: string) => {
        if (aDir === '/public/' && !aName) return { data: { children: [...sDirs.map((name) => ({ name, isDir: true })), { name: 'neo-pkg-theme-light.zip', isDir: false }] } };
        const sPkg = aDir.replace(/^\/public\//, '').replace(/\/$/, '');
        if (aName === 'package.json' && MANIFESTS[sPkg] && sDirs.includes(sPkg)) return { data: MANIFESTS[sPkg] };
        if (sFiles[`${sPkg}/${aName}`] !== undefined) return { data: sFiles[`${sPkg}/${aName}`] };
        throw new Error('404');
    });
});

afterEach(() => {
    applyTheme(null);
    localStorage.clear();
});

test('lists the built-in dark and every installed theme package, and nothing else', async () => {
    render(<ThemeModal isOpen onClose={() => {}} />);
    expect(await screen.findByTestId('theme-option-neo-pkg-theme-light')).toHaveTextContent('Light');
    expect(screen.getByTestId('theme-option-default')).toHaveAttribute('aria-checked', 'true');
    expect(screen.queryByTestId('theme-option-neo-pkg-dbus')).toBeNull();
});

test('a click applies the theme and remembers it; Dark takes it back', async () => {
    render(<ThemeModal isOpen onClose={() => {}} />);
    fireEvent.click(await screen.findByTestId('theme-option-neo-pkg-theme-light'));
    // the installed version is in the address: an update is a new one (the server sends no Cache-Control)
    expect(document.getElementById(THEME_LINK_ID)?.getAttribute('href')).toBe('/public/neo-pkg-theme-light/theme.css?v=1.0.0');
    expect(JSON.parse(localStorage.getItem(THEME_STORAGE_KEY) ?? '{}').pkg).toBe('neo-pkg-theme-light');
    expect(screen.getByTestId('theme-option-neo-pkg-theme-light')).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(screen.getByTestId('theme-option-default'));
    expect(document.getElementById(THEME_LINK_ID)).toBeNull();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
});

test('no theme package installed: says where themes come from', async () => {
    mockGetFileList.mockImplementation(async () => ({ data: { children: [] } }));
    render(<ThemeModal isOpen onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText(/No themes installed yet/)).toBeInTheDocument());
});

test('a remembered theme that is no longer installed is forgotten: Dark is selected', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ pkg: 'neo-pkg-theme-gone', stylesheet: 'theme.css', label: 'Gone', scheme: 'light' }));
    applyTheme({ pkg: 'neo-pkg-theme-gone', stylesheet: 'theme.css', label: 'Gone', scheme: 'light' });
    render(<ThemeModal isOpen onClose={() => {}} />);
    await screen.findByTestId('theme-option-neo-pkg-theme-light');
    expect(screen.getByTestId('theme-option-default')).toHaveAttribute('aria-checked', 'true');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(document.getElementById(THEME_LINK_ID)).toBeNull();
});

test('the package list cannot be read: the remembered theme is kept, not forgotten', async () => {
    mockGetFileList.mockImplementation(async () => {
        throw new Error('network');
    });
    const sStored = { pkg: 'neo-pkg-theme-light', stylesheet: 'theme.css', label: 'Light', scheme: 'light' };
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(sStored));
    render(<ThemeModal isOpen onClose={() => {}} />);
    expect(await screen.findByText(/could not be read/)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(THEME_STORAGE_KEY) ?? '{}').pkg).toBe('neo-pkg-theme-light');
});

describe('a package holding several themes (the theme builder)', () => {
    const PRESETS = [
        { id: 'light', label: 'Light', stylesheet: 'presets/light.css', scheme: 'light', note: 'Preset', swatch: ['#cdd3f0', '#f0f2fb', 'url(x)'] },
        { id: 'cyberpunk', label: 'Cyberpunk', stylesheet: 'presets/cyberpunk.css', scheme: 'dark', note: 'Preset' },
    ];
    const USER = [{ id: 'night', label: 'Night shift', stylesheet: 'user/night.css', scheme: 'dark', note: 'Saved' }];
    const KEY_LIGHT = 'neo-pkg-theme-builder/presets/light.css';

    beforeEach(() => {
        sDirs = ['neo-pkg-theme-builder', 'neo-pkg-theme-light'];
        sFiles = { 'neo-pkg-theme-builder/themes.json': PRESETS, 'neo-pkg-theme-builder/user/themes.json': USER };
        mockHasHtml.mockResolvedValue(true);
    });

    test('every theme a package lists is ready to use, beside Dark: its name and whether it is light or dark — no package name', async () => {
        render(<ThemeModal isOpen onClose={() => {}} />);
        const sReady = await screen.findByRole('group', { name: 'Ready to use' });
        const sLight = await screen.findByTestId(`theme-option-${KEY_LIGHT}`);
        expect(sReady).toContainElement(sLight);
        expect(sLight).toHaveTextContent('Light');
        expect(screen.getByTestId('theme-option-neo-pkg-theme-builder/presets/cyberpunk.css')).toHaveTextContent('CyberpunkDark');
        expect(screen.getByTestId('theme-option-neo-pkg-theme-builder/user/night.css')).toHaveTextContent('Night shift');
        expect(sReady).toContainElement(screen.getByTestId('theme-option-default'));
        expect(screen.getByTestId('theme-option-default')).toHaveTextContent('DarkIn use');
        expect(sReady).not.toHaveTextContent('neo-pkg-theme-builder');
        // a single-theme package keeps its test id
        expect(screen.getByTestId('theme-option-neo-pkg-theme-light')).toHaveTextContent('Light');
    });

    test("each card shows the theme's own colors: the strip its index lists, else worked out from its stylesheet; Dark's are the dark defaults — never the theme in use", async () => {
        localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ pkg: 'neo-pkg-theme-light', stylesheet: 'theme.css', label: 'Light', scheme: 'light', version: '1.0.0' }));
        render(<ThemeModal isOpen onClose={() => {}} />);
        // listed by the index (a value that is not a color is left out)
        await waitFor(() => expect(stripOf(KEY_LIGHT)).toEqual(['rgb(205, 211, 240)', 'rgb(240, 242, 251)']));
        // a single stylesheet: its frame, and the accent it leaves to Dark
        await waitFor(() => expect(stripOf('neo-pkg-theme-light')).toEqual(['rgb(255, 255, 255)', 'rgb(0, 95, 184)']));
        expect(stripOf('default')).toEqual(['rgb(30, 30, 30)', 'rgb(0, 95, 184)']);
        // none listed and the stylesheet cannot be read: the card keeps an empty strip
        expect(screen.getByTestId('theme-option-neo-pkg-theme-builder/presets/cyberpunk.css').querySelector('.theme-modal__swatch--empty')).not.toBeNull();
    });

    test('two themes of one package: choosing one selects only that one', async () => {
        render(<ThemeModal isOpen onClose={() => {}} />);
        fireEvent.click(await screen.findByTestId(`theme-option-${KEY_LIGHT}`));
        expect(document.getElementById(THEME_LINK_ID)?.getAttribute('href')).toBe('/public/neo-pkg-theme-builder/presets/light.css?v=1.0.0');
        expect(JSON.parse(localStorage.getItem(THEME_STORAGE_KEY) ?? '{}')).toEqual({ pkg: 'neo-pkg-theme-builder', stylesheet: 'presets/light.css', label: 'Light', scheme: 'light', version: '1.0.0' });
        expect(screen.getByTestId(`theme-option-${KEY_LIGHT}`)).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByTestId('theme-option-neo-pkg-theme-builder/presets/cyberpunk.css')).toHaveAttribute('aria-checked', 'false');
    });

    test('nothing saved yet (no user index): the presets are still listed', async () => {
        delete sFiles['neo-pkg-theme-builder/user/themes.json'];
        render(<ThemeModal isOpen onClose={() => {}} />);
        expect(await screen.findByTestId(`theme-option-${KEY_LIGHT}`)).toBeInTheDocument();
        expect(screen.queryByText('Night shift')).toBeNull();
    });

    test('a remembered theme deleted in the builder is forgotten; its package stays listed', async () => {
        localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ pkg: 'neo-pkg-theme-builder', stylesheet: 'user/gone.css', label: 'Gone', scheme: 'dark' }));
        render(<ThemeModal isOpen onClose={() => {}} />);
        await screen.findByTestId(`theme-option-${KEY_LIGHT}`);
        expect(screen.getByTestId('theme-option-default')).toHaveAttribute('aria-checked', 'true');
        expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    });

    test('the package has an app: the dialog opens it in a tab and closes', async () => {
        const sClose = jest.fn();
        render(<ThemeModal isOpen onClose={sClose} />);
        fireEvent.click(await screen.findByTestId('theme-open-app-neo-pkg-theme-builder'));
        expect(screen.getByTestId('theme-open-app-neo-pkg-theme-builder')).toHaveTextContent('Open Theme Builder');
        expect(sBoards.some((b) => b.type === 'appView' && b.code?.appName === 'neo-pkg-theme-builder')).toBe(true);
        expect(sClose).toHaveBeenCalled();
    });

    test('a package that lists no theme (an older builder): no card of its own, only its app — and where saved themes will show', async () => {
        sFiles = {};
        MANIFESTS['neo-pkg-theme-builder'] = { name: 'neo-pkg-theme-builder', version: '1.3.0', neoTheme: { label: 'Theme Builder' } };
        try {
            render(<ThemeModal isOpen onClose={() => {}} />);
            expect(await screen.findByTestId('theme-open-app-neo-pkg-theme-builder')).toHaveTextContent('Open Theme Builder');
            expect(screen.queryByTestId(`theme-option-${KEY_LIGHT}`)).toBeNull();
            expect(screen.queryByText(/No theme/)).toBeNull();
            expect(screen.getByTestId('theme-option-neo-pkg-theme-light')).toBeInTheDocument();
            expect(screen.getByRole('group', { name: 'My themes' })).toHaveTextContent('Themes you save in Theme Builder are listed here.');
        } finally {
            MANIFESTS['neo-pkg-theme-builder'] = { name: 'neo-pkg-theme-builder', version: '1.0.0', neoTheme: { label: 'Theme Builder', index: ['themes.json', 'user/themes.json'] } };
        }
    });

    test('only the builder, nothing saved yet: Dark, the builder, and where saved themes will show', async () => {
        sDirs = ['neo-pkg-theme-builder'];
        sFiles = {};
        MANIFESTS['neo-pkg-theme-builder'] = { name: 'neo-pkg-theme-builder', version: '1.3.0', neoTheme: { label: 'Theme Builder' } };
        try {
            render(<ThemeModal isOpen onClose={() => {}} />);
            expect(await screen.findByText('Themes you save in Theme Builder are listed here.')).toBeInTheDocument();
            expect(screen.getByTestId('theme-option-default')).toHaveAttribute('aria-checked', 'true');
            expect(screen.queryByText(/No themes installed yet/)).toBeNull();
        } finally {
            MANIFESTS['neo-pkg-theme-builder'] = { name: 'neo-pkg-theme-builder', version: '1.0.0', neoTheme: { label: 'Theme Builder', index: ['themes.json', 'user/themes.json'] } };
        }
    });

    test('no app (no main.html): no button', async () => {
        mockHasHtml.mockResolvedValue(false);
        render(<ThemeModal isOpen onClose={() => {}} />);
        await screen.findByTestId(`theme-option-${KEY_LIGHT}`);
        expect(screen.queryByTestId('theme-open-app-neo-pkg-theme-builder')).toBeNull();
    });
});

describe('my own themes (kept in this browser by the builder)', () => {
    const token = (aSub: string) => `h.${btoa(JSON.stringify({ sub: aSub })).replace(/=+$/, '')}.s`;

    test('listed, chosen like any other, painted from the browser', async () => {
        localStorage.setItem('neo.themes', JSON.stringify([{ id: 'night', label: 'Night', scheme: 'dark', css: ':root { --neo-bg-primary: #101820; }', swatch: ['#101820', '#202830'] }]));
        render(<ThemeModal isOpen onClose={() => {}} />);
        const sRow = await screen.findByTestId('theme-option-@local/night.css');
        expect(screen.getByRole('group', { name: 'My themes' })).toContainElement(sRow);
        fireEvent.click(sRow);
        expect(document.getElementById(THEME_LINK_ID)).toBeNull();
        expect(document.getElementById('neo-theme-cached')?.textContent).toContain('#101820');
        expect(JSON.parse(localStorage.getItem('neo.theme') ?? '{}').stylesheet).toBe('night.css');
    });

    test('each says when it was saved and whether it is light or dark; with the builder installed, Edit opens it there', async () => {
        sDirs = ['neo-pkg-theme-builder'];
        mockHasHtml.mockResolvedValue(true);
        const sSaved = new Date(2026, 10, 6, 10, 12).getTime();
        localStorage.setItem('neo.themes', JSON.stringify([{ id: 'night', label: 'Night', scheme: 'dark', css: ':root { --neo-bg-primary: #101820; }', saved: sSaved }]));
        const sClose = jest.fn();
        render(<ThemeModal isOpen onClose={sClose} />);
        const sCard = (await screen.findByTestId('theme-option-@local/night.css')).closest('.theme-modal__card') as HTMLElement;
        expect(sCard).toHaveTextContent('NightDark');
        expect(sCard).toHaveTextContent('saved Nov 6, 10:12');
        // the builder, about to open, asks for the themes: the answer carries the one to open
        const sFrame = document.createElement('iframe');
        document.body.appendChild(sFrame);
        const sPosted = jest.spyOn(sFrame.contentWindow as Window, 'postMessage').mockImplementation(() => {});
        try {
            fireEvent.click(await screen.findByTestId('theme-edit-@local/night.css'));
            expect(sBoards.some((b) => b.type === 'appView' && b.code?.appName === 'neo-pkg-theme-builder')).toBe(true);
            expect(sClose).toHaveBeenCalled();
            handleThemeRequest(new MessageEvent('message', { data: { type: 'neo-theme', action: 'themes', request: 1 }, origin: window.location.origin, source: sFrame.contentWindow as Window }));
            expect(sPosted.mock.calls.map((c) => c[0]).filter((m) => m.action === 'reply').at(-1)).toMatchObject({ edit: { pkg: '@local', stylesheet: 'night.css' } });
        } finally {
            sFrame.remove();
        }
    });

    test('without the builder there is nothing to edit them in: Delete only', async () => {
        localStorage.setItem('neo.themes', JSON.stringify([{ id: 'night', label: 'Night', scheme: 'dark', css: ':root{}' }]));
        render(<ThemeModal isOpen onClose={() => {}} />);
        expect(await screen.findByTestId('theme-delete-@local/night.css')).toBeInTheDocument();
        expect(screen.queryByTestId('theme-edit-@local/night.css')).toBeNull();
    });

    test('the browser\'s, whoever is signed in', async () => {
        localStorage.setItem('neo.themes', JSON.stringify([{ id: 'night', label: 'Night', scheme: 'dark', css: ':root{}' }]));
        for (const sUser of ['alice', 'bob']) {
            localStorage.setItem('accessToken', token(sUser));
            const { unmount } = render(<ThemeModal isOpen onClose={() => {}} />);
            expect(await screen.findByTestId('theme-option-@local/night.css')).toBeInTheDocument();
            unmount();
        }
    });
});

// This browser's own themes are deleted here too: they stay when the theme builder is uninstalled.
test('a theme of this browser is deleted from the dialog after a confirm; the one in use gives way to Dark', async () => {
    localStorage.setItem('neo.themes', JSON.stringify([{ id: 'night', label: 'Night', scheme: 'dark', css: ':root { --neo-bg-primary: #101010; }', swatch: [] }, { id: 'day', label: 'Day', scheme: 'light', css: ':root { --neo-bg-primary: #fafafa; }', swatch: [] }]));
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ pkg: '@local', stylesheet: 'night.css', label: 'Night', scheme: 'dark' }));
    render(<ThemeModal isOpen onClose={() => {}} />);
    expect(screen.getByTestId('theme-option-@local/night.css')).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(screen.getByTestId('theme-delete-@local/night.css'));
    expect(await screen.findByTestId('theme-delete-dialog')).toHaveTextContent('Delete "Night" from this browser?');
    // Cancel keeps it
    fireEvent.click(screen.getByTestId('cancel'));
    expect(screen.queryByTestId('theme-delete-dialog')).toBeNull();
    expect(screen.getByTestId('theme-option-@local/night.css')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('theme-delete-@local/night.css'));
    fireEvent.click(await screen.findByTestId('confirm'));
    await waitFor(() => expect(screen.queryByTestId('theme-option-@local/night.css')).toBeNull());
    expect(screen.getByTestId('theme-option-@local/day.css')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('neo.themes') ?? '[]').map((t: { id: string }) => t.id)).toEqual(['day']);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(screen.getByTestId('theme-option-default')).toHaveAttribute('aria-checked', 'true');
});

// The server lists an empty folder without `children`: no package installed is "none", not a failed listing.
test('an empty /public is no theme installed, and a remembered theme of a package gone since is forgotten', async () => {
    mockGetFileList.mockImplementation(async (_f: string, aDir: string, aName: string) => {
        if (aDir === '/public/' && !aName) return { data: { isDir: true, name: 'public', gitClone: false } };
        throw new Error('404');
    });
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ pkg: 'neo-pkg-gone', stylesheet: 'theme.css', label: 'Gone', scheme: 'light' }));
    render(<ThemeModal isOpen onClose={() => {}} />);
    expect(await screen.findByText('No themes installed yet. Install a theme package from the App Store.')).toBeInTheDocument();
    expect(screen.queryByText('The installed packages could not be read.')).toBeNull();
    await waitFor(() => expect(screen.getByTestId('theme-option-default')).toHaveAttribute('aria-checked', 'true'));
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
});

