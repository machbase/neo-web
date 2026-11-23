import { validateExtensionSettings } from '../settings';
import { defineHostMethods } from './modules';
import { normalizeHostPath } from './paths';
import { callHostAdapter, failure, success } from './results';
import type { ApplicationHostContext, HostFileSelection, HostNotification, HostOpenRequest, HostResult } from './types';

const method = defineHostMethods<ApplicationHostContext>();

export const filesModule = {
    select: method({
        create: (context) => (request: HostFileSelection = {}): Promise<HostResult<string | null>> => {
            if (!request || typeof request !== 'object' || Array.isArray(request)) return Promise.resolve(failure('INVALID_INPUT', 'File filters and start path are invalid.'));
            try {
                // Preserve omitted optional fields, while rejecting sparse arrays before copying.
                const normalizedRequest = {
                    ...(request.extensions === undefined ? {} : { extensions: request.extensions }),
                    ...(request.startPath === undefined ? {} : { startPath: request.startPath }),
                };
                const validated = validateExtensionSettings({ request: normalizedRequest });
                if (!validated.settings) return Promise.resolve(failure('INVALID_INPUT', 'File filters and start path must contain JSON values without empty slots.'));
                const checked = validated.settings.request as HostFileSelection;
                if ((checked.startPath !== undefined && typeof checked.startPath !== 'string') || (checked.extensions !== undefined && (!Array.isArray(checked.extensions) || checked.extensions.some((extension) => typeof extension !== 'string' || !extension)))) return Promise.resolve(failure('INVALID_INPUT', 'File filters and start path are invalid.'));
                if (checked.startPath !== undefined) checked.startPath = normalizeHostPath(checked.startPath);
                return callHostAdapter(context, context.adapters?.selectFile ? () => context.adapters!.selectFile!(checked, context.signal) : undefined);
            } catch { return Promise.resolve(failure('INVALID_INPUT', 'The file selection start path is invalid.')); }
        },
    }),
};

export const navigationModule = {
    open: method({
        create: (context) => (request: HostOpenRequest): Promise<HostResult<void>> => {
            if (!request || typeof request.path !== 'string' || !request.path || !['dashboard', 'file'].includes(request.kind) || (request.target !== undefined && !['tab', 'window'].includes(request.target))) return Promise.resolve(failure('INVALID_INPUT', 'A path, file kind and valid target are required.'));
            return callHostAdapter(context, context.adapters?.open ? () => context.adapters!.open!({ ...request }, context.signal) : undefined);
        },
    }),
};

export const viewportModule = {
    enterFullscreen: method({
        create: (context) => (): Promise<HostResult<void>> => callHostAdapter(context, context.adapters?.enterFullscreen ? () => context.adapters!.enterFullscreen!() : undefined),
    }),
    exitFullscreen: method({
        create: (context) => (): Promise<HostResult<void>> => callHostAdapter(context, context.adapters?.exitFullscreen ? () => context.adapters!.exitFullscreen!() : undefined),
    }),
};

export const uiModule = {
    notify: method({
        create: (context) => (request: HostNotification): HostResult<void> => {
            const guard = context.checkActive();
            if (!guard.ok) return guard;
            if (!request || typeof request.message !== 'string') return failure('INVALID_INPUT', 'A notification message is required.');
            if (!context.adapters?.notify) return failure('UNSUPPORTED', 'Notifications are unavailable.');
            try { context.adapters.notify({ ...request }); return success(undefined); }
            catch { return failure('ADAPTER_ERROR', 'The notification could not be shown.'); }
        },
    }),
    confirm: method({
        create: (context) => (message: string): Promise<HostResult<boolean>> => typeof message !== 'string'
            ? Promise.resolve(failure('INVALID_INPUT', 'A confirmation message is required.'))
            : callHostAdapter(context, context.adapters?.confirm ? () => context.adapters!.confirm!(message) : undefined),
    }),
};

export const applicationHostModules = { viewport: viewportModule, files: filesModule, navigation: navigationModule, ui: uiModule };
