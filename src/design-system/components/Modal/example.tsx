import React, { useState } from 'react';
import { Modal } from './index';

// Basic Example with Confirm/Cancel buttons
export const BasicModal: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div style={{ padding: '20px' }}>
            <h3>Basic Modal</h3>
            <button onClick={() => setIsOpen(true)} style={{ padding: '8px 16px', cursor: 'pointer' }}>
                Open Modal
            </button>

            <Modal.Root isOpen={isOpen} onClose={() => setIsOpen(false)}>
                <Modal.Header>
                    <Modal.Title>Basic Modal</Modal.Title>
                    <Modal.Close />
                </Modal.Header>
                <Modal.Body>
                    <p>This is a basic modal with a title, body content, and action buttons.</p>
                    <p>Click outside, press Escape, or use the buttons to close.</p>
                </Modal.Body>
                <Modal.Footer>
                    <Modal.Confirm onClick={() => setIsOpen(false)}>Save</Modal.Confirm>
                    <Modal.Cancel />
                </Modal.Footer>
            </Modal.Root>
        </div>
    );
};

// Confirmation Dialog
export const ConfirmationModal: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);

    const handleConfirm = () => {
        alert('Confirmed!');
        setIsOpen(false);
    };

    return (
        <div style={{ padding: '20px' }}>
            <h3>Confirmation Modal</h3>
            <button onClick={() => setIsOpen(true)} style={{ padding: '8px 16px', cursor: 'pointer' }}>
                Delete Item
            </button>

            <Modal.Root isOpen={isOpen} onClose={() => setIsOpen(false)}>
                <Modal.Header>
                    <Modal.Title>Confirm Deletion</Modal.Title>
                    <Modal.Close />
                </Modal.Header>
                <Modal.Body>
                    <p>Are you sure you want to delete this item?</p>
                    <p>This action cannot be undone.</p>
                </Modal.Body>
                <Modal.Footer>
                    <Modal.Confirm onClick={handleConfirm}>Yes, Delete</Modal.Confirm>
                    <Modal.Cancel>No, Keep It</Modal.Cancel>
                </Modal.Footer>
            </Modal.Root>
        </div>
    );
};

// Form Modal with Loading State
export const FormModal: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');

    const handleSubmit = async () => {
        setLoading(true);
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setLoading(false);
        alert(`Submitted: ${name}, ${email}`);
        setIsOpen(false);
        setName('');
        setEmail('');
    };

    const handleClose = () => {
        if (!loading) {
            setIsOpen(false);
            setName('');
            setEmail('');
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <h3>Form Modal with Loading</h3>
            <button onClick={() => setIsOpen(true)} style={{ padding: '8px 16px', cursor: 'pointer' }}>
                Add User
            </button>

            <Modal.Root isOpen={isOpen} onClose={handleClose} closeOnEscape={!loading} closeOnOutsideClick={!loading}>
                <Modal.Header>
                    <Modal.Title>Add New User</Modal.Title>
                    {!loading && <Modal.Close />}
                </Modal.Header>
                <Modal.Body>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label htmlFor="name" style={{ fontSize: '14px' }}>
                                Name
                            </label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={loading}
                                style={{
                                    padding: '8px 12px',
                                    border: '1px solid #3e3e3e',
                                    borderRadius: '4px',
                                    backgroundColor: '#2a2a2a',
                                    color: '#e0e0e0',
                                }}
                                placeholder="Enter name"
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label htmlFor="email" style={{ fontSize: '14px' }}>
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                                style={{
                                    padding: '8px 12px',
                                    border: '1px solid #3e3e3e',
                                    borderRadius: '4px',
                                    backgroundColor: '#2a2a2a',
                                    color: '#e0e0e0',
                                }}
                                placeholder="Enter email"
                            />
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Modal.Cancel onClick={handleClose}>Cancel</Modal.Cancel>
                    <Modal.Confirm onClick={handleSubmit} disabled={!name || !email} loading={loading}>
                        Save
                    </Modal.Confirm>
                </Modal.Footer>
            </Modal.Root>
        </div>
    );
};

