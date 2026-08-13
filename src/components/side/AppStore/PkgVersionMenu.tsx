import './PkgVersionMenu.scss';
import { useState } from 'react';
import { VscEdit, VscArrowRight, VscDebugDisconnect, VscShield } from 'react-icons/vsc';
import { ContextMenu, Input, IconButton } from '@/design-system/components';
import { useExperiment } from '@/hooks/useExperiment';
import { stripVPrefix, type PkgVersionRow } from '@/utils/version/utils';

type Props = {
    isOpen: boolean;
    position: { x: number; y: number };
    mode: 'install' | 'update';
    serverVersion: string;
    /**
     * Hub reachability (issue #1452). The rows arrive already masked, but
     * `selectable: false` alone cannot say WHY — this separates "requires a newer
     * server" from "the download source is unreachable". Defaults to `true` so
     * callers that never go offline keep the original rendering.
     */
    online?: boolean;
    /**
     * The hub is off by POLICY rather than broken (issue #1452). Only changes the
     * wording of the note above: telling an operator the hub is "unreachable" when
     * they deliberately disabled it sends them to debug a healthy network.
     * `online` still does the masking — both non-online modes mask identically.
     */
    localOnly?: boolean;
    rows: PkgVersionRow[];
    onSelect: (version: string) => void;
    onClose: () => void;
};

/**
 * Version-selection dropdown for AppStore install/update (issue #1369).
 * Built on the design-system ContextMenu so the card/radius/shadow/hover come
 * from the app's native menu styling. Each row: package version + state badge,
 * with the required server version on the right — which swaps to an "install →" /
 * "update →" action hint on hover for selectable rows.
 *
 * In experiment mode a "Custom version" input is pinned to the bottom so devs can
 * install/update to an arbitrary tag (e.g. a `-dev` build) that isn't in the catalog.
 */
export const PkgVersionMenu = ({ isOpen, position, mode, serverVersion, online = true, localOnly = false, rows, onSelect, onClose }: Props) => {
    const { getExperiment } = useExperiment();
    const [custom, setCustom] = useState('');
    if (!isOpen) return null;

    const experiment = getExperiment();
    const submitCustom = () => {
        const v = custom.trim();
        if (!v) return;
        onSelect(v);
        onClose();
    };

    return (
        <ContextMenu isOpen={isOpen} position={position} onClose={onClose}>
            <div className="pkg-version-menu-header">
                <span>Current server</span>
                <strong>{serverVersion || 'unknown'}</strong>
            </div>
            {!online && (
                <div className="pkg-version-menu-offline">
                    {localOnly ? <VscShield size={12} /> : <VscDebugDisconnect size={12} />}
                    <span>
                        {localOnly
                            ? 'Local-only mode — only locally archived versions can be installed.'
                            : 'Hub unreachable — only locally archived versions can be installed.'}
                    </span>
                </div>
            )}
            {rows.length === 0 && (
                <div className="pkg-version-menu-empty">
                    No published version in the catalog
                    {experiment ? ' — enter a tag below.' : '.'}
                </div>
            )}
            {/* `row.version` is a safe key: the catalog folds a version present in
                both the hub list and the local archive into ONE row (mergeVersions
                is a Map keyed by version), so no version appears twice here. */}
            {rows.map((row) => {
                // Why this row is unselectable, when it is only unselectable
                // because of the network: server-compatible, not the installed
                // version, not a downgrade — just unreachable (issue #1452).
                const offlineBlocked =
                    !online && row.source === 'hub' && !row.selectable && row.eligible && row.state !== 'current' && row.state !== 'belowCurrent';
                return (
                    <ContextMenu.Item
                        key={row.version}
                        disabled={!row.selectable}
                        onClick={() => {
                            onSelect(row.version);
                            onClose();
                        }}
                    >
                        <span className={`pkg-version-menu-row${row.selectable ? ' pkg-version-menu-row--selectable' : ''}`}>
                            <span className="pkg-version-menu-ver">v{stripVPrefix(row.version)}</span>
                            {row.state === 'default' ? (
                                <span className="pkg-version-menu-badge pkg-version-menu-badge--default">default</span>
                            ) : row.state === 'current' ? (
                                <span className="pkg-version-menu-badge pkg-version-menu-badge--current">current</span>
                            ) : row.state === 'ineligible' ? (
                                <span className="pkg-version-menu-badge pkg-version-menu-badge--ineligible">requires upgrade</span>
                            ) : null}
                            {/* Shown online too: with a local archive present the menu
                                mixes "local 1.2.0" and "hub 1.3.0" in one list, and the
                                user should see which one is on this machine. */}
                            {row.source === 'local' && <span className="pkg-version-menu-badge pkg-version-menu-badge--local">local</span>}
                            {offlineBlocked && (
                                <span className="pkg-version-menu-badge pkg-version-menu-badge--offline" title="Not downloaded — the hub is unreachable">
                                    offline
                                </span>
                            )}
                            <span className="pkg-version-menu-min">{row.minServer ? `${row.minServer}+` : 'any'}</span>
                            {row.selectable && <span className="pkg-version-menu-action">{mode} →</span>}
                        </span>
                    </ContextMenu.Item>
                );
            })}
            {experiment && (
                <div className="pkg-version-menu-custom" onClick={(e) => e.stopPropagation()}>
                    <div className="pkg-version-menu-custom-label">
                        <VscEdit size={12} />
                        <span>Custom version</span>
                        <span className="pkg-version-menu-dev">DEV</span>
                    </div>
                    <div className="pkg-version-menu-custom-input">
                        <div className="pkg-version-menu-custom-field">
                            <Input
                                fullWidth
                                size="sm"
                                placeholder="e.g. 1.0.6-dev"
                                value={custom}
                                onChange={(e) => setCustom(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') submitCustom();
                                }}
                            />
                        </div>
                        <IconButton
                            icon={<VscArrowRight size={14} />}
                            aria-label={`${mode} custom version`}
                            variant="primary"
                            size="sm"
                            onClick={submitCustom}
                            disabled={!custom.trim()}
                        />
                    </div>
                </div>
            )}
        </ContextMenu>
    );
};
