import './TagAnalyzerHelpModal.scss';
import type { ReactNode } from 'react';
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
                    <span className="taz-help-modal__icon-pair">
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
                icon: <span className="taz-help-modal__glyph taz-help-modal__glyph--text">T</span>,
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
                    <span className="taz-help-modal__icon-pair">
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
                icon: <span className="taz-help-modal__glyph taz-help-modal__glyph--raw">RAW</span>,
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
                    <span className="taz-help-modal__icon-pair">
                        <img src={ZoomInFour} className="taz-help-modal__zoom-icon" />
                        <img src={ZoomInTwo} className="taz-help-modal__zoom-icon" />
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
                    <span className="taz-help-modal__icon-pair">
                        <img src={ZoomOutTwo} className="taz-help-modal__zoom-icon" />
                        <img src={ZoomOutFour} className="taz-help-modal__zoom-icon" />
                    </span>
                ),
            },
            {
                title: 'Move navigator',
                description: 'Moves the navigator window backward or forward.',
                icon: (
                    <span className="taz-help-modal__icon-pair">
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
                <div className="taz-help-modal">
                    {HELP_SECTIONS.map((section) => (
                        <section key={section.title} className="taz-help-modal__section">
                            <h3 className="taz-help-modal__section-title">
                                <span className="taz-help-modal__icon">{section.icon}</span>
                                {section.title}
                            </h3>
                            <div className="taz-help-modal__item-grid">
                                {section.items.map((item) => (
                                    <div key={item.title} className="taz-help-modal__item">
                                        <span className="taz-help-modal__icon">
                                            {item.icon}
                                        </span>
                                        <span className="taz-help-modal__text">
                                            <span className="taz-help-modal__title">
                                                {item.title}
                                            </span>
                                            <span className="taz-help-modal__description">
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
