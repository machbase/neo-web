/**
 * A group is a named set of shortcuts. It never holds the things themselves: removing an item, or
 * the whole group, leaves the file, timer or package where it was.
 */
export type GroupItemKind = 'file' | 'folder' | 'package' | 'timer' | 'bridge' | 'shell' | 'table' | 'token' | 'cert';

export interface GroupItem {
    kind: GroupItemKind;
    /**
     * What the item is looked up by, which is whatever its own panel keys it on: the full path for
     * files and folders, the name for packages and bridges, the numeric id (as text) for timers,
     * tokens and certificates, the shell id, and `DB.USER.TABLE` for tables.
     */
    ref: string;
    /** Name shown when the item can no longer be found. */
    label: string;
}

export type GroupVisibility = 'private' | 'shared';

export interface Group {
    id: string;
    name: string;
    /** One line shown under the name, e.g. what the group is for. */
    caption?: string;
    color: string;
    visibility: GroupVisibility;
    /** Account that created it. Shared groups can be changed by anyone who sees them. */
    owner: string;
    items: GroupItem[];
    updatedAt: number;
}

export const GROUP_CAPTION_MAX = 120;
export const GROUP_COLORS = ['#4d95f2', '#3fb8af', '#5fb85f', '#f5c142', '#fc7676', '#b48ef0'];
export const GROUPS_VERSION = 1;

export const GROUP_KIND_ORDER: GroupItemKind[] = ['file', 'folder', 'package', 'timer', 'bridge', 'shell', 'table', 'token', 'cert'];

export const itemKey = (aItem: Pick<GroupItem, 'kind' | 'ref'>) => `${aItem.kind}:${aItem.ref}`;

export const newGroupId = () => `grp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const KINDS = new Set<string>(GROUP_KIND_ORDER);

/** Groups read from a file another build may have written: keep what is well formed, drop the rest. */
export const parseGroups = (aRaw: unknown, aVisibility: GroupVisibility): Group[] => {
    const sGroups = (aRaw as any)?.groups;
    if (!Array.isArray(sGroups)) return [];
    return sGroups
        .filter((aGroup: any) => aGroup && typeof aGroup.id === 'string' && aGroup.id && typeof aGroup.name === 'string')
        .map((aGroup: any) => {
            const sSeen = new Set<string>();
            const sItems: GroupItem[] = (Array.isArray(aGroup.items) ? aGroup.items : [])
                .filter((aItem: any) => aItem && KINDS.has(aItem.kind) && typeof aItem.ref === 'string' && aItem.ref)
                .map((aItem: any) => ({ kind: aItem.kind, ref: aItem.ref, label: typeof aItem.label === 'string' && aItem.label ? aItem.label : aItem.ref }))
                .filter((aItem: GroupItem) => {
                    const sKey = itemKey(aItem);
                    if (sSeen.has(sKey)) return false;
                    sSeen.add(sKey);
                    return true;
                });
            return {
                id: aGroup.id,
                name: aGroup.name,
                ...(typeof aGroup.caption === 'string' && aGroup.caption.trim() ? { caption: aGroup.caption.trim().slice(0, GROUP_CAPTION_MAX) } : {}),
                color: typeof aGroup.color === 'string' && /^#[0-9a-f]{6}$/i.test(aGroup.color) ? aGroup.color : GROUP_COLORS[0],
                visibility: aVisibility,
                owner: typeof aGroup.owner === 'string' ? aGroup.owner : '',
                items: sItems,
                updatedAt: typeof aGroup.updatedAt === 'number' ? aGroup.updatedAt : 0,
            };
        });
};

export const serializeGroups = (aGroups: Group[]) => ({
    version: GROUPS_VERSION,
    // Visibility is not stored: the file a group is written to already says it.
    groups: aGroups.map((aGroup) => ({ id: aGroup.id, name: aGroup.name, ...(aGroup.caption ? { caption: aGroup.caption } : {}), color: aGroup.color, owner: aGroup.owner, items: aGroup.items, updatedAt: aGroup.updatedAt })),
});

/** `/dir/sub/` + `name` for files; folders are stored without a trailing slash. */
export const splitFilePath = (aRef: string) => {
    const sIndex = aRef.lastIndexOf('/');
    return { path: aRef.slice(0, sIndex + 1) || '/', name: aRef.slice(sIndex + 1) };
};
