import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { AttachAddon } from 'xterm-addon-attach';
import { WebglAddon } from 'xterm-addon-webgl';
import { postTerminalSize } from '../../api/repository/machiot';
import Theme from '@/assets/ts/xtermTheme';

import './Shell.scss';
import { useRecoilState } from 'recoil';
import { gSelectedTab } from '@/recoil/recoil';

interface ShellProps {
    pId: string;
    pInfo: any;
}

export const Shell = ({ pId, pInfo }: ShellProps) => {
    // ref ele
    const term_view: Element | any = useRef();
    // web socket
    let sWebSoc: any = null;
    // fitter
    let sFitter: any = null;
    // term
    // let sTerm: any = null;
    // temr id
    let sTermId: any = null;

    const [sSelectedTab] = useRecoilState<any>(gSelectedTab);

    let sTheme: any = Theme['dark'];
    if (pInfo.shell.theme && pInfo.shell.theme !== 'default') {
        const sData: 'gray' | 'ollie' | 'warmNeon' | 'galaxy' | 'white' | 'dark' = pInfo.shell.theme;
        sTheme = Theme[sData];
    }

    const sTerm = new Terminal({
        theme: sTheme,
        fontFamily: '"D2Coding", "Monaco", "Lucida Console", "Courier New","D2Coding", sans-serif, monospace',
        allowProposedApi: true,
        fontSize: 16,
    });

    const onSendReSizeInfo = async (aSize: { cols: number; rows: number }) => {
        await postTerminalSize(sTermId, aSize);
    };

    const sResizeObserver = new ResizeObserver(() => {
        try {
            if (sSelectedTab === pId) {
                sFitter && sFitter.fit();
            }
        } catch (err) {
            console.log(err);
        }
    });

    const init = () => {
        const term = document.getElementById('term_view' + pId);
        sTermId = new Date().getTime();

        if (window.location.protocol.indexOf('https') === -1) {
            sWebSoc = new WebSocket(`ws://${window.location.host}/web/api/term/${sTermId}/data?token=${localStorage.getItem('accessToken')}${'&shell=' + pInfo.shell.id}`);
        } else {
            sWebSoc = new WebSocket(`wss://${window.location.host}/web/api/term/${sTermId}/data?token=${localStorage.getItem('accessToken')}${'&shell=' + pInfo.shell.id}`);
        }

        if (term) {
            sFitter = new FitAddon();
            sTerm.loadAddon(new WebglAddon());
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

            sTerm.open(term);
            sTerm.focus();

            sTerm.onResize((aSize: { cols: number; rows: number }) => {
                onSendReSizeInfo(aSize);
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
    };
    useEffect(() => {
        init();

        return () => {
            sWebSoc.close();
        };
    }, []);

    return (
        <div style={{ height: '100%', width: '100%' }}>
            <div style={{ height: '40px' }}></div>
            <div ref={term_view} id={'term_view' + pId} style={{ height: 'calc(100% - 40px)', width: '100%' }}></div>
        </div>
    );
};

export default Shell;
