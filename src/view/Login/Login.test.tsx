import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'; //toBeInTheDocument() 를 사용하기 위해서 필요합니다!
import Login from './Login';
import { usePictureStore } from '@/design-system/theme';
const mockedUsedNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
    ...(jest.requireActual('react-router-dom') as any),
    useNavigate: () => mockedUsedNavigate,
}));

describe('Login Page', () => {
    it('render Login Page', () => {
        render(<Login />);
    });

    it('Remember User ID', () => {
        render(<Login />);
        expect(screen.getByText('Remember User ID')).toBeInTheDocument();
    });
});

describe("the sign-in picture follows the theme this browser last chose", () => {
    beforeEach(() => localStorage.setItem('experimentMode', 'true'));
    afterEach(() => localStorage.clear());

    it('shows the built-in picture with experiment mode off, whatever theme was chosen', () => {
        localStorage.removeItem('experimentMode');
        localStorage.setItem('neo.theme', JSON.stringify({ pkg: 'neo-pkg-theme-ocean', stylesheet: 'theme.css', label: 'Ocean', scheme: 'light', version: '1.2.0', loginImage: 'login.webp' }));
        render(<Login />);
        expect(screen.queryByTestId('login-bg-img')?.getAttribute('src') ?? '').not.toMatch(/neo-pkg-theme-ocean/);
    });

    it("shows a package theme's own picture (neoTheme.loginImage), from the package's versioned address", () => {
        localStorage.setItem('neo.theme', JSON.stringify({ pkg: 'neo-pkg-theme-ocean', stylesheet: 'theme.css', label: 'Ocean', scheme: 'light', version: '1.2.0', loginImage: 'login.webp' }));
        render(<Login />);
        expect(screen.getByTestId('login-bg-img')).toHaveAttribute('src', '/public/neo-pkg-theme-ocean/login.webp?v=1.2.0');
    });

    it("falls back to the built-in picture when the theme's does not load", () => {
        localStorage.setItem('neo.theme', JSON.stringify({ pkg: 'neo-pkg-theme-ocean', stylesheet: 'theme.css', loginImage: 'login.webp' }));
        render(<Login />);
        const sImage = screen.getByTestId('login-bg-img');
        fireEvent.error(sImage);
        expect(sImage.getAttribute('src')).not.toContain('/public/neo-pkg-theme-ocean/');
    });

    describe('a theme made in the theme builder: its picture is read from IndexedDB', () => {
        let sKept: Map<string, unknown>;
        const sCreate = jest.fn((aBlob: Blob) => `blob:test/${aBlob.size}`);
        const sRevoke = jest.fn();
        beforeEach(() => {
            sKept = new Map();
            usePictureStore({ get: async (k) => sKept.get(k), put: async (k, b) => void sKept.set(k, b), delete: async (k) => void sKept.delete(k) });
            Object.assign(URL, { createObjectURL: sCreate, revokeObjectURL: sRevoke });
            localStorage.setItem('neo.theme', JSON.stringify({ pkg: '@local', stylesheet: 'night.css', label: 'Night', scheme: 'dark' }));
            // the browser's own theme: its entry says it has a picture (the sign-in page reads it too)
            localStorage.setItem('neo.themes', JSON.stringify([{ id: 'night', label: 'Night', scheme: 'dark', css: ':root{}', loginImage: true }]));
        });
        afterEach(() => usePictureStore(null));

        it('shows no picture while it is read (the built-in one does not flash first), then the theme\'s, filling the page', async () => {
            sKept.set('night', new Blob([new Uint8Array(7)], { type: 'image/webp' }));
            const { unmount } = render(<Login />);
            const sImage = screen.getByTestId('login-bg-img');
            expect(sImage).not.toHaveAttribute('src');
            await waitFor(() => expect(sImage).toHaveAttribute('src', 'blob:test/7'));
            // a picture of any size fills the page without being stretched; the built-in one keeps its look
            expect(sImage).toHaveClass('login-bg-img--theme');
            unmount();
            expect(sRevoke).toHaveBeenCalledWith('blob:test/7');
        });

        it('shows the built-in picture when the theme\'s is gone', async () => {
            render(<Login />);
            const sImage = screen.getByTestId('login-bg-img');
            await waitFor(() => expect(sImage).toHaveAttribute('src'));
            expect(sImage.getAttribute('src')).not.toMatch(/^blob:/);
            expect(sImage).not.toHaveClass('login-bg-img--theme');
        });
    });

    it('shows the built-in picture with no theme, or a theme without a picture', () => {
        render(<Login />);
        const sBuiltIn = screen.getByTestId('login-bg-img').getAttribute('src');
        expect(sBuiltIn).not.toContain('/public/');
        localStorage.setItem('neo.theme', JSON.stringify({ pkg: 'neo-pkg-theme-light', stylesheet: 'theme.css', scheme: 'light' }));
        render(<Login />);
        expect(screen.getAllByTestId('login-bg-img')[1].getAttribute('src')).toBe(sBuiltIn);
        expect(screen.getAllByTestId('login-bg-img')[1]).not.toHaveClass('login-bg-img--theme');
    });
});
