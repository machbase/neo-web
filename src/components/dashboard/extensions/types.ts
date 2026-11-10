import type { ComponentType, ReactNode } from 'react';
import type { SettingErrors, Settings, SettingValidators } from './settings';

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
    settings: Settings;
    mode: 'preview' | 'dashboard';
    timeRange: { start: number; end: number } | null;
    distanceRange: { start: string | number; end: string | number };
    title: string;
    theme?: string;
}

export interface ExtensionEditorProps {
    settings: Settings;
    settingErrors: SettingErrors;
    onSettingsChange: (patch: Settings) => void;
}

export interface ExtensionDefinition {
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
