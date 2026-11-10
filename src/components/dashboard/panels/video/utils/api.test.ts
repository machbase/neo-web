import { findVideoServer, getMediaServerBaseUrl, resolveCameraWebRtcUrl } from './api';

const server = { alias: 'camera-server', ip: '192.0.2.20', port: 8001 };

describe('Blackbox addresses', () => {
    it('uses the latest registered address and port for an existing panel', () => {
        expect(getMediaServerBaseUrl(server)).toBe('http://192.0.2.20:8001');
    });

    it('uses the Neo hostname only when opted in', () => {
        expect(getMediaServerBaseUrl({ ...server, useNeoHost: true })).toBe('http://localhost:8001');
    });

    it('updates a generated WHEP hostname without changing its port or camera path', () => {
        expect(resolveCameraWebRtcUrl({
            rtsp_path: 'camera-a',
            webrtc_url: 'http://192.0.2.10:8889/camera-a/whep',
        }, 'http://192.0.2.20:8001')).toBe('http://192.0.2.20:8889/camera-a/whep');
    });

    it('preserves a separately supplied media URL', () => {
        const webrtc_url = 'https://media.example/stream/whep';
        expect(resolveCameraWebRtcUrl({ rtsp_path: 'camera-a', webrtc_url }, 'http://192.0.2.20:8001')).toBe(webrtc_url);
    });
});

describe('Blackbox server identity', () => {
    const panel = { serverId: 'server-b', serverAlias: 'B', serverIp: '192.0.2.20', serverPort: 8000 };
    const other = { id: 'server-a', alias: 'B', ip: '192.0.2.10', port: 8000 };
    const renamed = {
        id: 'server-b', alias: 'B-new', ip: '192.0.2.30', port: 8001,
        previousAddresses: [{ alias: 'B', ip: '192.0.2.20', port: 8000 }],
    };

    it('keeps the original server after its name and address change', () => {
        expect(findVideoServer(panel.serverId, [other, renamed])).toBe(renamed);
    });

    it('leaves a legacy panel unconnected even when its saved address matches', () => {
        const { serverId: _, ...legacy } = panel;
        expect(findVideoServer(undefined, [other, renamed, { id: 'reused', alias: legacy.serverAlias, ip: legacy.serverIp, port: legacy.serverPort }])).toBeUndefined();
    });

    it('does not rebind a deleted ID to a server that reused its name', () => {
        expect(findVideoServer(panel.serverId, [other])).toBeUndefined();
    });
});
