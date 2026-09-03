export const TAG_SELECTION_REQUIRED_MESSAGE = 'Please select tag.';

// Panel types that do not depend on tag selection. Values must match ChartTypeList keys in src/utils/constants.ts.
export const TAG_INDEPENDENT_PANEL_TYPES = ['Video', 'Tql chart'];

const hasSelectedTag = (tag: unknown) => {
    return typeof tag === 'string' && tag.trim() !== '';
};

export const getFirstMissingTagSelectionBlockId = (panelOption: any) => {
    if (TAG_INDEPENDENT_PANEL_TYPES.includes(panelOption?.type)) return undefined;

    const blockList = Array.isArray(panelOption?.blockList) ? panelOption.blockList : [];
    const missingBlock = blockList.find((block: any) => {
        return block?.type === 'tag' && !block?.useCustom && !block?.customFullTyping?.use && !hasSelectedTag(block?.tag);
    });

    return missingBlock?.id;
};

export const getTagSelectionValidationMessage = (panelOption: any) => {
    const hasMissingTagSelection = !!getFirstMissingTagSelectionBlockId(panelOption);

    return hasMissingTagSelection ? TAG_SELECTION_REQUIRED_MESSAGE : undefined;
};

/** Shown on the Time field itself, where there is only room for the fact. */
export const TIME_FIELD_MISSING_MESSAGE = 'No DATETIME column.';
/** Shown as a toast when a save is refused, where there is room to say what to do about it. */
export const TIME_FIELD_REQUIRED_MESSAGE = 'This table has no DATETIME column to plot against. Choose another table, or write the query yourself.';

const hasSelectedTimeField = (block: any) => typeof block?.time === 'string' && block.time.trim() !== '';

/**
 * Whether this block's columns are known — that is, whether the absence of a time field is a fact
 * about the table rather than a load that has not finished.
 *
 * A block whose table was typed rather than picked (a `{{variable}}` table) is left with an empty
 * `tableInfo` on purpose, so it answers false here and is never judged.
 */
const hasKnownColumns = (block: any) => Array.isArray(block?.tableInfo) && block.tableInfo.length > 0;

/**
 * A `V$<TABLE>_STAT` block, which a Gauge / Pie / Liquid fill panel reads. It is aggregated
 * already, so its query carries no time predicate and the Time field is not rendered for it.
 */
const isStatViewBlock = (block: any) => String(block?.table ?? '').includes('V$');

/**
 * The first block that cannot name a time column — the v8.7 view and transaction tables made this
 * reachable, since neither is guaranteed one.
 *
 * Without this the panel saves and then fails at the server: the generated SQL comes out as
 * `DATE_BIN('hour', 1, )` over `where  BETWEEN ...`, and the engine answers `MACHCLI-ERR-2010,
 * Syntax error`. That names the symptom and not the cause, so the panel looks broken for a reason
 * the user cannot act on.
 */
export const getFirstMissingTimeFieldBlockId = (panelOption: any) => {
    if (TAG_INDEPENDENT_PANEL_TYPES.includes(panelOption?.type)) return undefined;

    const blockList = Array.isArray(panelOption?.blockList) ? panelOption.blockList : [];
    const missingBlock = blockList.find((block: any) => {
        // A block that writes its own SQL owns the problem, including the time predicate.
        if (block?.customFullTyping?.use) return false;
        if (isStatViewBlock(block)) return false;
        return hasKnownColumns(block) && !hasSelectedTimeField(block);
    });

    return missingBlock?.id;
};

export const getTimeFieldValidationMessage = (panelOption: any) => {
    return getFirstMissingTimeFieldBlockId(panelOption) ? TIME_FIELD_REQUIRED_MESSAGE : undefined;
};
