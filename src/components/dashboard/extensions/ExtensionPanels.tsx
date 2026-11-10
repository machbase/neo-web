import { Component, createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { PANEL_EXTENSIONS_CHANGED } from '@/components/side/AppStore/pkgLifecycle/panelPackageScript';
import { listPanelExtensions, loadPanelExtension } from './registry';
import { extensionKey, type ExtensionData, type ExtensionDefinition, type ExtensionEditorProps, type ExtensionEntry, type ExtensionViewProps } from './types';

type Registry = { entries: ExtensionEntry[]; loads: Map<string, Promise<Map<string, ExtensionDefinition>>>; error?: string };
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
    if (!previous.error && next.length === previous.entries.length && next.every((entry, index) => entry === previous.entries[index])) return previous;
    const validModules = new Set(next.map(moduleKey));
    return { entries: next, loads: new Map([...previous.loads].filter(([key]) => validModules.has(key))) };
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
        if (!entry || !registry) return;
        const key = moduleKey(entry);
        let load = registry.loads.get(key);
        if (!load) {
            load = loadPanelExtension(entry, registry.entries);
            registry.loads.set(key, load);
        }
        let active = true;
        load.then(
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

export function ExtensionView({ data, ...props }: { data?: ExtensionData } & Omit<ExtensionViewProps, 'settings'>) {
    const { definition, error } = usePanelExtension(data?.packageId, data?.typeId);
    if (!data || typeof data.packageId !== 'string' || typeof data.typeId !== 'string' || !data.settings || Array.isArray(data.settings) || typeof data.settings !== 'object' || error) return <div role="alert">{error ?? 'Invalid dashboard extension settings.'}</div>;
    if (!definition) return <div>Loading dashboard extension…</div>;
    if (data.settingsVersion !== definition.settingsVersion) return <div role="alert">This dashboard extension settings version is unsupported.</div>;
    const { View } = definition;
    return (
        <ExtensionErrorBoundary resetOn={data.settings}>
            <View {...props} settings={data.settings} />
        </ExtensionErrorBoundary>
    );
}

export function ExtensionFields({ definition, area, ...props }: ExtensionEditorProps & { definition?: ExtensionDefinition; area: 'Editor' | 'Options' }) {
    const Fields = definition?.[area];
    return Fields ? <Fields {...props} /> : null;
}
