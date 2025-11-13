import { Modal, Combobox } from '@/design-system/components';
import { useState } from 'react';
import { RiTimeZoneLine } from 'react-icons/ri';
import { MdOutlineKeyboardArrowDown } from 'react-icons/md';
import { TIME_FORMAT_LIST } from '@/assets/ts/timeFormat';
import { IANA_TIMEZONES } from '@/assets/ts/timezones';

export interface TimeZoneModalProps {
    isOpen: boolean;
    onClose: ({ timeFormat, timeZone }: { timeFormat: string; timeZone: string }) => void;
    formatInitValue: string;
    zoneInitValue: string;
}

export const TimeZoneModal = ({ isOpen, onClose, formatInitValue = '2006-01-02 15:04:05', zoneInitValue = 'LOCAL' }: TimeZoneModalProps) => {
    const [sTimeFormat, setTimeFormat] = useState(formatInitValue ?? '2006-01-02 15:04:05');
    const [sTimeZone, setTimeZone] = useState(zoneInitValue ?? 'LOCAL');

    const handleClose = () => {
        onClose({ timeFormat: formatInitValue, timeZone: zoneInitValue });
    };
    const handleSave = () => {
        onClose({ timeFormat: sTimeFormat, timeZone: sTimeZone });
    };

    return (
        <Modal.Root isOpen={isOpen} onClose={handleClose}>
            <Modal.Header>
                <Modal.Title>
                    <RiTimeZoneLine size={16} />
                    <span>Format & Timezone</span>
                </Modal.Title>
                <Modal.Close />
            </Modal.Header>

            <Modal.Body>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <Combobox.Root
                        label="Time format"
                        labelPosition="left"
                        options={TIME_FORMAT_LIST}
                        value={sTimeFormat}
                        onChange={setTimeFormat}
                        placeholder="Select time format"
                    >
                        <Combobox.Input />
                        <Combobox.Trigger icon={<MdOutlineKeyboardArrowDown size={14} />} />
                        <Combobox.Dropdown>
                            <Combobox.List />
                        </Combobox.Dropdown>
                    </Combobox.Root>
                    <Combobox.Root label="Time zone" labelPosition="left" options={IANA_TIMEZONES} value={sTimeZone} onChange={setTimeZone} placeholder="Select time zone">
                        <Combobox.Input />
                        <Combobox.Trigger icon={<MdOutlineKeyboardArrowDown size={14} />} />
                        <Combobox.Dropdown>
                            <Combobox.List />
                        </Combobox.Dropdown>
                    </Combobox.Root>
                </div>
            </Modal.Body>

            <Modal.Footer>
                <Modal.Confirm onClick={handleSave}>Apply</Modal.Confirm>
                <Modal.Cancel onClick={handleClose}>Cancel</Modal.Cancel>
            </Modal.Footer>
        </Modal.Root>
    );
};
