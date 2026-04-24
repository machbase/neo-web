import { Button, Input, Popover } from '@/design-system/components';
import type { CreateSeriesAnnotationPopoverProps } from './BoardPanelTypes';

/**
 * Renders the series-annotation creation popup with explicit series and UTC date fields.
 * Intent: Let the user create annotations directly from the panel toolbar without clicking the chart.
 * @param props The popup state, explicit annotation fields, and action handlers.
 * @returns The portal-based create-annotation popup.
 */
const CreateSeriesAnnotationPopover = ({
    isOpen,
    position,
    seriesOptions,
    selectedSeriesValue,
    yearText,
    monthText,
    dayText,
    labelText,
    onSeriesValueChange,
    onYearTextChange,
    onMonthTextChange,
    onDayTextChange,
    onLabelTextChange,
    onApply,
    onClose,
}: CreateSeriesAnnotationPopoverProps) => {
    return (
        <Popover
            isOpen={isOpen}
            position={position}
            onClose={onClose}
            closeOnOutsideClick
        >
            <div
                style={{
                    minWidth: '360px',
                    padding: '12px',
                    backgroundColor: '#1e1e1e',
                    border: '0.5px solid #454545',
                    borderRadius: '4px',
                    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.35)',
                }}
            >
                <div
                    style={{
                        marginBottom: '10px',
                        fontSize: '12px',
                        color: '#afb5bc',
                    }}
                >
                    Add series annotation
                </div>
                <div style={{ display: 'grid', gap: '10px' }}>
                    <label style={{ display: 'grid', gap: '4px', fontSize: '12px', color: '#afb5bc' }}>
                        Series
                        <select
                            aria-label="Annotation series"
                            value={selectedSeriesValue}
                            onChange={(aEvent) => onSeriesValueChange(aEvent.target.value)}
                            style={{
                                height: '32px',
                                borderRadius: '4px',
                                border: '0.5px solid #454545',
                                backgroundColor: '#252525',
                                color: '#f8f8f8',
                                padding: '0 8px',
                            }}
                        >
                            {seriesOptions.map((aOption) => (
                                <option key={aOption.value} value={aOption.value}>
                                    {aOption.label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                        <label style={{ display: 'grid', gap: '4px', fontSize: '12px', color: '#afb5bc' }}>
                            Year
                            <Input
                                aria-label="Annotation year"
                                value={yearText}
                                onChange={(aEvent) => onYearTextChange(aEvent.target.value)}
                                size="sm"
                            />
                        </label>
                        <label style={{ display: 'grid', gap: '4px', fontSize: '12px', color: '#afb5bc' }}>
                            Month
                            <Input
                                aria-label="Annotation month"
                                value={monthText}
                                onChange={(aEvent) => onMonthTextChange(aEvent.target.value)}
                                size="sm"
                            />
                        </label>
                        <label style={{ display: 'grid', gap: '4px', fontSize: '12px', color: '#afb5bc' }}>
                            Day
                            <Input
                                aria-label="Annotation day"
                                value={dayText}
                                onChange={(aEvent) => onDayTextChange(aEvent.target.value)}
                                size="sm"
                            />
                        </label>
                    </div>
                    <label style={{ display: 'grid', gap: '4px', fontSize: '12px', color: '#afb5bc' }}>
                        Text
                        <Input
                            aria-label="Annotation text"
                            value={labelText}
                            onChange={(aEvent) => onLabelTextChange(aEvent.target.value)}
                            size="sm"
                        />
                    </label>
                </div>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '8px',
                        marginTop: '12px',
                    }}
                >
                    <Button size="sm" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button size="sm" onClick={onApply}>
                        Apply
                    </Button>
                </div>
            </div>
        </Popover>
    );
};

export default CreateSeriesAnnotationPopover;
