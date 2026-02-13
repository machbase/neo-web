import './Shell.scss';
import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { AttachAddon } from 'xterm-addon-attach';
import { WebglAddon } from 'xterm-addon-webgl';
import { postTerminalSize } from '../../api/repository/machiot';
import { getLogin } from '@/api/repository/login';
import Theme from '@/assets/ts/xtermTheme';
import { Page } from '@/design-system/components';

interface ShellProps {
    pId: string;
    pInfo: any;
    pSelectedTab: string;
    pType?: string;
    pWidth?: any;
}

export const Shell = ({ pId, pInfo, pType, pSelectedTab, pWidth }: ShellProps) => {
    // ref ele
    const term_view: Element | any = useRef();
    const [sTermUID, setTermUID] = useState<any>(undefined);
    const [sTermView, setTermView] = useState<any>(undefined);
    const [sTermFitter, setTermFitter] = useState<any>(undefined);
    // web socket
    let sWebSoc: any = null;
    // fitter
    let sFitter: any = null;
    // temr id
    let sTermId: any = null;
    let sTheme: any = Theme['dark'];
    if (pInfo.shell.theme && pInfo.shell.theme !== 'default') {
        const sData: 'gray' | 'indigo' | 'ollie' | 'warmNeon' | 'galaxy' | 'white' | 'dark' = pInfo.shell.theme;
        sTheme = Theme[sData];
    }

    const sTerm = new Terminal({
        theme: sTheme,
        fontFamily: '"D2Coding", "Monaco", "Lucida Console", "Courier New","D2Coding", sans-serif, monospace',
        allowProposedApi: true,
        fontSize: 14,
    });
    const onSendReSizeInfo = async (aSize: { cols: number; rows: number }) => {
        if (aSize.cols > 11 && aSize.rows > 5) {
            await postTerminalSize(sTermUID, aSize);
        }
    };
    const sResizeObserver = new ResizeObserver(() => {
        try {
            if (pSelectedTab === pId) {
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
                setTermUID(sTermId);
                setTermView(sTerm);

                // Re-send terminal size after WebSocket is fully connected
                sWebSoc.addEventListener('open', () => {
                    setTimeout(() => {
                        try {
                            sFitter && sFitter.fit();
                            const dims = sFitter?.proposeDimensions?.();
                            console.log('[Shell] open handler - dims:', dims, 'termId:', sTermId);
                            if (dims && dims.cols > 11 && dims.rows > 5) {
                                postTerminalSize(sTermId, dims);
                            }
                        } catch (err) {
                            console.log(err);
                        }
                    }, 100);
                });
                // Socket connection lost (client side)
                sWebSoc.addEventListener('close', () => {
                    if (sTerm) {
                        !sWebSoc['CUSTOM_CLOSE_CEHCK'] && sTerm.writeln('closed.');
                    }
                });
                // Socket connection lost (server side)
                sWebSoc.addEventListener('message', (message: any) => {
                    if (typeof message.data === 'string') {
                        const sParsedMsg = message.data.replace(/\n|\r|\s*/g, '');
                        if (sParsedMsg === 'closed.') sWebSoc['CUSTOM_CLOSE_CEHCK'] = true;
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

    const fitAndSendSize = (retries = 5) => {
        if (!sTermFitter || !sTermUID) return;
        sTermFitter.fit();
        const dims = sTermFitter.proposeDimensions?.();
        if (dims && dims.cols > 11 && dims.rows > 5) {
            postTerminalSize(sTermUID, dims);
        } else if (retries > 0) {
            setTimeout(() => fitAndSendSize(retries - 1), 100);
        }
    };

    const handleShellView = () => {
        const term = document.getElementById('term_view' + pId);
        if (term && sTermView) {
            if (term_view.current.childNodes.length === 0) {
                sTermView.open(term);
                sTermView.focus();
                sTermView.onResize((aSize: { cols: number; rows: number }) => {
                    onSendReSizeInfo(aSize);
                });
                // Wait for DOM layout after open() before fitting
                requestAnimationFrame(() => {
                    fitAndSendSize();
                    // Load WebGL renderer after terminal is fully rendered
                    setTimeout(() => {
                        try {
                            const webglAddon = new WebglAddon();
                            webglAddon.onContextLoss(() => {
                                webglAddon.dispose();
                            });
                            sTermView.loadAddon(webglAddon);
                        } catch {
                            // Fallback to canvas renderer if WebGL is not available
                        }
                    }, 300);
                });
                return;
            }

            fitAndSendSize();
            setTimeout(() => sTermView.textarea?.focus(), 50);
        }
    };

    useEffect(() => {
        init();
        return () => {
            sWebSoc && sWebSoc.close();
        };
    }, []);
    useEffect(() => {
        if (pWidth !== 0 && pSelectedTab === pId && sTermView) handleShellView();
    }, [sTermView, pSelectedTab, pWidth]);

    return (
        <Page>
            {pType !== 'bottom' ? <Page.Header /> : null}
            <div ref={term_view} id={'term_view' + pId} style={pType === 'bottom' ? { height: 'calc(100% - 1px)' } : { height: 'calc(100% - 40px)' }} />
        </Page>
    );
};

export default Shell;
