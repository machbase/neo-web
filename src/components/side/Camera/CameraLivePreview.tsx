// Live video preview component using WebRTC WHEP protocol
// Renders a Button; clicking it opens a Modal with the live stream

import { useRef, useEffect, useState } from 'react';
import { Badge, Button, Modal, TextHighlight } from '@/design-system/components';

type CameraLivePreviewProps = {
    webrtcUrl?: string;
};

// Internal component: mounts inside Modal, handles WebRTC lifecycle
const LiveVideoContent = ({ webrtcUrl }: { webrtcUrl?: string }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const [status, setStatus] = useState<'idle' | 'connecting' | 'live' | 'error'>('idle');

    useEffect(() => {
        let cancelled = false;

        const cleanup = () => {
            if (pcRef.current) {
                pcRef.current.close();
                pcRef.current = null;
            }
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
        };

        if (!webrtcUrl || !videoRef.current) {
            cleanup();
            if (!cancelled) setStatus('idle');
            return cleanup;
        }

        cleanup();

        const connect = async () => {
            if (!cancelled) setStatus('connecting');

            try {
                const pc = new RTCPeerConnection({
                    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
                });
                pcRef.current = pc;

                pc.addTransceiver('video', { direction: 'recvonly' });
                pc.addTransceiver('audio', { direction: 'recvonly' });

                pc.ontrack = (event) => {
                    if (event.track.kind === 'video' && videoRef.current) {
                        const video = videoRef.current;
                        video.srcObject = event.streams[0];

                        const playWhenReady = () => {
                            video
                                .play()
                                .then(() => {
                                    if (!cancelled) setStatus('live');
                                })
                                .catch(() => {
                                    if (!cancelled) setStatus('error');
                                });
                        };

                        if (video.readyState >= 3) {
                            playWhenReady();
                        } else {
                            video.addEventListener('canplay', playWhenReady, { once: true });
                        }
                    }
                };

                pc.oniceconnectionstatechange = () => {
                    if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
                        if (!cancelled) setStatus('error');
                    }
                };

                const offer = await pc.createOffer();
                if (cancelled) return;
                await pc.setLocalDescription(offer);

                // Wait for ICE gathering to complete
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
                if (cancelled) return;

                // WHEP handshake
                const response = await fetch(webrtcUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/sdp' },
                    body: pc.localDescription?.sdp,
                });

                if (!response.ok) {
                    throw new Error(`WHEP failed: ${response.status}`);
                }

                const answerSdp = await response.text();
                if (cancelled) return;
                await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
            } catch (err) {
                // console.error('[CameraLivePreview] Connection failed:', err);
                if (!cancelled) setStatus('error');
            }
        };

        connect();

        return () => {
            cancelled = true;
            cleanup();
        };
    }, [webrtcUrl]);

    return (
        <div
            style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '16/9',
                backgroundColor: '#000',
                borderRadius: '4px',
                overflow: 'hidden',
            }}
        >
            <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'contain' }} />

            {!webrtcUrl && (
                <div style={overlayStyle}>
                    <TextHighlight variant="muted" style={{ fontSize: '11px' }}>
                        No stream available
                    </TextHighlight>
                </div>
            )}

            {webrtcUrl && status === 'connecting' && (
                <div style={overlayStyle}>
                    <TextHighlight variant="muted" style={{ fontSize: '11px' }}>
                        Connecting...
                    </TextHighlight>
                </div>
            )}

            {webrtcUrl && status === 'error' && (
                <div style={overlayStyle}>
                    <TextHighlight variant="muted" style={{ fontSize: '11px' }}>
                        Connection failed
                    </TextHighlight>
                </div>
            )}
        </div>
    );
};

export const CameraLivePreview = ({ webrtcUrl }: CameraLivePreviewProps) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <Button size="sm" variant="success" onClick={() => setIsOpen(true)} disabled={!webrtcUrl}>
                Preview
            </Button>

            <Modal.Root isOpen={isOpen} onClose={() => setIsOpen(false)} size="sm">
                <Modal.Header>
                    <Modal.Title>
                        <Badge variant="error">Live</Badge>
                        Preview
                    </Modal.Title>
                    <Modal.Close />
                </Modal.Header>
                <Modal.Body>
                    <LiveVideoContent webrtcUrl={webrtcUrl} />
                </Modal.Body>
                <Modal.Footer>
                    <Modal.Cancel />
                </Modal.Footer>
            </Modal.Root>
        </>
    );
};

const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
};
