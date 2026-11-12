import { defineHostMethods } from '@/extensions/host/modules';
import { failure, success } from '@/extensions/host/results';
import type { DashboardHostModuleContext } from '../hostModuleContext';
import { validateExtensionSettings } from '@/extensions/settings';
import type { HostHandle, HostRangeRequest, HostOverlay, HostBorder, HostResult } from '../hostTypes';

const method = defineHostMethods<DashboardHostModuleContext>();
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

export const panelsModule = {
    setRangeOverride: method({
        create: (context) => (panelId: string, request: HostRangeRequest): HostResult<HostHandle> => {
            if (!request || !['time', 'distance'].includes(request.kind) || !['fixed', 'board'].includes(request.source)) return failure('INVALID_INPUT', 'A range kind and source are required.');
            const guard = context.checkTarget(panelId, `range:${request.kind}`);
            if (!guard.ok) return guard;
            const checked = validateExtensionSettings({ request });
            if (!checked.settings) return failure('INVALID_INPUT', 'The range request must contain JSON values.');
            if (request.followBoardRefresh !== undefined && typeof request.followBoardRefresh !== 'boolean' || request.followPanelRefresh !== undefined && typeof request.followPanelRefresh !== 'boolean') return failure('INVALID_INPUT', 'Refresh policies must be boolean.');
            if (request.source === 'fixed') {
                const range = request.range;
                if (!range || (request.kind === 'time' && (typeof range.start !== 'number' || typeof range.end !== 'number' || !Number.isFinite(range.start) || !Number.isFinite(range.end) || range.start > range.end)) || (request.kind === 'distance' && (![range.start, range.end].every((value) => typeof value === 'string' || typeof value === 'number')))) return failure('INVALID_INPUT', 'A valid fixed range is required.');
            }
            return success(context.upsert('range', panelId, copy(request)));
        },
    }),
    clearRangeOverride: method({
        create: (context) => (handle: HostHandle): HostResult<void> => {
            return context.clear('range', handle);
        },
    }),
    setOverlay: method({
        create: (context) => (panelId: string, overlay: HostOverlay): HostResult<HostHandle> => {
            const guard = context.checkTarget(panelId, 'overlay');
            if (!guard.ok) return guard;
            if (!overlay || typeof overlay.id !== 'string' || !overlay.id || !['line', 'band'].includes(overlay.kind) || !['x', 'y'].includes(overlay.axis)) return failure('INVALID_INPUT', 'An overlay ID, kind and axis are required.');
            const coordinates = overlay.kind === 'line' ? [overlay.value] : [overlay.start, overlay.end];
            if (!coordinates.every((value) => typeof value === 'string' || typeof value === 'number' && Number.isFinite(value)) || !validateExtensionSettings({ overlay }).settings || (overlay.color !== undefined && typeof overlay.color !== 'string') || (overlay.width !== undefined && (typeof overlay.width !== 'number' || !Number.isFinite(overlay.width) || overlay.width <= 0))) return failure('INVALID_INPUT', 'Overlay coordinates and appearance must be valid data values.');
            return success(context.upsert('overlay', panelId, copy(overlay)));
        },
    }),
    clearOverlay: method({
        create: (context) => (handle: HostHandle): HostResult<void> => {
            return context.clear('overlay', handle);
        },
    }),
    setBorder: method({
        create: (context) => (panelId: string, border: HostBorder): HostResult<HostHandle> => {
            const guard = context.checkTarget(panelId, 'border');
            if (!guard.ok) return guard;
            if (!border || !validateExtensionSettings({ border }).settings || typeof border.color !== 'string' || !border.color.trim()) return failure('INVALID_INPUT', 'A border color is required.');
            const data = { color: border.color };
            return success(context.upsert('border', panelId, data));
        },
    }),
    clearBorder: method({
        create: (context) => (handle: HostHandle): HostResult<void> => {
            return context.clear('border', handle);
        },
    }),
    refresh: method({
        create: (context) => (panelId: string): HostResult<void> => {
            const guard = context.checkTarget(panelId, 'refresh');
            if (!guard.ok) return guard;
            context.refresh(panelId);
            return success(undefined);
        },
    }),
};
