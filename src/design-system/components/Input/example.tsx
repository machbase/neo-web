import React, { useState } from 'react';
import { Input } from './index';

// Basic Input Example
export const BasicInput: React.FC = () => {
    const [value, setValue] = useState('');

    return (
        <div style={{ padding: '20px', maxWidth: '400px' }}>
            <h3>Basic Input</h3>
            <Input placeholder="Enter text..." value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
    );
};

// Input with Label
export const LabeledInput: React.FC = () => {
    const [value, setValue] = useState('');

    return (
        <div style={{ padding: '20px', maxWidth: '400px' }}>
            <h3>Input with Label</h3>
            <Input label="Username" placeholder="Enter your username" value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
    );
};

// Label Position
export const LabelPositionInput: React.FC = () => {
    const [topValue, setTopValue] = useState('');
    const [leftValue, setLeftValue] = useState('');

    return (
        <div style={{ padding: '20px', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3>Label Position</h3>
            <Input label="Top Label (default)" labelPosition="top" placeholder="Label is on top" value={topValue} onChange={(e) => setTopValue(e.target.value)} />
            <Input label="Left Label" labelPosition="left" placeholder="Label is on the left" value={leftValue} onChange={(e) => setLeftValue(e.target.value)} />
        </div>
    );
};

// Input Sizes
export const InputSizes: React.FC = () => {
    return (
        <div style={{ padding: '20px', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3>Input Sizes</h3>
            <Input size="sm" placeholder="Small input" />
            <Input size="md" placeholder="Medium input (default)" />
            <Input size="lg" placeholder="Large input" />
        </div>
    );
};

// Input with Icons
export const InputWithIcons: React.FC = () => {
    const [search, setSearch] = useState('');
    const [email, setEmail] = useState('');

    const SearchIcon = (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
                d="M7 12C9.76142 12 12 9.76142 12 7C12 4.23858 9.76142 2 7 2C4.23858 2 2 4.23858 2 7C2 9.76142 4.23858 12 7 12Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path d="M14 14L10.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );

    const EmailIcon = (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
                d="M2 4L8 8L14 4M2 4V12C2 12.5523 2.44772 13 3 13H13C13.5523 13 14 12.5523 14 12V4M2 4C2 3.44772 2.44772 3 3 3H13C13.5523 3 14 3.44772 14 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );

    return (
        <div style={{ padding: '20px', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3>Input with Icons</h3>
            <Input label="Search" leftIcon={SearchIcon} placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <Input label="Email" leftIcon={EmailIcon} type="email" placeholder="Enter email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
    );
};

// Input States
export const InputStates: React.FC = () => {
    const [normalValue, setNormalValue] = useState('');
    const [errorValue, setErrorValue] = useState('invalid@');
    const [successValue, setSuccessValue] = useState('valid@email.com');

    return (
        <div style={{ padding: '20px', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3>Input States</h3>
            <Input label="Normal" placeholder="Enter text..." value={normalValue} onChange={(e) => setNormalValue(e.target.value)} helperText="This is helper text" />
            <Input
                label="Error"
                placeholder="Enter email..."
                value={errorValue}
                onChange={(e) => setErrorValue(e.target.value)}
                error="Please enter a valid email address"
            />
            <Input
                label="Success"
                variant="success"
                placeholder="Enter email..."
                value={successValue}
                onChange={(e) => setSuccessValue(e.target.value)}
                helperText="Email is valid"
            />
            <Input label="Disabled" placeholder="Disabled input" disabled value="Cannot edit" />
        </div>
    );
};

// Password Input
export const PasswordInput: React.FC = () => {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const EyeIcon = (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ cursor: 'pointer' }} onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? (
                <>
                    <path d="M1 1L15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path
                        d="M6.5 6.5C6.18733 6.81267 6 7.23733 6 7.71C6 8.65533 6.76467 9.42 7.71 9.42C8.18267 9.42 8.60733 9.23267 8.92 8.92"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </>
            ) : (
                <path
                    d="M1 8C1 8 3 3 8 3C13 3 15 8 15 8C15 8 13 13 8 13C3 13 1 8 1 8Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            )}
        </svg>
    );

    return (
        <div style={{ padding: '20px', maxWidth: '400px' }}>
            <h3>Password Input</h3>
            <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                rightIcon={EyeIcon}
            />
        </div>
    );
};

// Full Width Input
export const FullWidthInput: React.FC = () => {
    const [value, setValue] = useState('');

    return (
        <div style={{ padding: '20px' }}>
            <h3>Full Width Input</h3>
            <Input label="Full Width" fullWidth placeholder="This input takes full width" value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
    );
};

// All Examples
export const InputExamples: React.FC = () => {
    return (
        <div>
            <BasicInput />
            <hr style={{ margin: '40px 0' }} />
            <LabeledInput />
            <hr style={{ margin: '40px 0' }} />
            <LabelPositionInput />
            <hr style={{ margin: '40px 0' }} />
            <InputSizes />
            <hr style={{ margin: '40px 0' }} />
            <InputWithIcons />
            <hr style={{ margin: '40px 0' }} />
            <InputStates />
            <hr style={{ margin: '40px 0' }} />
            <PasswordInput />
            <hr style={{ margin: '40px 0' }} />
            <FullWidthInput />
        </div>
    );
};
