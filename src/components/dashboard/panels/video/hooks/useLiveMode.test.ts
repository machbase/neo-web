import { act, renderHook, waitFor } from '@testing-library/react';
import { getCamera } from '@/api/repository/mediaSvr';
import { useLiveMode } from './useLiveMode';

jest.mock('@/api/repository/mediaSvr', () => ({
    getCamera: jest.fn(),
}));

class MockRTCPeerConnection {
    static instances: MockRTCPeerConnection[] = [];

    iceGatheringState = 'complete';
    iceConnectionState = 'connected';
    localDescription: RTCSessionDescriptionInit | null = null;
    ontrack: ((event: RTCTrackEvent) => void) | null = null;
    oniceconnectionstatechange: (() => void) | null = null;

    addTransceiver = jest.fn();
    addEventListener = jest.fn();
    removeEventListener = jest.fn();
    createOffer = jest.fn(async () => ({ type: 'offer' as RTCSdpType, sdp: 'offer-sdp' }));
    setLocalDescription = jest.fn(async (description: RTCSessionDescriptionInit) => {
        this.localDescription = description;
    });
    setRemoteDescription = jest.fn(async () => {});
    close = jest.fn();

    constructor() {
        MockRTCPeerConnection.instances.push(this);
    }
}

describe('useLiveMode', () => {
    const getCameraMock = getCamera as jest.Mock;
    let originalRTCPeerConnection: typeof RTCPeerConnection | undefined;
    let originalFetch: typeof fetch | undefined;

    beforeEach(() => {
        MockRTCPeerConnection.instances = [];
        originalRTCPeerConnection = global.RTCPeerConnection;
        originalFetch = global.fetch;
        (global as any).RTCPeerConnection = MockRTCPeerConnection;
        (global as any).fetch = jest.fn(async () => ({
            ok: true,
            text: async () => 'answer-sdp',
        }));
        getCameraMock.mockResolvedValue({ data: { webrtc_url: 'http://media.example/whep' } });
    });

    afterEach(() => {
        (global as any).RTCPeerConnection = originalRTCPeerConnection;
        (global as any).fetch = originalFetch;
        jest.clearAllMocks();
    });

    it('restarts an active live connection by closing the old peer and opening a new one', async () => {
        const video = document.createElement('video');
        video.play = jest.fn(async () => {});
        const videoRef = { current: video } as React.RefObject<HTMLVideoElement>;

        const { result } = renderHook(() => useLiveMode(videoRef, 'camera-a', undefined, 'http://server.example'));

        await act(async () => {
            await result.current.startLive();
        });

        await waitFor(() => expect(result.current.isLive).toBe(true));
        expect(MockRTCPeerConnection.instances).toHaveLength(1);

        const firstConnection = MockRTCPeerConnection.instances[0];

        await act(async () => {
            await result.current.restartLive();
        });

        await waitFor(() => expect(MockRTCPeerConnection.instances).toHaveLength(2));
        expect(firstConnection.close).toHaveBeenCalledTimes(1);
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });
});
