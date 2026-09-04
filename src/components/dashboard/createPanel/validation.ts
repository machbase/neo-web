import { isBaseTimeColumn } from '@/utils/timeFieldColumns';
import { isJsonTypeColumn } from '@/utils/dashboardJsonValue';
import { isNumberTypeColumn } from '@/utils/dashboardUtil';
import { visibleColumnsForTableType } from '@/utils/dashboardTableKind';

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

/** Shown in the Time field's own box, where there is only room for the fact. */
export const TIME_FIELD_MISSING_MESSAGE = 'No DATETIME column.';
/**
 * The Value field's counterpart, shown in its box for the same reason.
 *
 * A value column is a numeric one or a JSON one, so both are named: a VARCHAR-only view offers
 * neither, and the field then sat empty with nothing saying why while the Time field beside it
 * explained itself.
 */
export const VALUE_FIELD_MISSING_MESSAGE = 'No numeric or JSON column.';
/** Shown as a toast when a save is refused, where there is room to say what to do about it. */
export const TIME_FIELD_REQUIRED_MESSAGE = 'This table has no DATETIME column to plot against. Choose another table, or write the query yourself.';
/** The Value field's counterpart, for the same refusal at the same moment. */
export const VALUE_FIELD_REQUIRED_MESSAGE = 'This table has no numeric or JSON column to plot. Choose another table, or write the query yourself.';

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

/**
 * The columns of a block's table that its Value field can offer — the same filter Block applies to
 * fill the picker, read back from the `tableInfo` the block carries.
 *
 * `type` is the block's own table type, which is what decides whether a view's phantom `_RID` is
 * hidden. That matters here rather than being a detail: `_RID` is a LONG, so a view left unfiltered
 * looks like it has something to plot when it has nothing.
 */
const valueColumnsOf = (block: any) =>
    visibleColumnsForTableType(block?.type, Array.isArray(block?.tableInfo) ? block.tableInfo : []).filter(
        (aColumn: any) => !isBaseTimeColumn(aColumn) && (isNumberTypeColumn(aColumn?.[1]) || isJsonTypeColumn(aColumn?.[1]))
    );

/**
 * The first block whose table offers no column to plot — a VARCHAR-only view, say.
 *
 * Deliberately narrower than "the Value field is empty": a `V$<TABLE>_STAT` block saves with an
 * empty value on purpose (its first value row is not even rendered), so judging emptiness would
 * refuse every Gauge / Pie / Liquid fill panel. What is being caught is the case where the picker
 * could not have been filled in, which is the same condition that puts the message in the field.
 */
export const getFirstMissingValueFieldBlockId = (panelOption: any) => {
    if (TAG_INDEPENDENT_PANEL_TYPES.includes(panelOption?.type)) return undefined;

    const blockList = Array.isArray(panelOption?.blockList) ? panelOption.blockList : [];
    const missingBlock = blockList.find((block: any) => {
        // A block that writes its own SQL names its own columns.
        if (block?.customFullTyping?.use) return false;
        if (isStatViewBlock(block)) return false;
        return hasKnownColumns(block) && valueColumnsOf(block).length === 0;
    });

    return missingBlock?.id;
};

export const getValueFieldValidationMessage = (panelOption: any) => {
    return getFirstMissingValueFieldBlockId(panelOption) ? VALUE_FIELD_REQUIRED_MESSAGE : undefined;
};
