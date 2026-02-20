import { useState, useEffect } from 'react';
import { Alert, Button, Input, Modal } from '@/design-system/components';
import { useSetRecoilState } from 'recoil';
import { gMediaServer } from '@/recoil/recoil';
import { saveMediaServerConfig } from '@/api/repository/mediaSvr';

export type MediaSvrModalProps = {
    isOpen: boolean;
    onClose: () => void;
    initialIp?: string;
    initialPort?: string;
};

export const MediaSvrModal = ({ isOpen, onClose, initialIp = '', initialPort = '8000' }: MediaSvrModalProps) => {
    const setMediaServer = useSetRecoilState(gMediaServer);
    const [ip, setIp] = useState(initialIp);
    const [port, setPort] = useState(initialPort);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setIp(initialIp);
            setPort(initialPort);
            setError('');
        }
    }, [isOpen, initialIp, initialPort]);

    const [isLoading, setIsLoading] = useState(false);

    const handleConfirm = async () => {
        setError('');

        if (!ip) {
            setError('IP Address is required');
            return;
        }

        setIsLoading(true);
        try {
            const saved = await saveMediaServerConfig(ip, port);
            if (!saved) {
                setError('Failed to save server config');
                return;
            }
            setMediaServer({ ip, port });
            onClose();
        } catch {
            setError('Failed to save server config');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setIp(initialIp);
        setPort(initialPort);
        setError('');
        onClose();
    };

    return (
        <Modal.Root isOpen={isOpen} onClose={handleClose}>
            <Modal.Header>
                <Modal.Title>Server Settings</Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body>
                <Modal.Content>
                    <Input label="IP Address" placeholder="192.168.1.100" fullWidth value={ip} onChange={(e) => setIp(e.target.value)} />
                </Modal.Content>
                <Modal.Content>
                    <Input label="Port" placeholder="8554" fullWidth value={port} onChange={(e) => setPort(e.target.value)} />
                </Modal.Content>
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
