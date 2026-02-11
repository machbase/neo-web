import { useState, useEffect } from 'react';
import { Alert, Button, Input, Modal } from '@/design-system/components';
import { createTable } from '@/api/repository/mediaSvr';

export type CreateTableModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onCreated: (tableName: string) => void;
};

export const CreateTableModal = ({ isOpen, onClose, onCreated }: CreateTableModalProps) => {
    const [tableName, setTableName] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setTableName('');
            setError('');
        }
    }, [isOpen]);

    const handleConfirm = async () => {
        setError('');

        if (!tableName.trim()) {
            setError('Table name is required');
            return;
        }

        setIsLoading(true);
        try {
            const res = await createTable({ table_name: tableName.trim() });
            if (res.success && res.data?.created) {
                onCreated(tableName.trim());
                onClose();
            } else {
                setError(res.reason || 'Failed to create table');
            }
        } catch (err) {
            console.error('Failed to create table:', err);
            setError('Failed to create table');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        if (!isLoading) {
            setTableName('');
            setError('');
            onClose();
        }
    };

    return (
        <Modal.Root isOpen={isOpen} onClose={handleClose}>
            <Modal.Header>
                <Modal.Title>Create Table</Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body>
                <Modal.Content>
                    <Input label="Table name" placeholder="Enter table name" fullWidth value={tableName} onChange={(e) => setTableName(e.target.value)} />
                </Modal.Content>
                <Alert variant="error" message={error} onClose={() => setError('')} />
            </Modal.Body>
            <Modal.Footer>
                <Button.Group>
                    <Modal.Confirm onClick={handleConfirm} loading={isLoading} disabled={!tableName.trim() || isLoading}>
                        Create
                    </Modal.Confirm>
                    <Modal.Cancel onClick={handleClose} />
                </Button.Group>
            </Modal.Footer>
        </Modal.Root>
    );
};