// Simple Alert Modal
export const AlertModal: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div style={{ padding: '20px' }}>
            <h3>Alert Modal</h3>
            <button onClick={() => setIsOpen(true)} style={{ padding: '8px 16px', cursor: 'pointer' }}>
                Show Alert
            </button>

            <Modal.Root isOpen={isOpen} onClose={() => setIsOpen(false)}>
                <Modal.Header>
                    <Modal.Title>Success!</Modal.Title>
                    <Modal.Close />
                </Modal.Header>
                <Modal.Body>
                    <p>Your changes have been saved successfully.</p>
                </Modal.Body>
                <Modal.Footer>
                    <Modal.Confirm onClick={() => setIsOpen(false)}>OK</Modal.Confirm>
                </Modal.Footer>
            </Modal.Root>
        </div>
    );
};

// Custom Styled Modal
export const CustomModal: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div style={{ padding: '20px' }}>
            <h3>Custom Styled Modal</h3>
            <button onClick={() => setIsOpen(true)} style={{ padding: '8px 16px', cursor: 'pointer' }}>
                Open Custom Modal
            </button>

            <Modal.Root isOpen={isOpen} onClose={() => setIsOpen(false)}>
                <Modal.Header style={{ backgroundColor: '#1a1a1a', padding: '20px' }}>
                    <Modal.Title style={{ fontSize: '20px', fontWeight: 'bold' }}>Custom Styled Modal</Modal.Title>
                    <Modal.Close />
                </Modal.Header>
                <Modal.Body style={{ padding: '32px', minHeight: '200px' }}>
                    <h4>Custom Content Area</h4>
                    <p>You can customize the styling of any modal component by passing className or style props.</p>
                    <ul style={{ marginTop: '16px', paddingLeft: '20px' }}>
                        <li>Custom colors</li>
                        <li>Custom spacing</li>
                        <li>Custom layouts</li>
                    </ul>
                </Modal.Body>
                <Modal.Footer style={{ backgroundColor: '#1a1a1a', padding: '20px' }}>
                    <Modal.Cancel style={{ minWidth: '100px' }}>Cancel</Modal.Cancel>
                    <Modal.Confirm onClick={() => setIsOpen(false)} style={{ minWidth: '100px' }}>
                        Confirm
                    </Modal.Confirm>
                </Modal.Footer>
            </Modal.Root>
        </div>
    );
};

// No Close Options Modal (must use buttons)
export const NoCloseModal: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div style={{ padding: '20px' }}>
            <h3>No External Close Modal</h3>
            <button onClick={() => setIsOpen(true)} style={{ padding: '8px 16px', cursor: 'pointer' }}>
                Open Modal
            </button>

            <Modal.Root isOpen={isOpen} onClose={() => setIsOpen(false)} closeOnEscape={false} closeOnOutsideClick={false}>
                <Modal.Header>
                    <Modal.Title>Important Action Required</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>This modal cannot be closed by clicking outside or pressing Escape.</p>
                    <p>You must choose one of the options below.</p>
                </Modal.Body>
                <Modal.Footer>
                    <Modal.Cancel>Decline</Modal.Cancel>
                    <Modal.Confirm onClick={() => setIsOpen(false)}>Accept</Modal.Confirm>
                </Modal.Footer>
            </Modal.Root>
        </div>
    );
};

// All Examples
export const ModalExamples: React.FC = () => {
    return (
        <div>
            <BasicModal />
            <hr style={{ margin: '40px 0' }} />
            <ConfirmationModal />
            <hr style={{ margin: '40px 0' }} />
            <FormModal />
            <hr style={{ margin: '40px 0' }} />
            <AlertModal />
            <hr style={{ margin: '40px 0' }} />
            <CustomModal />
            <hr style={{ margin: '40px 0' }} />
            <NoCloseModal />
        </div>
    );
};
