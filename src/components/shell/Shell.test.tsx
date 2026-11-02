/**
 * @jest-environment jsdom
 * @jest-environment-options {"userAgent":"Version/17.0 Safari/605.1.15"}
 */
import { StrictMode } from 'react';
import { Shell } from './Shell';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { getLogin } from '@/api/repository/login';
import request, { setUserInitiatedLogout } from '@/api/core';
import { cancelAllPendingFileWrites } from '@/api/repository/fileWriteQueue';
import { postTerminalSize } from '@/api/repository/machiot';

jest.mock('@/api/repository/login', () => ({ getLogin: jest.fn(), reLogin: () => jest.requireActual('@/api/repository/login').reLogin() }));
jest.mock('@/api/repository/machiot', () => ({ postTerminalSize: jest.fn() }));
jest.mock('@/design-system/components', () => {
    const Box = ({ children }: any) => <div>{children}</div>;
    return {
        Toast: { error: jest.fn(), success: jest.fn() },
        Page: Object.assign(Box, { Header: Box }),
        Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
        Dropdown: { Root: Box, Trigger: () => null, Menu: Box, List: () => null },
    };
});

const mockTerminals: any[] = [];
const mockFitters: any[] = [];
const mockGraphics: any[] = [];
jest.mock('@xterm/xterm', () => ({ Terminal: jest.fn().mockImplementation(() => {
    const addons: any[] = [];
    const terminal = {
        options: {}, textarea: global.document.createElement('textarea'), element: global.document.createElement('div'),
        loadAddon: jest.fn(addon => { addons.push(addon); }),
        open: jest.fn(function(this: any, node: HTMLElement) { this.element.append(this.textarea); node.append(this.element); }),
        focus: jest.fn(), attachCustomKeyEventHandler: jest.fn(), onResize: jest.fn(), writeln: jest.fn(),
        // Terminal.dispose owns loaded addons in xterm 6's AddonManager.
        dispose: jest.fn(() => { for (const addon of addons) addon.dispose(); }),
    };
    mockTerminals.push(terminal); return terminal;
}) }));
jest.mock('@xterm/addon-fit', () => ({ FitAddon: jest.fn().mockImplementation(() => {
    const fitter = { fit: jest.fn(), dispose: jest.fn() }; mockFitters.push(fitter); return fitter;
}) }));
jest.mock('@xterm/addon-web-links', () => ({ WebLinksAddon: jest.fn().mockImplementation(() => ({ dispose: jest.fn() })) }));
jest.mock('@xterm/addon-attach', () => ({ AttachAddon: jest.fn().mockImplementation(() => ({ dispose: jest.fn() })) }));
jest.mock('@xterm/addon-webgl', () => ({ WebglAddon: jest.fn().mockImplementation(() => {
    const addon = { dispose: jest.fn(), onContextLoss: jest.fn() }; mockGraphics.push(addon); return addon;
}) }));

const observers: any[] = [];
const sockets: any[] = [];
const originalSocket = global.WebSocket;
const originalObserver = global.ResizeObserver;
const originalAdapter = request.defaults.adapter;
const props = { pId: 'shell-test', pSelectedTab: 'shell-test', pInfo: { shell: { id: 'SHELL', theme: 'dark' } } };

beforeEach(() => {
    jest.useFakeTimers(); jest.clearAllMocks();
    mockTerminals.length = mockFitters.length = mockGraphics.length = observers.length = sockets.length = 0;
    (getLogin as jest.Mock).mockResolvedValue({ reason: 'success' });
    global.ResizeObserver = class {
        observe = jest.fn(); disconnect = jest.fn(); unobserve = jest.fn();
        constructor(public callback: () => void) { observers.push(this); }
    } as any;
    global.WebSocket = class extends EventTarget {
        static OPEN = 1; readyState = 1; close = jest.fn(); send = jest.fn();
        constructor() { super(); sockets.push(this); }
    } as any;
});
afterEach(() => { request.defaults.adapter = originalAdapter; cancelAllPendingFileWrites(); localStorage.clear(); jest.clearAllTimers(); jest.useRealTimers(); global.WebSocket = originalSocket; global.ResizeObserver = originalObserver; });
const flush = () => act(async () => { await Promise.resolve(); });
const settle = async () => { await flush(); act(() => jest.advanceTimersByTime(500)); };

