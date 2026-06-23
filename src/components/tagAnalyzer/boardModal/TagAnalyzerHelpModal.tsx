import type { CSSProperties, ReactNode } from 'react';
import {
    Calendar,
    Check,
    CiCircleMore,
    Delete,
    GearFill,
    GoArrowBoth,
    LineChart,
    LuTimerReset,
    MdCenterFocusStrong,
    MdOutlineStackedLineChart,
    PiHighlighterLight,
    PiSelectionPlusBold,
    Refresh,
    Save,
    SaveAs,
    TbTimezone,
    VscChevronLeft,
    VscChevronRight,
    VscNote,
} from '@/assets/icons/Icon';
import ZoomInTwo from '@/assets/image/btn_zoom in x2@3x.png';
import ZoomInFour from '@/assets/image/btn_zoom in x4@3x.png';
import ZoomOutTwo from '@/assets/image/btn_zoom out x2@3x.png';
import ZoomOutFour from '@/assets/image/btn_zoom out x4@3x.png';
import { Modal } from '@/design-system/components';

type HelpItem = {
    title: string;
    description: string;
    icon: ReactNode;
};

type HelpSection = {
    title: string;
    icon: ReactNode;
    items: HelpItem[];
};

const ZOOM_ICON_STYLE = { width: 20, height: 20, objectFit: 'contain' } as const;

const ICON_PAIR_STYLE: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
};

const RAW_ICON_STYLE: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 26,
    fontSize: 10,
    fontWeight: 700,
    lineHeight: 1,
};

const TEXT_ICON_STYLE: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 16,
    height: 16,
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1,
};

const HELP_SECTIONS: HelpSection[] = [
    {
        title: 'Board Header',
        icon: <Calendar size={17} />,
        items: [
            {
                title: 'Board time range',
                description: 'Sets the board time range and applies it to panels.',
                icon: <Calendar size={16} />,
            },
            {
                title: 'Refresh data',
                description: 'Reloads the current visible ranges without changing time.',
                icon: <Refresh size={15} />,
            },
            {
                title: 'Refresh time',
                description: 'Rechecks available data and reapplies configured time.',
                icon: <LuTimerReset size={16} />,
            },
            {
                title: 'Full range',
                description: 'Expands every panel to the full data range.',
                icon: <GoArrowBoth size={16} />,
            },
            {
                title: 'Save / Save as',
                description: 'Saves the board to the current or a new TAZ file.',
                icon: (
                    <span style={ICON_PAIR_STYLE}>
                        <Save size={15} />
                        <SaveAs size={15} />
                    </span>
                ),
            },
            {
                title: 'Overlap chart',
                description: 'Opens overlap comparison for selected compatible panels.',
                icon: <MdOutlineStackedLineChart size={16} />,
            },
        ],
    },
    {
        title: 'Panel Header',
        icon: <CiCircleMore size={18} />,
        items: [
            {
                title: 'Overlap checkbox',
                description: 'Adds or removes this panel from overlap comparison.',
                icon: <Check size={14} />,
            },
            {
                title: 'Panel title',
                description: 'Click the title text to rename the panel.',
                icon: <span style={TEXT_ICON_STYLE}>T</span>,
            },
            {
                title: 'Visible range',
                description: 'Opens the current main chart range editor.',
                icon: <Calendar size={16} />,
            },
            {
                title: 'Extra',
                description: 'Contains RAW, Highlight, Annotation, Set global time, and Reload data.',
                icon: <CiCircleMore size={17} />,
            },
            {
                title: 'FFT chart',
                description: 'Opens FFT after a data range selection exists.',
                icon: <LineChart size={16} />,
            },
            {
                title: 'Refresh time',
                description: 'Refreshes this panel time using configured time or 25% fallback.',
                icon: <LuTimerReset size={16} />,
            },
            {
                title: 'Full range',
                description: 'Expands this panel to the full data range.',
                icon: <GoArrowBoth size={16} />,
            },
            {
                title: 'Edit / Delete',
                description: 'Opens panel editor or deletes this panel.',
                icon: (
                    <span style={ICON_PAIR_STYLE}>
                        <GearFill size={15} />
                        <Delete size={16} />
                    </span>
                ),
            },
        ],
    },
    {
        title: 'Panel Control',
        icon: <PiSelectionPlusBold size={18} />,
        items: [
            {
                title: 'Range selection',
                description: 'Selects data points for stats and FFT.',
                icon: <PiSelectionPlusBold size={18} />,
            },
            {
                title: 'Highlight',
                description: 'Drag on the chart to create a highlighted range.',
                icon: <PiHighlighterLight size={17} />,
            },
            {
                title: 'Annotation',
                description: 'Click the chart to add a note to a point or series.',
                icon: <VscNote size={16} />,
            },
            {
                title: 'Set global time',
                description: 'Copies this panel visible range to other panels.',
                icon: <TbTimezone size={16} />,
            },
            {
                title: 'RAW',
                description: 'Switches between calculated interval data and raw rows.',
                icon: <span style={RAW_ICON_STYLE}>RAW</span>,
            },
        ],
    },
    {
        title: 'Panel Nav Chart Control',
        icon: <MdCenterFocusStrong size={18} />,
        items: [
            {
                title: 'Zoom in',
                description: 'Narrows the navigator range around its current center.',
                icon: (
                    <span style={ICON_PAIR_STYLE}>
                        <img src={ZoomInFour} style={ZOOM_ICON_STYLE} />
                        <img src={ZoomInTwo} style={ZOOM_ICON_STYLE} />
                    </span>
                ),
            },
            {
                title: 'Focus',
                description: 'Recenters the navigator around the visible main chart range.',
                icon: <MdCenterFocusStrong size={18} />,
            },
            {
                title: 'Zoom out',
                description: 'Widens the navigator range around its current center.',
                icon: (
                    <span style={ICON_PAIR_STYLE}>
                        <img src={ZoomOutTwo} style={ZOOM_ICON_STYLE} />
                        <img src={ZoomOutFour} style={ZOOM_ICON_STYLE} />
                    </span>
                ),
            },
            {
                title: 'Move navigator',
                description: 'Moves the navigator window backward or forward.',
                icon: (
                    <span style={ICON_PAIR_STYLE}>
                        <VscChevronLeft size={16} />
                        <VscChevronRight size={16} />
                    </span>
                ),
            },
            {
                title: 'Navigator range labels',
                description: 'Open the current navigator range editor.',
                icon: <Calendar size={16} />,
            },
        ],
    },
];

