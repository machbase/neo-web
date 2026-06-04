import { Modal } from '@/design-system/components';

const HELP_SECTIONS = [
    {
        title: 'Panels and data',
        items: [
            'Use the time range button to choose the board time range for every panel.',
            'Refresh data reloads the current visible range without changing the time window.',
            'Refresh time checks the available data range again and reapplies the configured time range.',
        ],
    },
    {
        title: 'Raw mode',
        items: [
            'The Raw button switches a panel between calculated interval data and raw table rows.',
            'Calculated mode groups points by the panel interval and shows the interval in the header.',
            'Raw mode shows the original data points. Raw panels can use different pixel and sampling settings in the panel editor.',
        ],
    },
    {
        title: 'Zoom and navigation',
        items: [
            'Drag on the chart to zoom when zoom is enabled.',
            'Use the navigator at the bottom to move or resize the visible time window.',
            'The focus button recenters the navigator around the current visible range.',
            'The reset navigator button returns the navigator to the full available data range.',
        ],
    },
    {
        title: 'Annotations and highlights',
        items: [
            'Click Annotation, then click the chart where the note should be placed. Choose the series, edit the text, then apply.',
            'Click an existing annotation label to edit or delete it.',
            'Click Highlight, drag across the chart, then edit the label, time range, and colors.',
        ],
    },
    {
        title: 'Selection, FFT, and overlap',
        items: [
            'Use range selection to select points for stats. After selecting a range, the FFT button becomes available.',
            'Click a single-series panel title to include it in overlap comparison, then use the overlap chart button in the toolbar.',
            'Set global time copies a panel visible range to the board so other panels can follow it.',
        ],
    },
    {
        title: 'Saving',
        items: [
            'Save updates the current TAZ file.',
            'Save as creates a new saved TAZ file.',
            'Panel editor changes, annotations, highlights, and display settings are saved with the board.',
        ],
    },
] as const;

function TagAnalyzerHelpModal({
    onClose,
}: {
    onClose: () => void;
}) {
    return (
        <Modal.Root
            isOpen
            onClose={onClose}
            closeOnEscape
            closeOnOutsideClick
        >
            <Modal.Header>
                <Modal.Title>Help</Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body>
                <div style={{ display: 'grid', gap: '14px', maxWidth: '720px' }}>
                    {HELP_SECTIONS.map((section) => (
                        <section key={section.title}>
                            <h3 style={{ margin: '0 0 6px', fontSize: '14px' }}>
                                {section.title}
                            </h3>
                            <ul style={{ margin: 0, paddingLeft: '18px' }}>
                                {section.items.map((item) => (
                                    <li key={item} style={{ marginBottom: '4px' }}>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))}
                </div>
            </Modal.Body>
        </Modal.Root>
    );
}

export default TagAnalyzerHelpModal;
