import React, { useState } from 'react';
import { Button, IconButton } from './index';

// Basic Buttons
export const BasicButtons: React.FC = () => {
    return (
        <div style={{ padding: '20px' }}>
            <h3>Basic Buttons</h3>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
            </div>
        </div>
    );
};

// Button Sizes
export const ButtonSizes: React.FC = () => {
    return (
        <div style={{ padding: '20px' }}>
            <h3>Button Sizes</h3>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
            </div>
        </div>
    );
};

// Loading State
export const LoadingButtons: React.FC = () => {
    const [loading, setLoading] = useState(false);

    const handleClick = () => {
        setLoading(true);
        setTimeout(() => setLoading(false), 2000);
    };

    return (
        <div style={{ padding: '20px' }}>
            <h3>Loading State</h3>
            <div style={{ display: 'flex', gap: '12px' }}>
                <Button variant="primary" loading={loading} onClick={handleClick}>
                    {loading ? 'Loading...' : 'Click Me'}
                </Button>
                <Button variant="secondary" loading>
                    Loading
                </Button>
            </div>
        </div>
    );
};

// Disabled State
export const DisabledButtons: React.FC = () => {
    return (
        <div style={{ padding: '20px' }}>
            <h3>Disabled State</h3>
            <div style={{ display: 'flex', gap: '12px' }}>
                <Button variant="primary" disabled>
                    Disabled Primary
                </Button>
                <Button variant="secondary" disabled>
                    Disabled Secondary
                </Button>
            </div>
        </div>
    );
};

// Buttons with Icons
export const IconButtons: React.FC = () => {
    const PlusIcon = () => (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );

    const TrashIcon = () => (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 4H13M5 4V3C5 2.44772 5.44772 2 6 2H10C10.5523 2 11 2.44772 11 3V4M6 7V11M10 7V11M4 4H12V13C12 13.5523 11.5523 14 11 14H5C4.44772 14 4 13.5523 4 13V4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );

    const DownloadIcon = () => (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 10V3M8 10L5 7M8 10L11 7M3 13H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );

    return (
        <div style={{ padding: '20px' }}>
            <h3>Buttons with Icons</h3>
            <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <Button variant="primary" icon={<PlusIcon />}>
                        Add Item
                    </Button>
                    <Button variant="secondary" icon={<DownloadIcon />}>
                        Download
                    </Button>
                    <Button variant="danger" icon={<TrashIcon />}>
                        Delete
                    </Button>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <Button variant="primary" icon={<PlusIcon />} iconPosition="right">
                        Add Item
                    </Button>
                    <Button variant="secondary" icon={<DownloadIcon />} iconPosition="right">
                        Download
                    </Button>
                </div>
            </div>
        </div>
    );
};

// Icon Only Buttons
export const IconOnlyButtons: React.FC = () => {
    const SettingsIcon = () => (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M13 8C13 8.34 12.98 8.67 12.94 9L14.73 10.39C14.9 10.52 14.95 10.76 14.86 10.95L13.13 14.03C13.04 14.22 12.81 14.29 12.61 14.22L10.5 13.37C10.06 13.72 9.58 14.01 9.06 14.22L8.75 16.44C8.72 16.65 8.54 16.8 8.33 16.8H4.87C4.66 16.8 4.48 16.65 4.45 16.44L4.14 14.22C3.62 14.01 3.14 13.72 2.7 13.37L0.59 14.22C0.39 14.29 0.16 14.22 0.07 14.03L-1.66 10.95C-1.75 10.76 -1.7 10.52 -1.53 10.39L0.26 9C0.22 8.67 0.2 8.34 0.2 8C0.2 7.66 0.22 7.33 0.26 7L-1.53 5.61C-1.7 5.48 -1.75 5.24 -1.66 5.05L0.07 1.97C0.16 1.78 0.39 1.71 0.59 1.78L2.7 2.63C3.14 2.28 3.62 1.99 4.14 1.78L4.45 -0.44C4.48 -0.65 4.66 -0.8 4.87 -0.8H8.33C8.54 -0.8 8.72 -0.65 8.75 -0.44L9.06 1.78C9.58 1.99 10.06 2.28 10.5 2.63L12.61 1.78C12.81 1.71 13.04 1.78 13.13 1.97L14.86 5.05C14.95 5.24 14.9 5.48 14.73 5.61L12.94 7C12.98 7.33 13 7.66 13 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );

    const CloseIcon = () => (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );

    return (
        <div style={{ padding: '20px' }}>
            <h3>Icon Only Buttons</h3>
            <div style={{ display: 'flex', gap: '12px' }}>
                <IconButton variant="primary" icon={<SettingsIcon />} aria-label="Settings" />
                <IconButton variant="secondary" icon={<SettingsIcon />} aria-label="Settings" />
                <IconButton variant="ghost" icon={<CloseIcon />} aria-label="Close" />
                <IconButton variant="danger" icon={<CloseIcon />} aria-label="Delete" />
            </div>
        </div>
    );
};

// Full Width Button
export const FullWidthButton: React.FC = () => {
    return (
        <div style={{ padding: '20px', maxWidth: '400px' }}>
            <h3>Full Width Button</h3>
            <Button variant="primary" fullWidth>
                Full Width Button
            </Button>
        </div>
    );
};

// All Examples
export const ButtonExamples: React.FC = () => {
    return (
        <div>
            <BasicButtons />
            <hr style={{ margin: '40px 0' }} />
            <ButtonSizes />
            <hr style={{ margin: '40px 0' }} />
            <LoadingButtons />
            <hr style={{ margin: '40px 0' }} />
            <DisabledButtons />
            <hr style={{ margin: '40px 0' }} />
            <IconButtons />
            <hr style={{ margin: '40px 0' }} />
            <IconOnlyButtons />
            <hr style={{ margin: '40px 0' }} />
            <FullWidthButton />
        </div>
    );
};
