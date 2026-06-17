import type { PanelInfo } from './PanelDomain';

let runtimePanelKeyCounter = 0;

export function createPanelIndexKey(): string {
    runtimePanelKeyCounter += 1;

    return `${Date.now()}-${runtimePanelKeyCounter}-${Math.round(Math.random() * 1_000_000)}`;
}

export function ensureUniquePanelIndexKeys(panels: PanelInfo[]): PanelInfo[] {
    const sUsedPanelKeys = new Set<string>();
    let sDidChangePanelKey = false;
    const sNextPanels = panels.map((panel) => {
        const sPanelKey = panel.data.index_key;

        if (sPanelKey.trim().length > 0 && !sUsedPanelKeys.has(sPanelKey)) {
            sUsedPanelKeys.add(sPanelKey);
            return panel;
        }

        const sNextPanelKey = createUnusedPanelIndexKey(sUsedPanelKeys);

        sUsedPanelKeys.add(sNextPanelKey);
        sDidChangePanelKey = true;

        return {
            ...panel,
            data: {
                ...panel.data,
                index_key: sNextPanelKey,
            },
        };
    });

    return sDidChangePanelKey ? sNextPanels : panels;
}

function createUnusedPanelIndexKey(usedPanelKeys: Set<string>): string {
    let sPanelKey = createPanelIndexKey();

    while (usedPanelKeys.has(sPanelKey)) {
        sPanelKey = createPanelIndexKey();
    }

    return sPanelKey;
}