const MODAL_BODY_STYLE: CSSProperties = {
    display: 'grid',
    gap: 18,
    maxWidth: 760,
};

const SECTION_STYLE: CSSProperties = {
    display: 'grid',
    gap: 8,
};

const SECTION_TITLE_STYLE: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    margin: 0,
    color: '#fdb532',
    fontSize: 16,
    fontWeight: 700,
    lineHeight: '20px',
};

const ITEM_GRID_STYLE: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '6px 12px',
};

const ITEM_STYLE: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '28px minmax(0, 1fr)',
    alignItems: 'center',
    gap: 7,
    minWidth: 0,
};

const ITEM_ICON_STYLE: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    color: '#d6d6d6',
};

const ITEM_TEXT_STYLE: CSSProperties = {
    display: 'grid',
    gap: 1,
    minWidth: 0,
    color: '#d6d6d6',
    fontSize: 12,
    lineHeight: '16px',
};

const ITEM_TITLE_STYLE: CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    lineHeight: '16px',
};

const ITEM_DESCRIPTION_STYLE: CSSProperties = {
    fontSize: 12,
    lineHeight: '16px',
    opacity: 0.9,
};

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
                <div style={MODAL_BODY_STYLE}>
                    {HELP_SECTIONS.map((section) => (
                        <section key={section.title} style={SECTION_STYLE}>
                            <h3 style={SECTION_TITLE_STYLE}>
                                <span style={ITEM_ICON_STYLE}>{section.icon}</span>
                                {section.title}
                            </h3>
                            <div style={ITEM_GRID_STYLE}>
                                {section.items.map((item) => (
                                    <div key={item.title} style={ITEM_STYLE}>
                                        <span style={ITEM_ICON_STYLE}>
                                            {item.icon}
                                        </span>
                                        <span style={ITEM_TEXT_STYLE}>
                                            <span style={ITEM_TITLE_STYLE}>
                                                {item.title}
                                            </span>
                                            <span style={ITEM_DESCRIPTION_STYLE}>
                                                {item.description}
                                            </span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            </Modal.Body>
        </Modal.Root>
    );
}

export default TagAnalyzerHelpModal;
