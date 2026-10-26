import { Modal, Combobox } from '@/design-system/components';
import { useEffect, useState } from 'react';
import { RiTimeZoneLine } from 'react-icons/ri';
import { TIME_FORMAT_LIST } from '@/assets/ts/timeFormat';
import { IANA_TIMEZONES } from '@/assets/ts/timezones';
import { VscChevronDown } from 'react-icons/vsc';

export interface TimeZoneModalProps {
    isOpen: boolean;
    onClose: ({ timeFormat, timeZone }: { timeFormat: string; timeZone: string }) => void;
    formatInitValue: string;
    zoneInitValue: string;
}

// The dropdowns open in a portal, so each option carries a feature-qualified test ID keyed by its value.
const FORMAT_OPTIONS = TIME_FORMAT_LIST.map((aOption) => ({ ...aOption, testId: `time-format-${encodeURIComponent(aOption.value)}` }));
const ZONE_OPTIONS = IANA_TIMEZONES.map((aOption) => ({ ...aOption, testId: `time-zone-${encodeURIComponent(aOption.value)}` }));

export const TimeZoneModal = ({ isOpen, onClose, formatInitValue = '2006-01-02 15:04:05', zoneInitValue = 'LOCAL' }: TimeZoneModalProps) => {
    const [sTimeFormat, setTimeFormat] = useState(formatInitValue ?? '2006-01-02 15:04:05');
    const [sTimeZone, setTimeZone] = useState(zoneInitValue ?? 'LOCAL');

    // The modal stays mounted between openings, so a pick left by Cancel was still selected next time and Apply then
    // applied it (F-176). Each opening starts from the values in use.
    useEffect(() => {
        if (!isOpen) return;
        setTimeFormat(formatInitValue ?? '2006-01-02 15:04:05');
        setTimeZone(zoneInitValue ?? 'LOCAL');
    }, [isOpen, formatInitValue, zoneInitValue]);

    const handleClose = () => {
        onClose({ timeFormat: formatInitValue, timeZone: zoneInitValue });
    };
    const handleSave = () => {
        onClose({ timeFormat: sTimeFormat, timeZone: sTimeZone });
    };

    return (
        <Modal.Root isOpen={isOpen} onClose={handleClose} data-testid="time-format-modal">
            <Modal.Header>
                <Modal.Title>
                    <RiTimeZoneLine size={16} />
                    <span>Format & Timezone</span>
                </Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body>
                <Combobox.Root label="Time format" labelPosition="left" options={FORMAT_OPTIONS} value={sTimeFormat} onChange={setTimeFormat} placeholder="Select time format">
                    <Combobox.Input data-testid="format" />
                    <Combobox.Trigger icon={<VscChevronDown size={14} />} />
                    <Combobox.Dropdown>
                        <Combobox.List />
                    </Combobox.Dropdown>
                </Combobox.Root>
                <Combobox.Root label="Time zone" labelPosition="left" options={ZONE_OPTIONS} value={sTimeZone} onChange={setTimeZone} placeholder="Select time zone">
                    <Combobox.Input data-testid="zone" />
                    <Combobox.Trigger icon={<VscChevronDown size={14} />} />
                    <Combobox.Dropdown>
                        <Combobox.List />
                    </Combobox.Dropdown>
                </Combobox.Root>
            </Modal.Body>
            <Modal.Footer>
                <Modal.Confirm onClick={handleSave} data-testid="apply">Apply</Modal.Confirm>
                <Modal.Cancel onClick={handleClose} data-testid="cancel">Cancel</Modal.Cancel>
            </Modal.Footer>
        </Modal.Root>
    );
};
