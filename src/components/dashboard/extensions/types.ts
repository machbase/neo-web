import type { ComponentType, ReactNode } from 'react';
import type { SettingErrors, Settings, SettingValidators } from './settings';
import type { ExtensionContext, ExtensionHost } from './hostTypes';

export interface ExtensionId {
    packageId: string;
    typeId: string;
}

export interface ExtensionEntry extends ExtensionId {
    label: string;
    contractVersion: number;
    revision: string;
    moduleId: number;
}

export interface ExtensionData extends ExtensionId {
    settingsVersion: number;
    settings: Settings;
}

export interface ExtensionViewProps {
    context: ExtensionContext;
    host: ExtensionHost;
    settings: Settings;
}

export interface ExtensionEditorProps {
    context: ExtensionContext;
    host: ExtensionHost;
    settings: Settings;
    settingErrors: SettingErrors;
}

export interface ExtensionDefinition {
    contractVersion?: 1;
    typeId: string;
    label: string;
    icon?: ReactNode;
    settingsVersion: number;
    defaults: Settings;
    commonOptions?: ('title' | 'theme')[];
    validateSettings?: SettingValidators;
    View: ComponentType<ExtensionViewProps>;
    Editor?: ComponentType<ExtensionEditorProps>;
    Options?: ComponentType<ExtensionEditorProps>;
}

export const isExtensionPanel = (panel: { type?: string } | null | undefined) => panel?.type === 'Extension';
export const extensionKey = ({ packageId, typeId }: ExtensionId) => JSON.stringify([packageId, typeId]);
