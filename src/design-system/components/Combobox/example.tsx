import React, { useState } from 'react';
import { Combobox, ComboboxOption } from './index';

// Sample data
const fruits: ComboboxOption[] = [
    { value: 'apple', label: 'Apple' },
    { value: 'banana', label: 'Banana' },
    { value: 'cherry', label: 'Cherry' },
    { value: 'grape', label: 'Grape' },
    { value: 'lemon', label: 'Lemon' },
    { value: 'mango', label: 'Mango' },
    { value: 'orange', label: 'Orange' },
    { value: 'peach', label: 'Peach' },
    { value: 'pear', label: 'Pear' },
    { value: 'watermelon', label: 'Watermelon', disabled: true },
    { value: 'strawberry', label: 'Strawberry' },
];

// Basic Example
export const BasicCombobox: React.FC = () => {
    const [value, setValue] = useState('');

    return (
        <div style={{ padding: '20px', maxWidth: '400px' }}>
            <h3>Basic Combobox</h3>
            <Combobox.Root options={fruits} value={value} onChange={setValue} placeholder="Select a fruit">
                <Combobox.Input />
                <Combobox.Trigger />
                <Combobox.Dropdown>
                    <Combobox.List />
                </Combobox.Dropdown>
            </Combobox.Root>

            <p style={{ marginTop: '16px', color: '#999' }}>Selected: {value || 'None'}</p>
        </div>
    );
};

// With Clear Button
export const ComboboxWithClear: React.FC = () => {
    const [value, setValue] = useState('apple');

    return (
        <div style={{ padding: '20px', maxWidth: '400px' }}>
            <h3>Combobox with Clear Button</h3>
            <Combobox.Root options={fruits} value={value} onChange={setValue} placeholder="Select a fruit">
                <Combobox.Input />
                <Combobox.Clear />
                <Combobox.Trigger />
                <Combobox.Dropdown>
                    <Combobox.List />
                </Combobox.Dropdown>
            </Combobox.Root>

            <p style={{ marginTop: '16px', color: '#999' }}>Selected: {value || 'None'}</p>
        </div>
    );
};

// Searchable Example
export const SearchableCombobox: React.FC = () => {
    const [value, setValue] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    return (
        <div style={{ padding: '20px', maxWidth: '400px' }}>
            <h3>Searchable Combobox</h3>
            <Combobox.Root options={fruits} value={value} onChange={setValue} onSearch={setSearchQuery} placeholder="Search fruits..." searchable>
                <Combobox.Input />
                <Combobox.Trigger />
                <Combobox.Dropdown>
                    <Combobox.List emptyMessage={`No results for "${searchQuery}"`} />
                </Combobox.Dropdown>
            </Combobox.Root>

            <p style={{ marginTop: '16px', color: '#999' }}>Selected: {value || 'None'}</p>
        </div>
    );
};

// Disabled Example
export const DisabledCombobox: React.FC = () => {
    const [value, setValue] = useState('apple');

    return (
        <div style={{ padding: '20px', maxWidth: '400px' }}>
            <h3>Disabled Combobox</h3>
            <Combobox.Root options={fruits} value={value} onChange={setValue} disabled>
                <Combobox.Input />
                <Combobox.Trigger />
                <Combobox.Dropdown>
                    <Combobox.List />
                </Combobox.Dropdown>
            </Combobox.Root>
        </div>
    );
};

// Custom Rendering Example
export const CustomCombobox: React.FC = () => {
    const [value, setValue] = useState('');

    const customOptions: ComboboxOption[] = [
        { value: 'red', label: 'Red' },
        { value: 'green', label: 'Green' },
        { value: 'blue', label: 'Blue' },
    ];

    return (
        <div style={{ padding: '20px', maxWidth: '400px' }}>
            <h3>Custom Option Rendering</h3>
            <Combobox.Root options={customOptions} value={value} onChange={setValue} placeholder="Select a color">
                <Combobox.Input />
                <Combobox.Trigger />
                <Combobox.Dropdown>
                    <Combobox.List>
                        {(option, index) => (
                            <Combobox.Option key={option.value} option={option} index={index}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div
                                        style={{
                                            width: '16px',
                                            height: '16px',
                                            borderRadius: '50%',
                                            backgroundColor: option.value,
                                        }}
                                    />
                                    <span>{option.label}</span>
                                </div>
                            </Combobox.Option>
                        )}
                    </Combobox.List>
                </Combobox.Dropdown>
            </Combobox.Root>

            <p style={{ marginTop: '16px', color: '#999' }}>Selected: {value || 'None'}</p>
        </div>
    );
};

// All Examples
export const ComboboxExamples: React.FC = () => {
    return (
        <div>
            <BasicCombobox />
            <hr style={{ margin: '40px 0' }} />
            <ComboboxWithClear />
            <hr style={{ margin: '40px 0' }} />
            <SearchableCombobox />
            <hr style={{ margin: '40px 0' }} />
            <DisabledCombobox />
            <hr style={{ margin: '40px 0' }} />
            <CustomCombobox />
        </div>
    );
};
