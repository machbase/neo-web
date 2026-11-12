import { Component, createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { PANEL_EXTENSIONS_CHANGED } from '@/components/side/AppStore/pkgLifecycle/panelPackageScript';
import { listPanelExtensions, loadPanelExtension } from './registry';
import { extensionKey, type ExtensionData, type ExtensionDefinition, type ExtensionEditorProps, type ExtensionEntry } from './types';
import { useExtensionHost } from './HostReact';
import type { Settings } from './settings';
import type { HostDistanceRange, HostTimeRange } from './hostTypes';
import { supportsPanelContract } from './contracts';

interface ExtensionViewInput {
    data?: ExtensionData;
    panel?: any;
    mode: 'dashboard' | 'preview';
    timeRange: HostTimeRange | null;
    distanceRange: HostDistanceRange;
    title: string;
    theme?: string;
}

/** Internal draft adapters; extensions receive only ExtensionEditorProps. */
export type ExtensionFieldInput = Pick<ExtensionEditorProps, 'settings' | 'settingErrors'> & {
    panel: any;
    getSettings(): Settings;
    onReplaceSettings(settings: Settings): void;
};

type ModuleLoad = { promise: Promise<Map<string, ExtensionDefinition>>; failed: boolean };
type Registry = { entries: ExtensionEntry[]; loads: Map<string, ModuleLoad>; error?: string };
const RegistryContext = createContext<Registry | undefined>(undefined);
const emptyEntries: ExtensionEntry[] = [];
const moduleKey = ({ packageId, revision, moduleId }: ExtensionEntry) => JSON.stringify([packageId, revision, moduleId]);

function refreshEntries(previous: Registry | undefined, entries: ExtensionEntry[]): Registry {
    if (!previous) return { entries, loads: new Map() };
    const previousEntries = new Map(previous.entries.map((entry) => [extensionKey(entry), entry]));
    const next = entries.map((entry) => {
        const old = previousEntries.get(extensionKey(entry));
        return old && old.revision === entry.revision && old.moduleId === entry.moduleId &&
            old.contractVersion === entry.contractVersion && old.label === entry.label ? old : entry;
    });
    const hasFailedLoad = [...previous.loads.values()].some((load) => load.failed);
    if (!previous.error && !hasFailedLoad && next.length === previous.entries.length && next.every((entry, index) => entry === previous.entries[index])) return previous;
    const validModules = new Set(next.map(moduleKey));
    return { entries: next, loads: new Map([...previous.loads].filter(([key, load]) => validModules.has(key) && !load.failed)) };
}

export function PanelExtensionProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
    const [registry, setRegistry] = useState<Registry>();
    useEffect(() => {
        if (!enabled) return;
        let generation = 0;
        const refresh = async () => {
            const request = ++generation;
            try {
                const entries = await listPanelExtensions();
                if (request === generation) setRegistry((previous) => refreshEntries(previous, entries));
            } catch {
                if (request === generation) setRegistry({ entries: [], loads: new Map(), error: 'Could not read dashboard extensions.' });
            }
        };
        void refresh();
        window.addEventListener(PANEL_EXTENSIONS_CHANGED, refresh);
        return () => {
            generation++;
            window.removeEventListener(PANEL_EXTENSIONS_CHANGED, refresh);
        };
    }, [enabled]);
    return <RegistryContext.Provider value={registry}>{children}</RegistryContext.Provider>;
}

export function useExtensionEntries() {
    return useContext(RegistryContext)?.entries ?? emptyEntries;
}

