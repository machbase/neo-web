import { render, screen, waitFor } from '@testing-library/react';
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

describe('the sign-in picture follows the theme in use (the Theme Builder\'s state)', () => {
    const state = (aPicture?: string) =>
        JSON.stringify({
            v: 1,
            owner: 'neo-pkg-theme-builder',
            scheme: 'dark',
            theme: { pkg: '@local', stylesheet: 'night.css', label: 'Night' },
            set: { 'bg-primary': '#101010' },
            resolved: {},
            tokens: 'x',
            at: 1,
            ...(aPicture ? { loginImage: { picture: aPicture } } : {}),
        });
    let sKept: Map<string, unknown>;
    const sCreate = jest.fn((aBlob: Blob) => `blob:test/${aBlob.size}`);
    const sRevoke = jest.fn();
    beforeEach(() => {
        localStorage.setItem('experimentMode', 'true');
        sKept = new Map();
        usePictureStore({ get: async (k) => sKept.get(k), put: async (k, b) => void sKept.set(k, b), delete: async (k) => void sKept.delete(k) });
        Object.assign(URL, { createObjectURL: sCreate, revokeObjectURL: sRevoke });
    });
    afterEach(() => {
        usePictureStore(null);
        localStorage.clear();
    });

    it('shows no picture while it is read (the built-in one does not flash first), then the theme\'s, filling the page', async () => {
        localStorage.setItem('neo.theme.state', state('night'));
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
        localStorage.setItem('neo.theme.state', state('night'));
        render(<Login />);
        const sImage = screen.getByTestId('login-bg-img');
        await waitFor(() => expect(sImage).toHaveAttribute('src'));
        expect(sImage.getAttribute('src')).not.toMatch(/^blob:/);
        expect(sImage).not.toHaveClass('login-bg-img--theme');
    });

    it('shows the built-in picture with experiment mode off, whatever the theme in use', () => {
        localStorage.removeItem('experimentMode');
        localStorage.setItem('neo.theme.state', state('night'));
        sKept.set('night', new Blob([new Uint8Array(7)], { type: 'image/webp' }));
        render(<Login />);
        expect(screen.getByTestId('login-bg-img').getAttribute('src') ?? '').not.toMatch(/^blob:/);
    });

    it('shows the built-in picture with no theme, or a theme without a picture', () => {
        render(<Login />);
        const sBuiltIn = screen.getByTestId('login-bg-img').getAttribute('src');
        expect(sBuiltIn).toBeTruthy();
        localStorage.setItem('neo.theme.state', state());
        render(<Login />);
        expect(screen.getAllByTestId('login-bg-img')[1].getAttribute('src')).toBe(sBuiltIn);
        expect(screen.getAllByTestId('login-bg-img')[1]).not.toHaveClass('login-bg-img--theme');
    });
});
