export const PANEL_CONTRACT_VERSIONS = [1] as const;

export function supportsPanelContract(version: unknown): version is typeof PANEL_CONTRACT_VERSIONS[number] {
    return (PANEL_CONTRACT_VERSIONS as readonly unknown[]).includes(version);
}
