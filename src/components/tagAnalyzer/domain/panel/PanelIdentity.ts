let runtimePanelKeyCounter = 0;

export function createPanelIndexKey(): string {
    runtimePanelKeyCounter += 1;

    return `${Date.now()}-${runtimePanelKeyCounter}-${Math.round(Math.random() * 1_000_000)}`;
}

export function ensureUniquePanelIndexKeys<T extends { key: string }>(panels: T[]): T[] {
    const sUsedPanelKeys = new Set<string>();
    let sDidChangePanelKey = false;
    const sNextPanels = panels.map((panel) => {
        const sPanelKey = panel.key;

        if (sPanelKey.trim().length > 0 && !sUsedPanelKeys.has(sPanelKey)) {
            sUsedPanelKeys.add(sPanelKey);
            return panel;
        }

        const sNextPanelKey = createUnusedPanelIndexKey(sUsedPanelKeys);

        sUsedPanelKeys.add(sNextPanelKey);
        sDidChangePanelKey = true;

        return {
            ...panel,
            key: sNextPanelKey,
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
