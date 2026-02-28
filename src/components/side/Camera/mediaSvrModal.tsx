import { useState, useEffect } from 'react';
import { Alert, Button, Input, Modal } from '@/design-system/components';
import { useSetRecoilState } from 'recoil';
import { gMediaServer } from '@/recoil/recoil';
import { getMediaServerConfig, saveMediaServerConfig } from '@/api/repository/mediaSvr';
import { buildBaseUrl } from '@/components/dashboard/panels/video/utils/api';

// Alias: alphanumeric, Korean, digits, and -_. only
const ALIAS_REGEX = /^[a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ\-_.]+$/;

export type MediaSvrModalMode = 'new' | 'edit';

export type MediaSvrModalProps = {
    isOpen: boolean;
    onClose: (saved?: boolean) => void;
    mode?: MediaSvrModalMode;
    initialIp?: string;
    initialPort?: number;
    initialAlias?: string;
};

export const MediaSvrModal = ({ isOpen, onClose, mode = 'new', initialIp = '', initialPort = undefined, initialAlias = '' }: MediaSvrModalProps) => {
    const setMediaServer = useSetRecoilState(gMediaServer);
    const [ip, setIp] = useState(initialIp);
    const [port, setPort] = useState(initialPort ? String(initialPort) : '');
    const [alias, setAlias] = useState(initialAlias);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [connStatus, setConnStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

    useEffect(() => {
        if (isOpen) {
            setIp(initialIp);
            setPort(initialPort ? String(initialPort) : '');
            setAlias(initialAlias);
            setError('');
            setConnStatus('idle');

            // Pre-fill defaults when creating a new server and no servers exist yet
            if (mode === 'new') {
                getMediaServerConfig().then((configs) => {
                    if (configs.length === 0) {
                        setIp(window.location.hostname);
                        setPort('8000');
                    }
                });
            }
        }
    }, [isOpen, initialIp, initialPort, initialAlias, mode]);

    const handleTestConnection = async () => {
        if (!ip) {
            setError('IP Address is required');
            return;
        }
        setConnStatus('testing');
        setError('');
        try {
            const baseUrl = buildBaseUrl(ip, Number(port) || 0);
            const response = await fetch(`${baseUrl}/api/media/heartbeat`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(5000),
            });
            if (!response.ok) throw new Error(`${response.status}`);
            const data = await response.json();
            if (data?.success && data?.data?.healthy) {
                setConnStatus('success');
            } else {
                setConnStatus('error');
            }
        } catch {
            setConnStatus('error');
        }
    };

    const validateAlias = async (value: string): Promise<string | null> => {
        if (!value) return 'Alias is required';
        if (!ALIAS_REGEX.test(value)) return 'Alias can only contain letters, numbers, Korean, and -_.';

        // Check duplicate only in new mode (edit keeps same alias)
        if (mode === 'new') {
            const configs = await getMediaServerConfig();
            if (configs.some((c) => c.alias === value)) {
                return `Alias "${value}" already exists`;
            }
        }
        return null;
    };

    const handleConfirm = async () => {
        setError('');

        if (!ip) {
            setError('IP Address is required');
            return;
        }

        const aliasError = await validateAlias(alias);
        if (aliasError) {
            setError(aliasError);
            return;
        }

        const portNum = Number(port) || 0;
        setIsLoading(true);
        try {
            const existing = await getMediaServerConfig();
            let updated;
            if (mode === 'edit') {
                // Replace entry matching initialAlias
                updated = existing.map((c) => (c.alias === initialAlias ? { ip, port: portNum, alias } : c));
            } else {
                // Append new entry
                updated = [...existing, { ip, port: portNum, alias }];
            }

            const saved = await saveMediaServerConfig(updated);
            if (!saved) {
                setError('Failed to save server config');
                return;
            }
            setMediaServer({ ip, port: portNum, alias });
            onClose(true);
        } catch {
            setError('Failed to save server config');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setIp(initialIp);
        setPort(initialPort ? String(initialPort) : '');
        setAlias(initialAlias);
        setError('');
        onClose();
    };

    return (
        <Modal.Root isOpen={isOpen} onClose={handleClose}>
            <Modal.Header>
                <Modal.Title>{mode === 'new' ? 'New Blackbox Server' : 'Edit Blackbox Server'}</Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body>
                <Modal.Content>
                    <Input label="Alias" placeholder="BlackBox Server 1" fullWidth value={alias} onChange={(e) => setAlias(e.target.value)} />
                </Modal.Content>
                <Modal.Content>
                    <Input label="IP Address" placeholder="192.168.1.100" fullWidth value={ip} onChange={(e) => setIp(e.target.value)} />
                </Modal.Content>
                <Modal.Content>
                    <Input label="Port" placeholder="8000" fullWidth value={port} onChange={(e) => setPort(e.target.value)} />
                </Modal.Content>
                <Modal.Content>
                    <Button size="sm" variant="secondary" onClick={handleTestConnection} loading={connStatus === 'testing'} disabled={connStatus === 'testing'}>
                        Test Connection
                    </Button>
                </Modal.Content>
                {connStatus === 'success' && <Alert variant="success" message="Connected" />}
                {connStatus === 'error' && <Alert variant="error" message="Connection failed" />}
                <Alert variant="error" message={error} onClose={() => setError('')} />
            </Modal.Body>
            <Modal.Footer>
                <Button.Group>
                    <Modal.Confirm onClick={handleConfirm} loading={isLoading}>
                        Save
                    </Modal.Confirm>
                    <Modal.Cancel onClick={handleClose} />
                </Button.Group>
            </Modal.Footer>
        </Modal.Root>
    );
};
