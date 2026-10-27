import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeModal } from './ThemeModal';
import { THEME_LINK_ID, THEME_STORAGE_KEY, applyTheme } from '@/design-system/theme';

const mockGetFileList = jest.fn();
jest.mock('@/api/repository/api', () => ({ getFileList: (...a: unknown[]) => mockGetFileList(...a) }));

const MANIFESTS: Record<string, unknown> = {
    'neo-pkg-theme-light': { name: 'neo-pkg-theme-light', version: '1.0.0', neoTheme: { label: 'Light', stylesheet: 'theme.css', scheme: 'light' } },
    'neo-pkg-dbus': { name: 'neo-pkg-dbus', version: '1.0.0' },
};

beforeEach(() => {
    mockGetFileList.mockImplementation(async (_f: string, aDir: string, aName: string) => {
        if (aDir === '/public/' && !aName) return { data: { children: [{ name: 'neo-pkg-dbus', isDir: true }, { name: 'neo-pkg-theme-light', isDir: true }, { name: 'neo-pkg-theme-light.zip', isDir: false }] } };
        const sPkg = aDir.replace(/^\/public\//, '').replace(/\/$/, '');
        if (aName === 'package.json' && MANIFESTS[sPkg]) return { data: MANIFESTS[sPkg] };
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
