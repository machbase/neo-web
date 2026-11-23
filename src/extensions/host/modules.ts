import type { HostResult } from './types';

type HostMethod = (...args: never[]) => HostResult<unknown> | Promise<HostResult<unknown>>;

export interface HostMethodDefinition<Context, Method extends HostMethod = HostMethod> {
    /** Bind services only; API calls and the area's lifetime own side effects. */
    create(context: Context): Method;
}

export type HostModules<Context> = Record<string, Record<string, HostMethodDefinition<Context>>>;
export type HostFromModules<Modules> = {
    [Namespace in keyof Modules]: {
        [Method in keyof Modules[Namespace]]: Modules[Namespace][Method] extends { create(context: never): infer Call } ? Call : never;
    };
};

export function defineHostMethods<Context>() {
    return <Method extends HostMethod>(definition: HostMethodDefinition<Context, Method>) => definition;
}

function checkName(name: string) {
    if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(name) || ['constructor', 'prototype', '__proto__'].includes(name)) {
        throw new Error(`Invalid host API name: ${name}`);
    }
}

/** Compose an area's API from module definitions; no dashboard or React dependency. */
export function createHostApi<Context, Modules extends HostModules<Context>>(modules: Modules, context: Context): HostFromModules<Modules> {
    const host: Record<string, Record<string, HostMethod>> = {};
    // Validate every name before running factories, so a rejected definition has no partial setup.
    for (const [namespace, methods] of Object.entries(modules)) {
        checkName(namespace);
        Object.keys(methods).forEach(checkName);
    }
    for (const [namespace, methods] of Object.entries(modules)) {
        host[namespace] = {};
        for (const [name, definition] of Object.entries(methods)) host[namespace][name] = definition.create(context);
    }
    return host as HostFromModules<Modules>;
}
