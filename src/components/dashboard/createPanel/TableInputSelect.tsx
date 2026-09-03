import React, { useMemo, useState } from 'react';
import { InputSelect, type InputSelectOptionBadge } from '@/design-system/components';
import { splitQualifiedTableName } from '@/utils/qualifiedTableName';
import { getTableTypeColor } from '@/components/side/DBExplorer/utils';
import styles from './TableInputSelect.module.scss';

/**
 * One row of the panel editor's Table dropdown.
 *
 * Since v8.7 every table-list row is `database.owner.table` (see `parseDashboardTables`), and
 * that name is 225–277px wide at the editor's 13px Pretendard — against 118px of usable width in
 * a 160px field. Rendered as one line it showed `MACHBASEDB.SYS.` and nothing else, so the field
 * identified no table at all. Splitting the name is what makes it readable: the last segment is
 * what the user picks by, the leading segments are context.
 */
export interface TableSelectOption {
    /** The name a query uses. Stored in the block config verbatim. */
    value: string;
    /** Its last segment — the table's own name. */
    label: string;
    /** `database · owner`. Always shown: the same table name can exist in several databases. */
    description: string;
    /** Its table type, in DB Explorer's colour for that type. Absent for a name with no known type. */
    badge?: InputSelectOptionBadge;
}

/**
 * The type chip for a table row, in the colour DB Explorer paints that type in the tree — so a
 * transaction table reads the same green here as it does there, and the two screens agree.
 *
 * Takes `getTableType` output ('tag' | 'log' | 'view' | 'transaction' | …). An unknown or absent
 * type yields no chip rather than a grey one that says nothing.
 */
const tableTypeBadgeOf = (aTableType?: string): InputSelectOptionBadge | undefined => {
    const sType = String(aTableType ?? '').trim();
    if (!sType) return undefined;
    return { label: sType.toUpperCase(), color: getTableTypeColor(sType) };
};

/**
 * Build an option from a qualified name.
 *
 * The name is the only input needed, including for the `V$<TABLE>_STAT` views a Gauge / Pie /
 * Liquid fill panel lists: `qualifySiblingObject` decorates the last segment alone, so the
 * database and owner it is read under are still the leading segments.
 */
export const tableSelectOptionOf = (aQualifiedName: string, aTableType?: string): TableSelectOption => ({
    value: String(aQualifiedName ?? ''),
    ...splitQualifiedTableName(aQualifiedName),
    badge: tableTypeBadgeOf(aTableType),
});

interface TableInputSelectProps {
    label: React.ReactNode;
    options: TableSelectOption[];
    /** The block's stored table name — a qualified name, or a dashboard variable. */
    value: string;
    /** Free-typed text. Stored verbatim, which is how `{{variable}}` tables are entered. */
    onInputChange: (aValue: string) => void;
    onSelectChange: (aValue: string) => void;
    style?: React.CSSProperties;
}

/**
 * The Table field: shows the bare name collapsed, the whole name while it is being edited.
 *
 * The collapse only affects what is displayed — the block still stores the qualified name. It has
 * to expand on focus, because typing replaces the field's whole value: editing a character of
 * `STOCK_HISTORY` would store that bare name, and a bare name resolves against whichever database
 * the session is in. `ATABLE` and `DEMO_TAG` each exist in two databases on the test server, so
 * that silently reads a different table rather than failing.
 *
 * What the collapse drops — the database and owner — reappears under the label, which has room for
 * a second line without making the field taller than the ones below it.
 */
export const TableInputSelect = ({ label, options, value, onInputChange, onSelectChange, style }: TableInputSelectProps) => {
    const [sIsEditing, setIsEditing] = useState(false);

    const sMatched = useMemo(() => options.find((aOption) => aOption.value === value), [options, value]);
    // The full name is worth a tooltip even in the list, where the description already carries it
    // in pieces — it is the string a query needs, ready to read in one go.
    const sOptions = useMemo(() => options.map((aOption) => ({ ...aOption, tooltip: aOption.value })), [options]);

    return (
        <InputSelect
            label={
                <span className={styles['label-stack']}>
                    <span className={styles['label-main']}>{label}</span>
                    {/* The line is held even with nothing to say — a variable table has no database
                        or owner — so that typing one does not resize the row under the cursor. */}
                    <span className={styles['label-description']}>{sMatched?.description ?? '\u00A0'}</span>
                </span>
            }
            labelPosition="left"
            labelAlign="right"
            type="text"
            size="md"
            options={sOptions}
            value={sIsEditing || !sMatched ? value : sMatched.label}
            title={value}
            onFocus={() => setIsEditing(true)}
            onBlur={() => setIsEditing(false)}
            onChange={(aEvent) => onInputChange(aEvent.target.value)}
            selectValue={value}
            onSelectChange={onSelectChange}
            menuWidth="auto"
            // The list runs to every table on the server across every database, which is well past
            // what a 300px menu shows at once. Typing the field itself cannot narrow it — that text
            // is the stored value — so the filter lives in the menu.
            searchable
            searchPlaceholder="Search tables..."
            style={style}
        />
    );
};
