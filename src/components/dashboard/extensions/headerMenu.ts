import type { HostHeaderMenuId, HostHeaderPosition } from './hostTypes';

/** Anchor to visible built-ins, then sort each group by priority without changing the inputs. */
export function mergePanelMenuItems<T>(
    builtInItems: readonly ({ id: HostHeaderMenuId; item: T } | false)[],
    extensionItems: readonly { item: T; position?: HostHeaderPosition }[],
): T[] {
    const builtIns = builtInItems.filter((item): item is { id: HostHeaderMenuId; item: T } => !!item);
    const visibleIds = new Set(builtIns.map(item => item.id));
    const before = new Map<HostHeaderMenuId, T[]>(), after = new Map<HostHeaderMenuId, T[]>();
    const legacy: T[] = [], missingAnchor: T[] = [];
    const sorted = [...extensionItems].sort((left, right) => (left.position?.priority ?? 0) - (right.position?.priority ?? 0));
    for (const action of sorted) {
        if (!action.position) { legacy.push(action.item); continue; }
        const anchor = action.position.before ?? action.position.after!;
        if (!visibleIds.has(anchor)) { missingAnchor.push(action.item); continue; }
        const group = action.position.before !== undefined ? before : after;
        const items = group.get(anchor) ?? [];
        items.push(action.item);
        group.set(anchor, items);
    }
    return [...legacy, ...builtIns.flatMap(item => [...(before.get(item.id) ?? []), item.item, ...(after.get(item.id) ?? [])]), ...missingAnchor];
}
