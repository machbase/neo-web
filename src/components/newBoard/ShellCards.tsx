import { useState } from 'react';
import XtermTheme from '@/assets/ts/xtermTheme';
import { isCustomShell, shortenShellCommand } from './shellCommand';

/**
 * Shell launchers drawn as small terminals in each shell's own theme, showing the command it runs,
 * so built-in and user-made shells read as what they are instead of as a row of labels.
 */
const DEFAULT_TERMINAL = { background: '#141414', foreground: '#e6e6e6', green: '#3fb950' };

const terminalColors = (aTheme: string | undefined) => {
    const sTheme: any = aTheme && aTheme !== 'default' ? (XtermTheme as any)[aTheme] : undefined;
    return {
        background: sTheme?.background ?? DEFAULT_TERMINAL.background,
        foreground: sTheme?.foreground ?? DEFAULT_TERMINAL.foreground,
        prompt: sTheme?.brightGreen ?? sTheme?.green ?? DEFAULT_TERMINAL.green,
    };
};

interface ShellCardsProps {
    pShells: any[];
    pRenderIcon: (aShell: any) => JSX.Element;
    pOnOpen: (aEvent: React.SyntheticEvent, aShell: any) => void;
    pOnCreate: () => void;
}

export const ShellCards = ({ pShells, pRenderIcon, pOnOpen, pOnCreate }: ShellCardsProps) => {
    const [sHovered, setHovered] = useState<string | undefined>(undefined);

    return (
        <div className="new-board-shell-cards">
            {pShells.map((aShell: any) => {
                const sColors = terminalColors(aShell.theme);
                return (
                    <button
                        type="button"
                        key={aShell.id}
                        className="new-board-shell-card"
                        data-testid={`new-board-${aShell.type}`}
                        onClick={(aEvent) => pOnOpen(aEvent, aShell)}
                        onMouseEnter={() => setHovered(aShell.id)}
                        onMouseLeave={() => setHovered(undefined)}
                        onFocus={() => setHovered(aShell.id)}
                        onBlur={() => setHovered(undefined)}
                    >
                        <span className="new-board-shell-term" style={{ background: sColors.background, color: sColors.foreground }}>
                            <span className="new-board-shell-line">
                                <span style={{ color: sColors.prompt }}>$</span> {shortenShellCommand(aShell.command) || aShell.label}
                            </span>
                            <span className="new-board-shell-line">
                                <span style={{ color: sColors.prompt }}>$</span>{' '}
                                <span className={`new-board-shell-cursor${sHovered === aShell.id ? ' is-blinking' : ''}`} style={{ background: sColors.foreground }} />
                            </span>
                        </span>
                        <span className="new-board-shell-name">
                            <span className="new-board-chip-icon">{pRenderIcon(aShell)}</span>
                            <span className="new-board-shell-label">{aShell.label}</span>
                            {isCustomShell(aShell) ? <span className="new-board-ext">custom</span> : null}
                        </span>
                    </button>
                );
            })}
            <button type="button" className="new-board-shell-card new-board-shell-card--add" data-testid="new-board-shell-create" onClick={pOnCreate}>
                <span className="new-board-shell-term new-board-shell-term--add" aria-hidden="true">
                    +
                </span>
                <span className="new-board-shell-name">
                    <span className="new-board-shell-label">New shell</span>
                    <span className="new-board-shell-hint">Your own command, icon and theme</span>
                </span>
            </button>
        </div>
    );
};