it('reuses one observer through rendering and only fits the selected shell', async () => {
    const view = render(<Shell {...props} />); await settle();
    expect(observers).toHaveLength(1);
    fireEvent.click(screen.getByText('A+'));
    expect(mockTerminals[0].options.fontSize).toBe(15);
    view.rerender(<Shell {...props} pSelectedTab="other" />);
    const fitted = mockFitters[0].fit.mock.calls.length;
    act(() => observers[0].callback());
    expect(mockFitters[0].fit).toHaveBeenCalledTimes(fitted);
    view.rerender(<Shell {...props} />);
    const beforeResize = mockFitters[0].fit.mock.calls.length;
    act(() => observers[0].callback());
    expect(mockFitters[0].fit.mock.calls.length).toBeGreaterThan(beforeResize);
    expect(observers).toHaveLength(1);
    expect(mockTerminals).toHaveLength(1);
    view.unmount();
});

it('disposes the terminal-owned addons and detaches observation and IME listeners', async () => {
    const view = render(<Shell {...props} />); await settle();
    const terminal = mockTerminals[0], socket = sockets[0];
    const pendingIme = () => terminal.textarea.dispatchEvent(new InputEvent('beforeinput', { data: '한', inputType: 'insertReplacementText', bubbles: true, cancelable: true }));
    expect(pendingIme()).toBe(false);
    terminal.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
    expect(socket.send).toHaveBeenCalledWith('한');
    socket.send.mockClear();
    expect(pendingIme()).toBe(false);
    view.unmount();
    expect(terminal.dispose).toHaveBeenCalledTimes(1);
    expect(mockFitters[0].dispose).toHaveBeenCalledTimes(1);
    expect(mockGraphics[0].dispose).toHaveBeenCalledTimes(1);
    expect(observers[0].disconnect).toHaveBeenCalledTimes(1);
    expect(socket.close).toHaveBeenCalledTimes(1);
    expect(pendingIme()).toBe(true);
    terminal.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
    expect(socket.send).not.toHaveBeenCalled();
    socket.dispatchEvent(new Event('close'));
    expect(terminal.writeln).not.toHaveBeenCalled();
});

it('does not open a terminal when login checking finishes after unmount', async () => {
    let finish!: (value: unknown) => void;
    (getLogin as jest.Mock).mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const view = render(<Shell {...props} />); view.unmount();
    await act(async () => { finish({ reason: 'success' }); });
    expect(sockets).toHaveLength(0); expect(mockTerminals).toHaveLength(0);
});

it('does not run delayed fitting, observation or graphics setup after closing', async () => {
    const view = render(<Shell {...props} />); await flush();
    act(() => { sockets[0].dispatchEvent(new Event('open')); });
    view.unmount();
    mockFitters[0].fit.mockClear();
    act(() => jest.advanceTimersByTime(1000));
    expect(mockFitters[0].fit).not.toHaveBeenCalled();
    expect(observers[0].observe).not.toHaveBeenCalled();
    expect(mockGraphics).toHaveLength(0);
    expect(postTerminalSize).not.toHaveBeenCalled();
});

it('keeps only the current setup when StrictMode login replies arrive out of order', async () => {
    const replies: Array<(value: unknown) => void> = [];
    (getLogin as jest.Mock).mockImplementation(() => new Promise(resolve => replies.push(resolve)));
    const view = render(<StrictMode><Shell {...props} /></StrictMode>);
    expect(replies).toHaveLength(2);
    await act(async () => replies[1]({ reason: 'success' }));
    await act(async () => replies[0]({ reason: 'success' }));
    expect(mockTerminals).toHaveLength(1); expect(sockets).toHaveLength(1);
    view.unmount(); expect(mockTerminals[0].dispose).toHaveBeenCalledTimes(1);
});

