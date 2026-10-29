import { fireEvent, render as rtlRender, screen, waitFor } from '@testing-library/react';
import { RecoilRoot, useRecoilValue } from 'recoil';
import type { ReactElement } from 'react';
import { ThemeModal } from './ThemeModal';
import { THEME_LINK_ID, THEME_STORAGE_KEY, applyTheme } from '@/design-system/theme';
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

beforeEach(() => {
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
    expect(document.getElementById(THEME_LINK_ID)?.getAttribute('href')).toBe('/public/neo-pkg-theme-light/theme.css');
    expect(JSON.parse(localStorage.getItem(THEME_STORAGE_KEY) ?? '{}').pkg).toBe('neo-pkg-theme-light');
    expect(screen.getByTestId('theme-option-neo-pkg-theme-light')).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(screen.getByTestId('theme-option-default'));
    expect(document.getElementById(THEME_LINK_ID)).toBeNull();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
});

test('no theme package installed: says where themes come from', async () => {
    mockGetFileList.mockImplementation(async () => ({ data: { children: [] } }));
    render(<ThemeModal isOpen onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText(/No theme package is installed/)).toBeInTheDocument());
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

    test('every theme of the package under its label, with the colours and note the index gives', async () => {
        render(<ThemeModal isOpen onClose={() => {}} />);
        const sGroup = await screen.findByRole('group', { name: 'Theme Builder' });
        expect(sGroup).toHaveTextContent('neo-pkg-theme-builder');
        const sLight = screen.getByTestId(`theme-option-${KEY_LIGHT}`);
        expect(sLight).toHaveTextContent('Light');
        expect(sLight).toHaveTextContent('Preset');
        // a value that is not a colour is not drawn
        expect(sLight.querySelectorAll('.theme-modal__swatch i')).toHaveLength(2);
        expect(screen.getByTestId('theme-option-neo-pkg-theme-builder/user/night.css')).toHaveTextContent('Night shift');
        // a single-theme package keeps its row and test id
        expect(screen.getByTestId('theme-option-neo-pkg-theme-light')).toHaveTextContent('Light');
    });

    test('two themes of one package: choosing one selects only that one', async () => {
        render(<ThemeModal isOpen onClose={() => {}} />);
        fireEvent.click(await screen.findByTestId(`theme-option-${KEY_LIGHT}`));
        expect(document.getElementById(THEME_LINK_ID)?.getAttribute('href')).toBe('/public/neo-pkg-theme-builder/presets/light.css');
        expect(JSON.parse(localStorage.getItem(THEME_STORAGE_KEY) ?? '{}')).toEqual({ pkg: 'neo-pkg-theme-builder', stylesheet: 'presets/light.css', label: 'Light', scheme: 'light' });
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

    test('no app (no main.html): no button', async () => {
        mockHasHtml.mockResolvedValue(false);
        render(<ThemeModal isOpen onClose={() => {}} />);
        await screen.findByTestId(`theme-option-${KEY_LIGHT}`);
        expect(screen.queryByTestId('theme-open-app-neo-pkg-theme-builder')).toBeNull();
    });
});

describe('my own themes (kept in this browser by the builder)', () => {
    const token = (aSub: string) => `h.${btoa(JSON.stringify({ sub: aSub })).replace(/=+$/, '')}.s`;

    test('listed for the signed-in user, chosen like any other, painted from the browser', async () => {
        localStorage.setItem('accessToken', token('alice'));
        localStorage.setItem('neo.themes.alice', JSON.stringify([{ id: 'night', label: 'Night', scheme: 'dark', css: ':root { --neo-bg-primary: #101820; }', swatch: ['#101820', '#202830'] }]));
        render(<ThemeModal isOpen onClose={() => {}} />);
        const sRow = await screen.findByTestId('theme-option-@local/night.css');
        expect(screen.getByRole('group', { name: 'My themes' })).toContainElement(sRow);
        fireEvent.click(sRow);
        expect(document.getElementById(THEME_LINK_ID)).toBeNull();
        expect(document.getElementById('neo-theme-cached')?.textContent).toContain('#101820');
        expect(JSON.parse(localStorage.getItem('neo.theme.alice') ?? '{}').stylesheet).toBe('night.css');
    });

    test('another user does not see them', async () => {
        localStorage.setItem('neo.themes.alice', JSON.stringify([{ id: 'night', label: 'Night', scheme: 'dark', css: ':root{}' }]));
        localStorage.setItem('accessToken', token('bob'));
        render(<ThemeModal isOpen onClose={() => {}} />);
        await screen.findByTestId('theme-option-neo-pkg-theme-light');
        expect(screen.queryByTestId('theme-option-@local/night.css')).toBeNull();
    });
});
