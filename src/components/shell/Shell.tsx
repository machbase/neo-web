import './Shell.scss';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { AttachAddon } from 'xterm-addon-attach';
import { WebglAddon } from 'xterm-addon-webgl';
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
    const [sTermFitter, setTermFitter] = useState<any>(undefined);
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
    // web socket
    let sWebSoc: any = null;
    // fitter
    let sFitter: any = null;
    // temr id
    let sTermId: any = null;
    let sTheme: any = Theme[sCurrentTheme] || Theme['dark'];

    const onSendReSizeInfo = async (aSize: { cols: number; rows: number }) => {
        if (aSize.cols > 0 && aSize.rows > 0 && sTermUIDRef.current != null && sWebSocRef.current?.readyState === WebSocket.OPEN) {
            await postTerminalSize(sTermUIDRef.current, aSize);
        }
    };
    const sResizeObserver = new ResizeObserver(() => {
        try {
            if (selectedTabRef.current === pId) {
                sFitter && sFitter.fit();
            }
        } catch (err) {
            console.log(err);
        }
    });
    const init = async () => {
        const sResult: any = await getLogin();
        if (sResult?.reason === 'success') {
            const term = document.getElementById('term_view' + pId);
            sTermId = new Date().getTime();

            if (window.location.protocol.indexOf('https') === -1) {
                sWebSoc = new WebSocket(`ws://${window.location.host}/web/api/term/${sTermId}/data?token=${localStorage.getItem('accessToken')}${'&shell=' + pInfo.shell.id}`);
            } else {
                sWebSoc = new WebSocket(`wss://${window.location.host}/web/api/term/${sTermId}/data?token=${localStorage.getItem('accessToken')}${'&shell=' + pInfo.shell.id}`);
            }

            const sTerm = new Terminal({
                theme: sTheme,
                fontFamily: '"D2Coding", "Monaco", "Lucida Console", "Courier New","D2Coding", sans-serif, monospace',
                allowProposedApi: true,
                fontSize: 14,
            });

            if (term) {
                sFitter = new FitAddon();
                sTerm.loadAddon(new WebLinksAddon());
                sTerm.loadAddon(new AttachAddon(sWebSoc, { bidirectional: true }));
                sTerm.loadAddon(sFitter);

                sTerm.attachCustomKeyEventHandler((event) => {
                    if (event.ctrlKey && event.shiftKey && event.keyCode == 67) {
                        event.preventDefault();

                        document.execCommand('copy');
                        return false;
                    } else {
                        return true;
                    }
                });

                setTermFitter(sFitter);
                sTermUIDRef.current = sTermId;
                setTermView(sTerm);
                sWebSocRef.current = sWebSoc;

                // Register resize handler once on terminal instance
                sTerm.onResize((aSize: { cols: number; rows: number }) => {
                    onSendReSizeInfo(aSize);
                });

                // Fit terminal after WebSocket is fully connected
                sWebSoc.addEventListener('open', () => {
                    setWsStatus('connected');
                    setTimeout(() => {
                        try {
                            sFitter && sFitter.fit();
                        } catch (err) {
                            console.log(err);
                        }
                    }, 100);
                });
                // Socket connection lost (client side)
                sWebSoc.addEventListener('close', () => {
                    setWsStatus('disconnected');
                    if (sTerm) {
                        !sWebSoc['CUSTOM_CLOSE_CEHCK'] && sTerm.writeln('closed.');
                    }
                });
                // Socket error (network failure, etc.)
                sWebSoc.addEventListener('error', () => {
                    setWsStatus('disconnected');
                });
                // Socket connection lost (server side)
                sWebSoc.addEventListener('message', (message: any) => {
                    if (typeof message.data === 'string') {
                        const sParsedMsg = message.data.replace(/\n|\r|\s*/g, '');
                        if (sParsedMsg === 'closed.') {
                            sWebSoc['CUSTOM_CLOSE_CEHCK'] = true;
                            setWsStatus('disconnected');
                        }
                    }
                });

                setTimeout(() => {
                    try {
                        sFitter && sFitter.fit();
                        sResizeObserver.observe(term);
                    } catch (err) {
                        console.log(err);
                    }
                }, 400);
            }
        }
    };

    const fitTerminal = () => {
        if (!sTermFitter) return;
        sTermFitter.fit();
    };

    const loadWebgl = (aTerm: Terminal) => {
        try {
            // Dispose existing WebGL addon before creating a new one
            if (sWebglAddonRef.current) {
                sWebglAddonRef.current.dispose();
                sWebglAddonRef.current = null;
            }
            const webglAddon = new WebglAddon();
            webglAddon.onContextLoss(() => {
                webglAddon.dispose();
                sWebglAddonRef.current = null;
            });
            aTerm.loadAddon(webglAddon);
            sWebglAddonRef.current = webglAddon;
        } catch {
            // Fallback to canvas renderer if WebGL is not available
        }
    };

    const handleShellView = () => {
        const term = document.getElementById('term_view' + pId);
        if (term && sTermView) {
            if (term_view.current.childNodes.length === 0) {
                sTermView.open(term);
                sTermView.focus();
                // Wait for DOM layout after open() before fitting
                requestAnimationFrame(() => {
                    // Only fit if WebSocket is already open; otherwise the open handler will fit
                    if (sWebSocRef.current?.readyState === WebSocket.OPEN) {
                        fitTerminal();
                    }
                    // Load WebGL renderer after terminal is fully rendered
                    setTimeout(() => {
                        loadWebgl(sTermView);
                    }, 300);
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
                    sTermFitter?.fit();
                }
                return next;
            });
        },
        [sTermView, sTermFitter]
    );

    const wsStatusColor = sWsStatus === 'connected' ? '#5ea702' : sWsStatus === 'connecting' ? '#cfae00' : '#d81e00';
    const wsStatusLabel = sWsStatus === 'connected' ? 'Connected' : sWsStatus === 'connecting' ? 'Connecting' : 'Disconnected';

    useEffect(() => {
        init();
        return () => {
            sWebSocRef.current && sWebSocRef.current.close();
        };
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