it('ignores context-loss callbacks belonging to an already replaced addon', async () => {
    const view = render(<Shell {...props} />); await settle();
    const old = mockGraphics[0];
    view.rerender(<Shell {...props} pSelectedTab="other" />);
    view.rerender(<Shell {...props} />);
    const current = mockGraphics[mockGraphics.length - 1];
    act(() => old.onContextLoss.mock.calls[0][0]());
    const alreadyDisposed = current.dispose.mock.calls.length;
    view.rerender(<Shell {...props} pSelectedTab="other" />);
    view.rerender(<Shell {...props} />);
    expect(current.dispose).toHaveBeenCalledTimes(alreadyDisposed + 1);
    view.unmount();
});


const deferred = () => {
    let resolve!: () => void;
    return { promise: new Promise<void>(done => { resolve = done; }), release: () => resolve() };
};

// Exercise the real owner -> repository -> Axios retry flow, rather than mocking
// getLogin's final result after the authentication side effects already happened.
for (const endpoint of ['check', 'windowsize']) {
    for (const outcome of ['success', 'rejected']) {
        for (const owner of ['closed', 'reopened', 'active']) {
            it(`${endpoint} refresh ${outcome}, owner=${owner}: respects the owner lifetime`, async () => {
                setUserInitiatedLogout(false);
                localStorage.setItem('accessToken', 'test-access');
                localStorage.setItem('refreshToken', 'test-refresh');
                (getLogin as jest.Mock).mockImplementation(jest.requireActual('@/api/repository/login').getLogin);
                (postTerminalSize as jest.Mock).mockImplementation(jest.requireActual('@/api/repository/machiot').postTerminalSize);
                const entered = deferred(), gate = deferred();
                let requests = 0, refreshes = 0;
                const logout = jest.fn();
                window.addEventListener('logoutEvent', logout);
                request.defaults.adapter = async config => {
                    const response = (data: unknown) => ({ data, status: 200, statusText: 'OK', headers: {}, config });
                    if (config.url === '/api/relogin') {
                        refreshes++; entered.release(); await gate.promise;
                        if (outcome === 'rejected') {
                            throw { isAxiosError: true, config, response: { ...response({ success: false, reason: 'controlled rejected refresh' }), status: 401 } };
                        }
                        return response({ success: true, accessToken: 'renewed', refreshToken: 'renewed' });
                    }
                    const targeted = endpoint === 'check' ? config.url === '/api/check' : config.url?.endsWith('/windowsize');
                    if (targeted) {
                        requests++;
                        if (requests === 1) throw { isAxiosError: true, config, response: { ...response({ success: false }), status: 401 } };
                    }
                    return response({ success: true, reason: 'success' });
                };
                const view = render(<Shell {...props} />);
                let reopened: ReturnType<typeof render> | undefined;
                try {
                    if (endpoint === 'windowsize') {
                        await act(async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); });
                        expect(mockTerminals).toHaveLength(1);
                        act(() => mockTerminals[0].onResize.mock.calls[0][0]({ cols: 80, rows: 24 }));
                    }
                    await entered.promise;
                    if (owner !== 'active') view.unmount();
                    if (owner === 'reopened') {
                        reopened = render(<Shell {...props} pId="new-shell" pSelectedTab="new-shell" />);
                        await act(async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); });
                    }
                    const beforeReply = requests;
                    await act(async () => { gate.release(); for (let i = 0; i < 50; i++) await Promise.resolve(); });
                    expect(refreshes).toBe(1);
                    expect(requests).toBe(beforeReply + (owner === 'active' && outcome === 'success' ? 1 : 0));
                    expect(logout).toHaveBeenCalledTimes(owner === 'active' && outcome === 'rejected' ? 1 : 0);
                    if (owner === 'closed' && endpoint === 'check') expect(mockTerminals).toHaveLength(0);
                    if (owner === 'reopened') expect(mockTerminals[mockTerminals.length - 1].dispose).not.toHaveBeenCalled();
                } finally {
                    gate.release(); view.unmount(); reopened?.unmount();
                    window.removeEventListener('logoutEvent', logout);
                }
            });
        }
    }
}
