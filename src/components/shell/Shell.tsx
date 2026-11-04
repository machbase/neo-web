import './Shell.scss';
import axios from 'axios';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { AttachAddon } from '@xterm/addon-attach';
import { WebglAddon } from '@xterm/addon-webgl';
import { postTerminalSize } from '../../api/repository/machiot';
import { getLogin } from '@/api/repository/login';
import Theme from '@/assets/ts/xtermTheme';
import { Button, Dropdown, Page } from '@/design-system/components';
import { GoDotFill } from '@/assets/icons/Icon';

type ThemeKey = keyof typeof Theme;

const THEME_OPTIONS: { label: string; value: ThemeKey }[] = [
    { label: 'Dark', value: 'dark' },
    { label: 'Indigo', value: 'indigo' },
    { label: 'Gray', value: 'gray' },
    { label: 'Ollie', value: 'ollie' },
    { label: 'Warm Neon', value: 'warmNeon' },
    { label: 'Galaxy', value: 'galaxy' },
    { label: 'White', value: 'white' },
];

const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 24;
const DEFAULT_FONT_SIZE = 14;

// WKWebView (Safari/Tauri/Capacitor) does not fire compositionstart/end for Hangul IME;
// it fires `insertReplacementText` which xterm.js v6.0 ignores, so composed syllables are
// dropped and only raw jamo reach the PTY. Mirrors xterm.js PR #5704 as an external intercept.
const isSafari = typeof navigator !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

const isHangulChar = (ch: string): boolean => {
    if (!ch) return false;
    const cp = ch.codePointAt(0)!;
    return (
        (cp >= 0x1100 && cp <= 0x11ff) ||
        (cp >= 0x3130 && cp <= 0x318f) ||
        (cp >= 0xac00 && cp <= 0xd7af) ||
        (cp >= 0xa960 && cp <= 0xa97f) ||
        (cp >= 0xd7b0 && cp <= 0xd7ff)
    );
};

interface ShellProps {
    pId: string;
    pInfo: any;
    pSelectedTab: string;
    pType?: string;
    pWidth?: any;
}

