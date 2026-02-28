import { useState, useEffect } from 'react';
import { Alert, Button, Input, Modal, Page, TextHighlight, Toast } from '@/design-system/components';
import { createTable } from '@/api/repository/mediaSvr';

export type CreateTableModalProps = {
    isOpen: boolean;
    onClose: (keepTab: boolean) => void;
    onCreated: (tableName: string) => void;
    baseUrl?: string;
};

export const CreateTableModal = ({ isOpen, onClose, onCreated, baseUrl }: CreateTableModalProps) => {
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
            const res = await createTable({ table_name: tableName.trim() }, baseUrl);
            if (res.success && res.data?.created) {
                Toast.success(`Table '${tableName.trim()}' created successfully.`);
                onCreated(tableName.trim());
                onClose(true);
            } else {
                const reason = res.reason || 'Failed to create table';
                Toast.error(reason);
                setError(reason);
            }
        } catch (err) {
            // console.error('Failed to create table:', err);
            Toast.error('Failed to create table');
            setError('Failed to create table');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        if (!isLoading) {
            setTableName('');
            setError('');
            onClose(false);
        }
    };

    return (
        <Modal.Root isOpen={isOpen} onClose={handleClose}>
            <Modal.Header>
                <Modal.Title>Create Table</Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body>
                <Modal.Content style={{ gap: '8px' }}>
                    <TextHighlight variant="neutral" style={{ fontSize: '12px', marginBottom: '12px', paddingBottom: '8px' }}>
                        Used to store camera information and video chunk data.
                    </TextHighlight>
                    <Page.Space />
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
