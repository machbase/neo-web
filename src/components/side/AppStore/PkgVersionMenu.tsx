import './PkgVersionMenu.scss';
import { useState } from 'react';
import { VscEdit, VscArrowRight } from 'react-icons/vsc';
import { ContextMenu, Input, IconButton } from '@/design-system/components';
import { useExperiment } from '@/hooks/useExperiment';
import { stripVPrefix, type PkgVersionRow } from '@/utils/version/utils';

type Props = {
    isOpen: boolean;
    position: { x: number; y: number };
    mode: 'install' | 'update';
    serverVersion: string;
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
export const PkgVersionMenu = ({ isOpen, position, mode, serverVersion, rows, onSelect, onClose }: Props) => {
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
            {rows.map((row) => (
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
                        <span className="pkg-version-menu-min">{row.minServer ? `${row.minServer}+` : 'any'}</span>
                        {row.selectable && <span className="pkg-version-menu-action">{mode} →</span>}
                    </span>
                </ContextMenu.Item>
            ))}
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
