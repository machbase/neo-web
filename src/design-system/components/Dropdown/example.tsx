import React, { useState } from 'react';
import { Dropdown } from './index';

// Sample data
const providerOptions = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'anthropic', label: 'Anthropic' },
    { value: 'google', label: 'Google' },
    { value: 'local', label: 'Local Model' },
];

const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'pending', label: 'Pending' },
    { value: 'disabled', label: 'Disabled (Cannot select)', disabled: true },
];

/**
 * Basic Dropdown Example
 */
export const BasicDropdownExample: React.FC = () => {
    const [value, setValue] = useState<string>('');

    return (
        <div style={{ width: '300px', padding: '20px' }}>
            <h3>Basic Dropdown</h3>
            <Dropdown.Root options={providerOptions} value={value} onChange={setValue} placeholder="Select a provider">
                <Dropdown.Trigger />
                <Dropdown.Menu>
                    <Dropdown.List />
                </Dropdown.Menu>
            </Dropdown.Root>
            <p style={{ marginTop: '10px', fontSize: '14px', color: '#888' }}>Selected: {value || 'None'}</p>
        </div>
    );
};

/**
 * Dropdown with Default Value
 */
export const DropdownWithDefaultValue: React.FC = () => {
    const [value, setValue] = useState<string>('anthropic');

    return (
        <div style={{ width: '300px', padding: '20px' }}>
            <h3>Dropdown with Default Value</h3>
            <Dropdown.Root options={providerOptions} value={value} onChange={setValue}>
                <Dropdown.Trigger />
                <Dropdown.Menu>
                    <Dropdown.List />
                </Dropdown.Menu>
            </Dropdown.Root>
            <p style={{ marginTop: '10px', fontSize: '14px', color: '#888' }}>Selected: {value}</p>
        </div>
    );
};

/**
 * Dropdown with Disabled Options
 */
export const DropdownWithDisabledOptions: React.FC = () => {
    const [value, setValue] = useState<string>('');

    return (
        <div style={{ width: '300px', padding: '20px' }}>
            <h3>Dropdown with Disabled Options</h3>
            <Dropdown.Root options={statusOptions} value={value} onChange={setValue} placeholder="Select status">
                <Dropdown.Trigger />
                <Dropdown.Menu>
                    <Dropdown.List />
                </Dropdown.Menu>
            </Dropdown.Root>
            <p style={{ marginTop: '10px', fontSize: '14px', color: '#888' }}>Selected: {value || 'None'}</p>
        </div>
    );
};

/**
 * Disabled Dropdown
 */
export const DisabledDropdown: React.FC = () => {
    const [value, setValue] = useState<string>('openai');

    return (
        <div style={{ width: '300px', padding: '20px' }}>
            <h3>Disabled Dropdown</h3>
            <Dropdown.Root options={providerOptions} value={value} onChange={setValue} disabled>
                <Dropdown.Trigger />
                <Dropdown.Menu>
                    <Dropdown.List />
                </Dropdown.Menu>
            </Dropdown.Root>
            <p style={{ marginTop: '10px', fontSize: '14px', color: '#888' }}>This dropdown is disabled</p>
        </div>
    );
};

/**
 * Custom Trigger Example
 */
export const CustomTriggerExample: React.FC = () => {
    const [value, setValue] = useState<string>('');

    return (
        <div style={{ width: '300px', padding: '20px' }}>
            <h3>Custom Trigger</h3>
            <Dropdown.Root options={providerOptions} value={value} onChange={setValue} placeholder="Choose provider">
                <Dropdown.Trigger>
                    {(selectedOption, isOpen) => (
                        <>
                            <span style={{ fontWeight: 'bold' }}>{selectedOption ? `Provider: ${selectedOption.label}` : 'Choose provider'}</span>
                            <span style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
                        </>
                    )}
                </Dropdown.Trigger>
                <Dropdown.Menu>
                    <Dropdown.List />
                </Dropdown.Menu>
            </Dropdown.Root>
            <p style={{ marginTop: '10px', fontSize: '14px', color: '#888' }}>Selected: {value || 'None'}</p>
        </div>
    );
};

/**
 * Custom Options Example
 */
export const CustomOptionsExample: React.FC = () => {
    const [value, setValue] = useState<string>('');

    const customOptions = [
        { value: 'openai', label: 'OpenAI', icon: '🤖' },
        { value: 'anthropic', label: 'Anthropic', icon: '🔮' },
        { value: 'google', label: 'Google', icon: '🔍' },
        { value: 'local', label: 'Local Model', icon: '💻' },
    ];

    return (
        <div style={{ width: '300px', padding: '20px' }}>
            <h3>Custom Options with Icons</h3>
            <Dropdown.Root options={customOptions} value={value} onChange={setValue} placeholder="Select a provider">
                <Dropdown.Trigger />
                <Dropdown.Menu>
                    <Dropdown.List>
                        {(option, index) => (
                            <Dropdown.Option key={option.value} option={option} index={index}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                    <span>{(option as any).icon}</span>
                                    <span style={{ flex: 1 }}>{option.label}</span>
                                    {option.value === value && <span>✓</span>}
                                </div>
                            </Dropdown.Option>
                        )}
                    </Dropdown.List>
                </Dropdown.Menu>
            </Dropdown.Root>
            <p style={{ marginTop: '10px', fontSize: '14px', color: '#888' }}>Selected: {value || 'None'}</p>
        </div>
    );
};

/**
 * Multiple Dropdowns in a Form
 */
export const MultipleDropdownsExample: React.FC = () => {
    const [provider, setProvider] = useState<string>('');
    const [status, setStatus] = useState<string>('');

    return (
        <div style={{ width: '400px', padding: '20px' }}>
            <h3>Form with Multiple Dropdowns</h3>

            <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#ccc' }}>Provider</label>
                <Dropdown.Root options={providerOptions} value={provider} onChange={setProvider} placeholder="Select provider">
                    <Dropdown.Trigger />
                    <Dropdown.Menu>
                        <Dropdown.List />
                    </Dropdown.Menu>
                </Dropdown.Root>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#ccc' }}>Status</label>
                <Dropdown.Root options={statusOptions} value={status} onChange={setStatus} placeholder="Select status">
                    <Dropdown.Trigger />
                    <Dropdown.Menu>
                        <Dropdown.List />
                    </Dropdown.Menu>
                </Dropdown.Root>
            </div>

            <div
                style={{
                    marginTop: '20px',
                    padding: '12px',
                    backgroundColor: '#2a2a2a',
                    borderRadius: '4px',
                    fontSize: '14px',
                }}
            >
                <div>Provider: {provider || 'Not selected'}</div>
                <div>Status: {status || 'Not selected'}</div>
            </div>
        </div>
    );
};

/**
 * All Examples Combined
 */
export const DropdownExamples: React.FC = () => {
    return (
        <div style={{ backgroundColor: '#1e1e1e', minHeight: '100vh', color: '#fff' }}>
            <div style={{ padding: '40px' }}>
                <h1>Dropdown Component Examples</h1>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '40px' }}>
                    <BasicDropdownExample />
                    <DropdownWithDefaultValue />
                    <DropdownWithDisabledOptions />
                    <DisabledDropdown />
                    <CustomTriggerExample />
                    <CustomOptionsExample />
                </div>
                <div style={{ marginTop: '40px' }}>
                    <MultipleDropdownsExample />
                </div>
            </div>
        </div>
    );
};

export default DropdownExamples;