export function usePanelExtension(packageId?: string, typeId?: string): { definition?: ExtensionDefinition; error?: string } {
    const registry = useContext(RegistryContext);
    const entry = registry?.entries.find((item) => item.packageId === packageId && item.typeId === typeId);
    const [result, setResult] = useState<{ entry: ExtensionEntry; definition?: ExtensionDefinition; error?: string }>();
    useEffect(() => {
        if (!entry || !registry || !supportsPanelContract(entry.contractVersion)) return;
        const key = moduleKey(entry);
        let load = registry.loads.get(key);
        if (!load || load.failed) {
            const pending: ModuleLoad = { promise: loadPanelExtension(entry, registry.entries), failed: false };
            // Keep failures retryable without invalidating a newer request or causing a retry loop.
            void pending.promise.catch(() => { pending.failed = true; });
            registry.loads.set(key, pending);
            load = pending;
        }
        let active = true;
        load.promise.then(
            (definitions) => {
                if (!active) return;
                const definition = definitions.get(entry.typeId);
                setResult(definition ? { entry, definition } : { entry, error: 'Dashboard extension did not register this panel type.' });
            },
            (error) => {
                if (active) setResult({ entry, error: error instanceof Error ? error.message : 'Could not load the dashboard extension.' });
            }
        );
        return () => { active = false; };
    }, [entry, registry]);

    if (!registry || (!packageId && !typeId)) return {};
    if (!entry) return { error: registry.error ?? 'This dashboard extension is unavailable.' };
    if (!supportsPanelContract(entry.contractVersion)) return { error: 'Unsupported dashboard extension version.' };
    if (result?.entry === entry) return result;
    return {};
}

export class ExtensionErrorBoundary extends Component<{ children: ReactNode; resetOn?: unknown }, { failed: boolean }> {
    state = { failed: false };
    static getDerivedStateFromError() {
        return { failed: true };
    }
    componentDidUpdate(previous: Readonly<{ resetOn?: unknown }>) {
        if (this.state.failed && previous.resetOn !== this.props.resetOn) this.setState({ failed: false });
    }
    render() {
        return this.state.failed ? <div role="alert">The dashboard extension could not be displayed.</div> : this.props.children;
    }
}

export function ExtensionView({ data, panel, ...props }: ExtensionViewInput) {
    const { definition, error } = usePanelExtension(data?.packageId, data?.typeId);
    if (!data || typeof data.packageId !== 'string' || typeof data.typeId !== 'string' || !data.settings || Array.isArray(data.settings) || typeof data.settings !== 'object' || error) return <div role="alert">{error ?? 'Invalid dashboard extension settings.'}</div>;
    if (!definition) return <div>Loading dashboard extension…</div>;
    if (data.settingsVersion !== definition.settingsVersion) return <div role="alert">This dashboard extension settings version is unsupported.</div>;
    return (
        <ExtensionErrorBoundary resetOn={data.settings}>
            <BoundExtensionView key={JSON.stringify([data.packageId, data.typeId])} definition={definition} panel={panel ?? { id: 'standalone', type: 'Extension', extension: data }} {...props} settings={data.settings} />
        </ExtensionErrorBoundary>
    );
}

function BoundExtensionView({ definition, panel, settings, ...props }: Omit<ExtensionViewInput, 'data'> & { definition: ExtensionDefinition; settings: Settings }) {
    const bound = useExtensionHost({ panel, definition, surface: props.mode, settings, timeRange: props.timeRange, distanceRange: props.distanceRange });
    const { View } = definition;
    if (!bound.host) return <div>Preparing dashboard extension…</div>;
    return <div ref={bound.rootRef} className="dashboard-extension-view" style={{ width: '100%', height: '100%', minHeight: 0 }}>
        <View settings={settings} context={bound.context} host={bound.host} />
    </div>;
}

export function ExtensionFields({ definition, area, ...props }: ExtensionFieldInput & {
    definition?: ExtensionDefinition; area: 'Editor' | 'Options';
}) {
    const Fields = definition?.[area];
    if (!Fields || !definition) return null;
    return <BoundExtensionFields definition={definition} area={area} {...props} />;
}

function BoundExtensionFields({ definition, area, panel, getSettings, onReplaceSettings, settings, settingErrors }: ExtensionFieldInput & {
    definition: ExtensionDefinition; area: 'Editor' | 'Options';
}) {
    const bound = useExtensionHost({ panel, definition, surface: area === 'Editor' ? 'editor' : 'options', settings, getSettings, onReplaceSettings });
    const Fields = definition[area]!;
    return bound.host ? <Fields settings={settings} settingErrors={settingErrors} context={bound.context} host={bound.host} /> : null;
}
