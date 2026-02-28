// Live Mode Hook - WebRTC WHEP streaming

import { useRef, useCallback, useState } from 'react';
import { getCamera } from '@/api/repository/mediaSvr';

interface LiveModeState {
    isLive: boolean;
    isConnecting: boolean;
    error: string | null;
}

export function useLiveMode(videoRef: React.RefObject<HTMLVideoElement>, cameraId: string | null, onStatusChange?: (status: string, isError?: boolean) => void, baseUrl?: string) {
    const [state, setState] = useState<LiveModeState>({
        isLive: false,
        isConnecting: false,
        error: null,
    });

    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

    // Start live mode via WebRTC WHEP
    const startLive = useCallback(async () => {
        if (state.isLive || state.isConnecting || !videoRef.current) return;

        if (!cameraId) {
            // console.error('[LIVE] No camera selected');
            onStatusChange?.('No camera selected', true);
            setState({ isLive: false, isConnecting: false, error: 'No camera selected' });
            return;
        }

        console.log('[LIVE] Starting WebRTC live mode via WHEP for camera:', cameraId);
        setState({ isLive: false, isConnecting: true, error: null });
        onStatusChange?.('Connecting WebRTC...');

        try {
            // Fetch camera detail to get webrtc_url
            const cameraRes = await getCamera(cameraId, baseUrl);
            const webrtcUrl = cameraRes?.data?.webrtc_url;

            if (!webrtcUrl) {
                throw new Error(`Camera "${cameraId}" has no webrtc_url configured`);
            }

            console.log('[LIVE] Using webrtc_url from camera config:', webrtcUrl);

            // Create RTCPeerConnection
            const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
            });

            peerConnectionRef.current = pc;

            // Add transceivers for receiving media
            pc.addTransceiver('video', { direction: 'recvonly' });
            pc.addTransceiver('audio', { direction: 'recvonly' });

            // Handle incoming video track
            pc.ontrack = (event) => {
                console.log('[LIVE] WebRTC track received:', event.track.kind);
                if (event.track.kind === 'video' && videoRef.current) {
                    const video = videoRef.current;
                    video.srcObject = event.streams[0];

                    const playWhenReady = () => {
                        video
                            .play()
                            .then(() => {
                                console.log('[LIVE] WebRTC playback started');
                                onStatusChange?.('Playing live stream (WebRTC)');
                            })
                            .catch((err) => {
                                // console.error('[LIVE] Play failed:', err);
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
                console.log('[LIVE] ICE connection state:', pc.iceConnectionState);
                if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
                    onStatusChange?.('WebRTC connection lost', true);
                    setState((prev) => ({ ...prev, error: 'Connection lost' }));
                }
            };

            // Create offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            // Wait for ICE gathering to complete
            console.log('[LIVE] Waiting for ICE gathering...');
            await new Promise<void>((resolve) => {
                if (pc.iceGatheringState === 'complete') {
                    resolve();
                } else {
                    const handler = () => {
                        if (pc.iceGatheringState === 'complete') {
                            pc.removeEventListener('icegatheringstatechange', handler);
                            resolve();
                        }
                    };
                    pc.addEventListener('icegatheringstatechange', handler);
                }
            });
            console.log('[LIVE] ICE gathering complete');

            // Send offer via WHEP protocol using camera's webrtc_url
            console.log('[LIVE] Sending WHEP offer to:', webrtcUrl);

            const response = await fetch(webrtcUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/sdp' },
                body: pc.localDescription?.sdp,
            });

            if (!response.ok) {
                const responseText = await response.text();
                throw new Error(`WHEP request failed: ${response.status}. ${responseText}`);
            }

            // Get answer from Mediamtx
            const answerSdp = await response.text();
            await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

            console.log('[LIVE] WebRTC connection established');
            setState({ isLive: true, isConnecting: false, error: null });
        } catch (err: any) {
            // console.error('[LIVE] Failed to start WebRTC:', err);
            const errorMessage = `WebRTC start failed: ${err.message}`;
            onStatusChange?.(errorMessage, true);
            setState({ isLive: false, isConnecting: false, error: errorMessage });
            stopLive();
        }
    }, [state.isLive, state.isConnecting, videoRef, cameraId, onStatusChange, baseUrl]);

    // Stop live mode
    const stopLive = useCallback(() => {
        if (!state.isLive && !state.isConnecting) return;

        console.log('[LIVE] Stopping WebRTC live mode');

        // Close WebRTC PeerConnection
        if (peerConnectionRef.current) {
            try {
                peerConnectionRef.current.close();
                console.log('[LIVE] WebRTC connection closed');
            } catch (err) {
                console.warn('[LIVE] Error closing WebRTC:', err);
            }
            peerConnectionRef.current = null;
        }

        // Clear video srcObject
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        setState({ isLive: false, isConnecting: false, error: null });
        onStatusChange?.('Recording mode');
    }, [state.isLive, state.isConnecting, videoRef, onStatusChange]);

    // Toggle live mode
    const toggleLive = useCallback(() => {
        if (state.isLive) {
            stopLive();
        } else {
            startLive();
        }
    }, [state.isLive, startLive, stopLive]);

    return {
        ...state,
        startLive,
        stopLive,
        toggleLive,
    };
}
