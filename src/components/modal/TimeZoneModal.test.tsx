/**
 * F-176: the modal stays mounted between openings, so a pick left by Cancel was still selected the next time it
 * opened, and Apply then applied the cancelled format.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@/design-system/components', () => {
    const Pass = ({ children }: any) => <>{children}</>;
    const Combobox = {
        Root: ({ label, options, value, onChange }: any) => (
            <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
                {options.map((aOption: any) => (
                    <option key={aOption.value} value={aOption.value}>
                        {aOption.label}
                    </option>
                ))}
            </select>
        ),
        Input: () => null,
        Trigger: () => null,
        Dropdown: Pass,
        List: () => null,
    };
    const Modal = {
        Root: ({ isOpen, children }: any) => (isOpen ? <div>{children}</div> : null),
        Header: Pass,
        Title: Pass,
        Close: () => null,
        Body: Pass,
        Footer: Pass,
        Confirm: ({ onClick, children }: any) => <button onClick={onClick}>{children}</button>,
        Cancel: ({ onClick, children }: any) => <button onClick={onClick}>{children}</button>,
    };
    return { Modal, Combobox };
});

import { TimeZoneModal } from './TimeZoneModal';

describe('TimeZoneModal', () => {
    it('opens on the format in use after a Cancel, and Apply keeps it', () => {
        const sOnClose = jest.fn();
        const sProps = { onClose: sOnClose, formatInitValue: '2006-01-02 15:04:05', zoneInitValue: 'LOCAL' };
        const { rerender } = render(<TimeZoneModal isOpen={true} {...sProps} />);

        fireEvent.change(screen.getByLabelText('Time format'), { target: { value: 'ns' } });
        fireEvent.change(screen.getByLabelText('Time zone'), { target: { value: 'UTC' } });
        fireEvent.click(screen.getByText('Cancel'));
        expect(sOnClose).toHaveBeenLastCalledWith({ timeFormat: '2006-01-02 15:04:05', timeZone: 'LOCAL' });

        rerender(<TimeZoneModal isOpen={false} {...sProps} />);
        rerender(<TimeZoneModal isOpen={true} {...sProps} />);
        expect(screen.getByLabelText('Time format')).toHaveValue('2006-01-02 15:04:05');
        expect(screen.getByLabelText('Time zone')).toHaveValue('LOCAL');

        fireEvent.click(screen.getByText('Apply'));
        expect(sOnClose).toHaveBeenLastCalledWith({ timeFormat: '2006-01-02 15:04:05', timeZone: 'LOCAL' });
    });

    it('Apply still applies a new pick', () => {
        const sOnClose = jest.fn();
        render(<TimeZoneModal isOpen={true} onClose={sOnClose} formatInitValue="2006-01-02 15:04:05" zoneInitValue="LOCAL" />);
        fireEvent.change(screen.getByLabelText('Time format'), { target: { value: 'ns' } });
        fireEvent.click(screen.getByText('Apply'));
        expect(sOnClose).toHaveBeenLastCalledWith({ timeFormat: 'ns', timeZone: 'LOCAL' });
    });
});
