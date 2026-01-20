import { useState, useEffect } from 'react';
import { Modal } from '@/design-system/components/Modal';
import { TableHeader } from '@/assets/icons/Icon';
import { getStatzConfig, setStatzConfig } from '@/api/repository/statz';
import { Toast } from '@/design-system/components';
import { Input } from '@/design-system/components';

interface StatzTableModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const StatzTableModal = ({ isOpen, onClose }: StatzTableModalProps) => {
    const [sTableName, setTableName] = useState<string>('');
    const [sIsLoading, setIsLoading] = useState<boolean>(false);

    const handleApply = async () => {
        if (sIsLoading) return;
        setIsLoading(true);
        try {
            const result: any = await setStatzConfig(sTableName);
            if (result && result.success) {
                onClose();
            } else {
                Toast.error('Failed to set statz config');
            }
        } catch (error) {
            Toast.error('Error setting statz config');
        } finally {
            setIsLoading(false);
        }
    };

    const loadCurrentConfig = async () => {
        try {
            const result: any = await getStatzConfig();
            if (result && result.success && result.data && result.data.out) {
                setTableName(result.data.out);
            }
        } catch (error) {
            Toast.error('Error loading statz config');
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadCurrentConfig();
        }
    }, [isOpen]);

    const handleTableNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTableName(e.target.value);
    };

    const handleEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.which === 13 || e.keyCode === 13) {
            e.preventDefault();
            if (!sIsLoading) {
                handleApply();
            }
        }
    };

    const handleClose = () => {
        if (!sIsLoading) {
            onClose();
        }
    };

    return (
        <Modal.Root isOpen={isOpen} onClose={handleClose} closeOnEscape={!sIsLoading} closeOnOutsideClick={!sIsLoading}>
            <Modal.Header>
                <Modal.Title>
                    <TableHeader />
                    Statz Table
                </Modal.Title>
                {!sIsLoading && <Modal.Close />}
            </Modal.Header>
            <Modal.Body>
                <Input
                    autoFocus
                    label="Table name"
                    labelPosition="left"
                    placeholder="Enter table name"
                    value={sTableName}
                    onChange={handleTableNameChange}
                    onKeyDown={handleEnter}
                />
            </Modal.Body>
            <Modal.Footer>
                <Modal.Confirm onClick={handleApply} disabled={sIsLoading} loading={sIsLoading}>
                    Apply
                </Modal.Confirm>
                <Modal.Cancel onClick={handleClose}>Cancel</Modal.Cancel>
            </Modal.Footer>
        </Modal.Root>
    );
};
