import { createElement, type CSSProperties, type ReactNode } from 'react';
import {
    Delete,
    Download,
    GearFill,
    GoArrowBoth,
    LuTimerReset,
    PiHighlighterLight,
    PiSelectionPlusBold,
    Refresh,
    TbTimezone,
    VscNote,
} from '@/assets/icons/Icon';

export const PanelActionKey = {
    TOGGLE_RAW: 'TOGGLE_RAW',
    TOGGLE_HIGHLIGHT: 'TOGGLE_HIGHLIGHT',
    TOGGLE_ANNOTATION: 'TOGGLE_ANNOTATION',
    TOGGLE_DRAG_SELECT: 'TOGGLE_DRAG_SELECT',
    SET_GLOBAL_RANGE: 'SET_GLOBAL_RANGE',
    REFRESH_DATA: 'REFRESH_DATA',
    REFRESH_RANGE: 'REFRESH_RANGE',
    EXPAND_FULL_RANGE: 'EXPAND_FULL_RANGE',
    TOGGLE_EDIT: 'TOGGLE_EDIT',
    OPEN_EXPORT_CSV: 'OPEN_EXPORT_CSV',
    OPEN_DELETE_CONFIRM: 'OPEN_DELETE_CONFIRM',
} as const;

export type PanelActionKey =
    (typeof PanelActionKey)[keyof typeof PanelActionKey];

export type PanelActionState = {
    active: readonly PanelActionKey[];
    disabled: readonly PanelActionKey[];
};

export type PanelActionDescriptor = {
    key: PanelActionKey;
    label: string;
    tooltip?: string;
    icon: ReactNode;
    active?: boolean;
    disabled?: boolean;
    className?: string;
    buttonStyle?: CSSProperties;
    contextLabel?: string;
    showInMoreMenu?: boolean;
    showInExtraMenu?: boolean;
    showInContextMenu?: boolean;
};

export function buildPanelActions(
    actionState: PanelActionState,
    includeExportCsv = false,
): PanelActionDescriptor[] {
    const isActive = (key: PanelActionKey): boolean =>
        actionState.active.includes(key);
    const isDisabled = (key: PanelActionKey): boolean =>
        actionState.disabled.includes(key);
    const sActions: PanelActionDescriptor[] = [
        {
            key: PanelActionKey.TOGGLE_RAW,
            label: isActive(PanelActionKey.TOGGLE_RAW)
                ? 'Disable raw data mode'
                : 'Enable raw data mode',
            icon: createElement(
                'span',
                { className: 'panel-header__raw-label' },
                'RAW',
            ),
            active: isActive(PanelActionKey.TOGGLE_RAW),
            className: 'panel-header__action--raw',
            buttonStyle: {
                minWidth: 34,
                maxWidth: 34,
                minHeight: 22,
                maxHeight: 22,
            },
            showInContextMenu: true,
        },
        {
            key: PanelActionKey.TOGGLE_HIGHLIGHT,
            label: 'Highlight',
            tooltip: 'Drag on chart to create highlight',
            icon: createElement(PiHighlighterLight, { size: 16 }),
            active: isActive(PanelActionKey.TOGGLE_HIGHLIGHT),
            showInExtraMenu: true,
        },
        {
            key: PanelActionKey.TOGGLE_ANNOTATION,
            label: 'Annotation',
            tooltip: 'Click chart to create annotation',
            icon: createElement(VscNote, { size: 15 }),
            active: isActive(PanelActionKey.TOGGLE_ANNOTATION),
            showInExtraMenu: true,
        },
        {
            key: PanelActionKey.TOGGLE_DRAG_SELECT,
            label: 'Select data range',
            contextLabel: isActive(PanelActionKey.TOGGLE_DRAG_SELECT)
                ? 'Disable range selection'
                : 'Enable range selection',
            tooltip: 'Select data range for stats and FFT',
            icon: createElement(PiSelectionPlusBold, { size: 18 }),
            active: isActive(PanelActionKey.TOGGLE_DRAG_SELECT),
            buttonStyle: {
                minWidth: 24,
                maxWidth: 24,
                minHeight: 22,
                maxHeight: 22,
            },
            showInContextMenu: true,
        },
        {
            key: PanelActionKey.SET_GLOBAL_RANGE,
            label: 'Set global range',
            icon: createElement(TbTimezone, { size: 15 }),
            disabled: isDisabled(PanelActionKey.SET_GLOBAL_RANGE),
            showInExtraMenu: true,
            showInContextMenu: true,
        },
        {
            key: PanelActionKey.REFRESH_DATA,
            label: 'Reload data',
            icon: createElement(Refresh, { size: 14 }),
            showInExtraMenu: true,
            showInContextMenu: true,
        },
        {
            key: PanelActionKey.REFRESH_RANGE,
            label: 'Refresh range',
            icon: createElement(LuTimerReset, { size: 16 }),
            showInMoreMenu: true,
            showInContextMenu: true,
        },
        {
            key: PanelActionKey.EXPAND_FULL_RANGE,
            label: 'Expand to full data range',
            icon: createElement(GoArrowBoth, { size: 15 }),
            showInExtraMenu: true,
            showInContextMenu: true,
        },
        {
            key: PanelActionKey.TOGGLE_EDIT,
            label: isActive(PanelActionKey.TOGGLE_EDIT)
                ? 'Close editor'
                : 'Open editor',
            contextLabel: isActive(PanelActionKey.TOGGLE_EDIT)
                ? 'Close editor'
                : 'Edit panel',
            icon: createElement(GearFill, { size: 14 }),
            active: isActive(PanelActionKey.TOGGLE_EDIT),
            showInContextMenu: true,
        },
        {
            key: PanelActionKey.OPEN_DELETE_CONFIRM,
            label: 'Delete panel',
            icon: createElement(Delete, { size: 16 }),
            showInMoreMenu: true,
            showInContextMenu: true,
        },
    ];

    if (includeExportCsv) {
        sActions.splice(sActions.length - 1, 0, {
            key: PanelActionKey.OPEN_EXPORT_CSV,
            label: 'Export CSV',
            icon: createElement(Download, { size: 16 }),
            showInExtraMenu: true,
        });
    }

    return sActions;
}
