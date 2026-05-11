// Live Mode Hook - WebRTC WHEP streaming

import { useRef, useCallback, useState } from 'react';
import { getCamera } from '@/api/repository/mediaSvr';

interface LiveModeState {
    isLive: boolean;
    isConnecting: boolean;
    error: string | null;
}

const INITIAL_LIVE_MODE_STATE: LiveModeState = {
    isLive: false,
    isConnecting: false,
    error: null,
};

export function useLiveMode(videoRef: React.RefObject<HTMLVideoElement>, cameraId: string | null, onStatusChange?: (status: string, isError?: boolean) => void, baseUrl?: string) {
    const [state, setState] = useState<LiveModeState>(INITIAL_LIVE_MODE_STATE);

    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const connectionTokenRef = useRef(0);
    const stateRef = useRef<LiveModeState>(INITIAL_LIVE_MODE_STATE);

    const setLiveState = useCallback((nextState: LiveModeState | ((prev: LiveModeState) => LiveModeState)) => {
        if (typeof nextState === 'function') {
            setState((prev) => {
                const resolvedState = nextState(prev);
                stateRef.current = resolvedState;
                return resolvedState;
            });
            return;
        }

        stateRef.current = nextState;
        setState(nextState);
    }, []);

    const closePeerConnection = useCallback((pc: RTCPeerConnection | null) => {
        if (!pc) return;

        try {
            pc.close();
            console.log('[LIVE] WebRTC connection closed');
        } catch (err) {
            console.warn('[LIVE] Error closing WebRTC:', err);
        }
    }, []);

    const closeLiveResources = useCallback(() => {
        closePeerConnection(peerConnectionRef.current);
        peerConnectionRef.current = null;

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, [closePeerConnection, videoRef]);

    const openLiveConnection = useCallback(
        async ({ forceRestart = false }: { forceRestart?: boolean } = {}) => {
            if (!videoRef.current) return;

            const currentState = stateRef.current;
            if (!forceRestart && (currentState.isLive || currentState.isConnecting)) return;

            const connectionToken = ++connectionTokenRef.current;

            if (forceRestart) {
                closeLiveResources();
            }

            const isStaleConnection = (pc?: RTCPeerConnection | null) => connectionTokenRef.current !== connectionToken || (!!pc && peerConnectionRef.current !== pc);

            if (!cameraId) {
                onStatusChange?.('No camera selected', true);
                setLiveState({ isLive: false, isConnecting: false, error: 'No camera selected' });
                return;
            }

            console.log('[LIVE] Starting WebRTC live mode via WHEP for camera:', cameraId);
            setLiveState({ isLive: false, isConnecting: true, error: null });
            onStatusChange?.('Connecting WebRTC...');

            let pc: RTCPeerConnection | null = null;

            try {
                // Fetch camera detail to get webrtc_url
                const cameraRes = await getCamera(cameraId, baseUrl);
                if (isStaleConnection()) return;

                const webrtcUrl = cameraRes?.data?.webrtc_url;

                if (!webrtcUrl) {
                    throw new Error(`Camera "${cameraId}" has no webrtc_url configured`);
                }

                console.log('[LIVE] Using webrtc_url from camera config:', webrtcUrl);

                // Create RTCPeerConnection
                pc = new RTCPeerConnection({
                    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
                });

                peerConnectionRef.current = pc;

                // Add transceivers for receiving media
                pc.addTransceiver('video', { direction: 'recvonly' });
                pc.addTransceiver('audio', { direction: 'recvonly' });

                // Handle incoming video track
                pc.ontrack = (event) => {
                    if (!pc || isStaleConnection(pc)) return;
                    console.log('[LIVE] WebRTC track received:', event.track.kind);
                    if (event.track.kind === 'video' && videoRef.current) {
                        const video = videoRef.current;
                        video.srcObject = event.streams[0];

                        const playWhenReady = () => {
                            if (!pc || isStaleConnection(pc)) return;
                            video
                                .play()
                                .then(() => {
                                    if (!pc || isStaleConnection(pc)) return;
                                    console.log('[LIVE] WebRTC playback started');
                                    onStatusChange?.('Playing live stream (WebRTC)');
                                })
                                .catch(() => {
                                    if (!pc || isStaleConnection(pc)) return;
                                    onStatusChange?.('Playback failed', true);
                                });
                        };

                        // Wait for canplay before calling play() to avoid AbortError
                        // caused by the load triggered by setting srcObject
                        if (video.readyState >= 3) {
                            playWhenReady();
                        } else {
                            video.addEventListener('canplay', playWhenReady, { once: true });
                        }
                    }
                };

                // ICE connection state monitoring
                pc.oniceconnectionstatechange = () => {
                    if (!pc || isStaleConnection(pc)) return;
                    console.log('[LIVE] ICE connection state:', pc.iceConnectionState);
                    if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
                        onStatusChange?.('WebRTC connection lost', true);
                        setLiveState((prev) => ({ ...prev, error: 'Connection lost' }));
                    }
                };

                // Create offer
                const offer = await pc.createOffer();
                if (isStaleConnection(pc)) return;
                await pc.setLocalDescription(offer);
                if (isStaleConnection(pc)) return;

                // Wait for ICE gathering to complete
                console.log('[LIVE] Waiting for ICE gathering...');
                await new Promise<void>((resolve) => {
                    if (!pc || pc.iceGatheringState === 'complete') {
                        resolve();
                    } else {
                        const handler = () => {
                            if (!pc || pc.iceGatheringState === 'complete') {
                                pc?.removeEventListener('icegatheringstatechange', handler);
                                resolve();
                            }
                        };
                        pc.addEventListener('icegatheringstatechange', handler);
                    }
                });
                if (isStaleConnection(pc)) return;
                console.log('[LIVE] ICE gathering complete');

                // Send offer via WHEP protocol using camera's webrtc_url
                console.log('[LIVE] Sending WHEP offer to:', webrtcUrl);

                const response = await fetch(webrtcUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/sdp' },
                    body: pc.localDescription?.sdp,
                });
                if (isStaleConnection(pc)) return;

                if (!response.ok) {
                    const responseText = await response.text();
                    throw new Error(`WHEP request failed: ${response.status}. ${responseText}`);
                }

                // Get answer from Mediamtx
                const answerSdp = await response.text();
                if (isStaleConnection(pc)) return;
                await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
                if (isStaleConnection(pc)) return;

                console.log('[LIVE] WebRTC connection established');
                setLiveState({ isLive: true, isConnecting: false, error: null });
            } catch (err: any) {
                if (connectionTokenRef.current !== connectionToken) {
                    closePeerConnection(pc);
                    return;
                }

                const errorMessage = `WebRTC start failed: ${err.message}`;
                onStatusChange?.(errorMessage, true);
                setLiveState({ isLive: false, isConnecting: false, error: errorMessage });
                closeLiveResources();
            }
        },
        [baseUrl, cameraId, closeLiveResources, closePeerConnection, onStatusChange, setLiveState, videoRef],
    );

    // Start live mode via WebRTC WHEP
    const startLive = useCallback(async () => {
        await openLiveConnection();
    }, [openLiveConnection]);

    // Stop live mode
    const stopLive = useCallback(() => {
        const currentState = stateRef.current;
        if (!currentState.isLive && !currentState.isConnecting && !peerConnectionRef.current) return;

        console.log('[LIVE] Stopping WebRTC live mode');

        connectionTokenRef.current += 1;
        closeLiveResources();
        setLiveState({ isLive: false, isConnecting: false, error: null });
        onStatusChange?.('Recording mode');
    }, [closeLiveResources, onStatusChange, setLiveState]);

    const restartLive = useCallback(async () => {
        await openLiveConnection({ forceRestart: true });
    }, [openLiveConnection]);

    // Toggle live mode
    const toggleLive = useCallback(() => {
        if (state.isLive || state.isConnecting) {
            stopLive();
        } else {
            startLive();
        }
    }, [state.isLive, state.isConnecting, startLive, stopLive]);

    return {
        ...state,
        startLive,
        stopLive,
        restartLive,
        toggleLive,
    };
}
