import {
    Calendar,
    Check,
    CiCircleMore,
    Delete,
    GearFill,
    GoArrowBoth,
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
import type { ReactNode } from 'react';
import { Inline, Stack, Text } from '../ui/Presentation';
import './Board.scss';

export function HelpModal({
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
            data-testid="tag-analyzer-help-dialog"
        >
            <Modal.Header>
                <Modal.Title>Help</Modal.Title>
                <Modal.Close data-testid="tag-analyzer-help-close-button" />
            </Modal.Header>
            <Modal.Body>
                <Stack gap={16} className="taz-help-modal">
                    {HELP_SECTIONS.map((section) => (
                        <Stack as="section" key={section.id} gap={8}>
                            <Text as="h3" variant="title" tone="warning"
                                data-testid={`tag-analyzer-help-${section.id}-heading`}
                            >
                                <Inline as="span">
                                    <Inline as="span" justify="center" className="taz-help-modal__icon">{section.icon}</Inline>
                                    {section.title}
                                </Inline>
                            </Text>
                            <div className="taz-help-modal__item-grid">
                                {section.items.map((item) => (
                                    <div key={item.title} className="taz-help-modal__item">
                                        <Inline as="span" justify="center" className="taz-help-modal__icon">
                                            {item.icon}
                                        </Inline>
                                        <Stack as="span" gap={0}>
                                            <Text variant="label" tone="secondary" weight="semibold">{item.title}</Text>
                                            <Text tone="secondary">{item.description}</Text>
                                        </Stack>
                                    </div>
                                ))}
                            </div>
                        </Stack>
                    ))}
                </Stack>
            </Modal.Body>
        </Modal.Root>
    );
}

// -------------------- Local --------------------

function iconPair(first: ReactNode, second: ReactNode) {
    return <Inline as="span" gap={4}>{first}{second}</Inline>;
}

const HELP_SECTIONS = [
    {
        id: 'board-header',
        title: 'Board Header',
        icon: <Calendar size={17} />,
        items: [
            {
                title: 'Board range',
                description:
                    'Switches between time and numeric ranges and applies each range only to matching panels.',
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
                icon: iconPair(<Save size={15} />, <SaveAs size={15} />),
            },
            {
                title: 'Overlap chart',
                description: 'Opens overlap comparison for selected compatible panels.',
                icon: <MdOutlineStackedLineChart size={16} />,
            },
        ],
    },
    {
        id: 'panel-header',
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
                icon: <Text variant="label" weight="semibold">T</Text>,
            },
            {
                title: 'Visible range',
                description: 'Opens the current main chart range editor.',
                icon: <Calendar size={16} />,
            },
            {
                title: 'Extra',
                description: 'Contains Highlight, Annotation, Set global time, Reload data, Full range, and Export CSV when available.',
                icon: <CiCircleMore size={17} />,
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
                icon: iconPair(<GearFill size={15} />, <Delete size={16} />),
            },
        ],
    },
    {
        id: 'panel-control',
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
                icon: <Text variant="caption" weight="semibold">RAW</Text>,
            },
        ],
    },
    {
        id: 'panel-range-controls',
        title: 'Panel Range Controls',
        icon: <MdCenterFocusStrong size={18} />,
        items: [
            {
                title: 'Zoom in',
                description: 'Narrows the visible main chart range around its center.',
                icon: iconPair(
                    <img alt="" src={ZoomInFour} className="taz-help-modal__zoom-icon" />,
                    <img alt="" src={ZoomInTwo} className="taz-help-modal__zoom-icon" />,
                ),
            },
            {
                title: 'Focus',
                description: 'Focuses the main chart on its current visible-range center.',
                icon: <MdCenterFocusStrong size={18} />,
            },
            {
                title: 'Zoom out',
                description: 'Widens the visible main chart range around its center.',
                icon: iconPair(
                    <img alt="" src={ZoomOutTwo} className="taz-help-modal__zoom-icon" />,
                    <img alt="" src={ZoomOutFour} className="taz-help-modal__zoom-icon" />,
                ),
            },
            {
                title: 'Move navigator',
                description: 'Moves the navigator window backward or forward.',
                icon: iconPair(
                    <VscChevronLeft size={16} />,
                    <VscChevronRight size={16} />,
                ),
            },
        ],
    },
];