export const Shell = ({ pId, pInfo, pType, pSelectedTab }: ShellProps) => {
    // ref ele
    const term_view: Element | any = useRef();
    const sTermUIDRef = useRef<any>(undefined);
    const [sTermView, setTermView] = useState<any>(undefined);
    const [sFontSize, setFontSize] = useState<number>(DEFAULT_FONT_SIZE);
    const [sCurrentTheme, setCurrentTheme] = useState<ThemeKey>(() => {
        if (pInfo.shell.theme && pInfo.shell.theme !== 'default') return pInfo.shell.theme;
        return 'dark';
    });
    const [sWsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
    // Keep latest pSelectedTab in ref for ResizeObserver closure
    const selectedTabRef = useRef(pSelectedTab);
    selectedTabRef.current = pSelectedTab;
    const sWebSocRef = useRef<WebSocket | null>(null);
    const sWebglAddonRef = useRef<WebglAddon | null>(null);
    const sImeWiredRef = useRef<boolean>(false);
    const sTermRef = useRef<Terminal | null>(null);
    const sFitterRef = useRef<FitAddon | null>(null);
    const sObserverRef = useRef<ResizeObserver | null>(null);
    const sTimersRef = useRef(new Set<number>());
    const sFrameRef = useRef<number | null>(null);
    const sLifetimeRef = useRef<AbortController | null>(null);

    // Deferred work belongs to this terminal, never a later mount or a closed tab.
    const defer = (callback: () => void, delay: number) => {
        const terminal = sTermRef.current;
        const timer = window.setTimeout(() => {
            sTimersRef.current.delete(timer);
            if (terminal && sTermRef.current === terminal) callback();
        }, delay);
        sTimersRef.current.add(timer);
    };

    const onSendReSizeInfo = async (aSize: { cols: number; rows: number }) => {
        const signal = sLifetimeRef.current?.signal;
        if (!signal || signal.aborted) return;
        if (aSize.cols > 0 && aSize.rows > 0 && sTermUIDRef.current != null && sWebSocRef.current?.readyState === WebSocket.OPEN) {
            try {
                await postTerminalSize(sTermUIDRef.current, aSize, { signal, canRetryFileRequest: () => !signal.aborted });
            } catch (error) {
                if (!axios.isCancel(error)) throw error;
            }
        }
    };
    const init = async (signal: AbortSignal) => {
        const sResult: any = await getLogin({ signal, canRetryFileRequest: () => !signal.aborted });
        if (signal.aborted || sResult?.reason !== 'success') return;
        const term = document.getElementById('term_view' + pId);
        if (!term) return;

        const sTermId = new Date().getTime();
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const socket = new WebSocket(`${protocol}//${window.location.host}/web/api/term/${sTermId}/data?token=${localStorage.getItem('accessToken')}&shell=${pInfo.shell.id}`);
        sWebSocRef.current = socket;
        const terminal = new Terminal({
            theme: Theme[sCurrentTheme] || Theme.dark,
            fontFamily: '"D2Coding", "Monaco", "Lucida Console", "Courier New","D2Coding", sans-serif, monospace',
            allowProposedApi: true,
            fontSize: DEFAULT_FONT_SIZE,
        });
        sTermRef.current = terminal;
        const fitter = new FitAddon();
        sFitterRef.current = fitter;
        terminal.loadAddon(new WebLinksAddon());
        terminal.loadAddon(new AttachAddon(socket, { bidirectional: true }));
        terminal.loadAddon(fitter);
        terminal.attachCustomKeyEventHandler((event) => {
            if (event.ctrlKey && event.shiftKey && event.keyCode === 67) {
                event.preventDefault();
                document.execCommand('copy');
                return false;
            }
            return true;
        });
        const observer = new ResizeObserver(() => {
            if (selectedTabRef.current !== pId || sTermRef.current !== terminal) return;
            try { fitter.fit(); } catch { /* A hidden tab may have no size yet. */ }
        });
        sObserverRef.current = observer;
        sTermUIDRef.current = sTermId;
        setTermView(terminal);
        terminal.onResize((size) => {
            if (sTermRef.current === terminal) void onSendReSizeInfo(size);
        });
        socket.addEventListener('open', () => {
            setWsStatus('connected');
            defer(() => { try { fitter.fit(); } catch { /* Wait for layout. */ } }, 100);
        }, { signal });
        socket.addEventListener('close', () => {
            setWsStatus('disconnected');
            if (!(socket as any).CUSTOM_CLOSE_CEHCK) terminal.writeln('closed.');
        }, { signal });
        socket.addEventListener('error', () => setWsStatus('disconnected'), { signal });
        socket.addEventListener('message', (message) => {
            if (typeof message.data === 'string' && message.data.replace(/\n|\r|\s*/g, '') === 'closed.') {
                (socket as any).CUSTOM_CLOSE_CEHCK = true;
                setWsStatus('disconnected');
            }
        }, { signal });
        defer(() => {
            try { fitter.fit(); observer.observe(term); } catch { /* Wait for layout. */ }
        }, 400);
    };

    const fitTerminal = () => {
        sFitterRef.current?.fit();
    };

    const loadWebgl = (aTerm: Terminal) => {
        if (sTermRef.current !== aTerm) return;
        try {
            // Dispose existing WebGL addon before creating a new one
            if (sWebglAddonRef.current) {
                sWebglAddonRef.current.dispose();
                sWebglAddonRef.current = null;
            }
            const webglAddon = new WebglAddon();
            webglAddon.onContextLoss(() => {
                if (sTermRef.current !== aTerm || sWebglAddonRef.current !== webglAddon) return;
                webglAddon.dispose();
                sWebglAddonRef.current = null;
            });
            aTerm.loadAddon(webglAddon);
            sWebglAddonRef.current = webglAddon;
        } catch {
            // Fallback to canvas renderer if WebGL is not available
        }
    };

    const wireWkImeFix = (aTerm: Terminal) => {
        if (!isSafari || sImeWiredRef.current) return;
        const ta = (aTerm as any).textarea as HTMLTextAreaElement | null;
        const container = (aTerm as any).element as HTMLElement | null;
        const signal = sLifetimeRef.current?.signal;
        if (!ta || !container || !signal || signal.aborted) return;
        sImeWiredRef.current = true;

        let pending = '';
        const flush = () => {
            if (!pending) return;
            const text = pending;
            pending = '';
            const ws = sWebSocRef.current;
            if (ws && ws.readyState === WebSocket.OPEN) ws.send(text);
        };

        ta.addEventListener(
            'beforeinput',
            (ev: InputEvent) => {
                if (!ev.data) return;
                if (ev.inputType === 'insertReplacementText') {
                    pending = ev.data;
                    ev.preventDefault();
                    ev.stopPropagation();
                    return;
                }
                if (ev.inputType === 'insertText' && [...ev.data].some(isHangulChar)) {
                    flush();
                    pending = ev.data;
                    ev.preventDefault();
                    ev.stopPropagation();
                    return;
                }
                if (pending) flush();
            },
            { capture: true, signal }
        );

        // Capture on container fires before xterm's keydown listener on the textarea,
        // so we flush the pending syllable before xterm forwards Enter/Arrow/etc. to the PTY.
        container.addEventListener(
            'keydown',
            (ev: KeyboardEvent) => {
                if (pending && ev.keyCode !== 229) flush();
            },
            { capture: true, signal }
        );
    };

    const handleShellView = () => {
        const term = document.getElementById('term_view' + pId);
        if (term && sTermView && sTermRef.current === sTermView) {
            if (term_view.current.childNodes.length === 0) {
                sTermView.open(term);
                sTermView.focus();
                wireWkImeFix(sTermView);
                // Wait for DOM layout after open() before fitting
                sFrameRef.current = requestAnimationFrame(() => {
                    sFrameRef.current = null;
                    if (sTermRef.current !== sTermView || selectedTabRef.current !== pId) return;
                    // Only fit if WebSocket is already open; otherwise the open handler will fit
                    if (sWebSocRef.current?.readyState === WebSocket.OPEN) {
                        fitTerminal();
                    }
                    // Load WebGL renderer after terminal is fully rendered
                    defer(() => loadWebgl(sTermView), 300);
                });
                return;
            }

            // Re-fit and reload WebGL renderer when tab becomes active
            sTermView.textarea?.focus();
            fitTerminal();
            loadWebgl(sTermView);
        }
    };

    const handleThemeChange = useCallback(
        (value: string) => {
            const themeKey = value as ThemeKey;
            setCurrentTheme(themeKey);
            if (sTermView) {
                sTermView.options.theme = Theme[themeKey] || {};
            }
        },
        [sTermView]
    );

    const handleFontSizeChange = useCallback(
        (delta: number) => {
            setFontSize((prev: number) => {
                const next = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, prev + delta));
                if (sTermView) {
                    sTermView.options.fontSize = next;
                    sFitterRef.current?.fit();
                }
                return next;
            });
        },
        [sTermView]
    );

    const wsStatusColor = sWsStatus === 'connected' ? '#5ea702' : sWsStatus === 'connecting' ? '#cfae00' : '#d81e00';
    const wsStatusLabel = sWsStatus === 'connected' ? 'Connected' : sWsStatus === 'connecting' ? 'Connecting' : 'Disconnected';

    useEffect(() => {
        const lifetime = new AbortController();
        sLifetimeRef.current = lifetime;
        const dispose = () => {
            lifetime.abort();
            for (const timer of sTimersRef.current) window.clearTimeout(timer);
            sTimersRef.current.clear();
            if (sFrameRef.current !== null) cancelAnimationFrame(sFrameRef.current);
            sFrameRef.current = null;
            sObserverRef.current?.disconnect();
            sObserverRef.current = null;
            const terminal = sTermRef.current, socket = sWebSocRef.current;
            sTermRef.current = null;
            sWebSocRef.current = null;
            sFitterRef.current = null;
            sWebglAddonRef.current = null;
            sTermUIDRef.current = undefined;
            sImeWiredRef.current = false;
            // xterm owns its loaded addons and resize subscription; dispose them once here.
            try { terminal?.dispose(); } finally { socket?.close(); }
        };
        void init(lifetime.signal).catch(() => {
            if (!lifetime.signal.aborted) { dispose(); setWsStatus('disconnected'); }
        });
        return dispose;
    }, []);
    useEffect(() => {
        if (pSelectedTab === pId && sTermView) handleShellView();
    }, [sTermView, pSelectedTab]);

    return (
        <Page>
            {pType !== 'bottom' ? (
                <Page.Header>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <GoDotFill size={10} style={{ color: wsStatusColor }} />
                        <span style={{ fontSize: '12px', color: '#9a9ba0' }}>{wsStatusLabel}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Dropdown.Root options={THEME_OPTIONS} value={sCurrentTheme} onChange={handleThemeChange}>
                            <Dropdown.Trigger />
                            <Dropdown.Menu>
                                <Dropdown.List />
                            </Dropdown.Menu>
                        </Dropdown.Root>
                        <Button size="icon" variant="ghost" onClick={() => handleFontSizeChange(-1)} style={{ fontSize: '12px', fontWeight: 700 }}>
                            A-
                        </Button>
                        <span style={{ fontSize: '11px', color: '#9a9ba0', minWidth: '24px', textAlign: 'center', fontVariantNumeric: 'tabular-nums', lineHeight: '28px' }}>
                            {sFontSize}
                        </span>
                        <Button size="icon" variant="ghost" onClick={() => handleFontSizeChange(1)} style={{ fontSize: '12px', fontWeight: 700 }}>
                            A+
                        </Button>
                    </div>
                </Page.Header>
            ) : null}
            <div ref={term_view} id={'term_view' + pId} style={pType === 'bottom' ? { height: 'calc(100% - 1px)' } : { height: 'calc(100% - 40px)' }} />
        </Page>
    );
};

export default Shell;
