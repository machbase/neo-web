import { useEffect, useState } from 'react';
import { MdDeleteOutline, MdOutlineEdit, MdOutlinePalette } from 'react-icons/md';
import { IconButton, Modal } from '@/design-system/components';
import {
    deleteLocalTheme,
    editInThemeBuilder,
    localThemeChoice,
    readLocalThemes,
    readStoredTheme,
    setTheme,
    themeKey,
    themeVarsOf,
    LOCAL_THEME_PKG,
    type ThemeChoice,
} from '@/design-system/theme';
import type { ThemeToken } from '@/design-system/theme/themeTokens';
import { ConfirmModal } from '@/components/modal/ConfirmModal';
import { useAppStoreTabs } from '@/components/side/AppStore/appTabs';
import { listThemePackages, type ThemePackage } from './installedThemes';
import { loadThemeTokens, loadThemeVars, swatchOf } from './themeCards';
import './ThemeModal.scss';

interface ThemeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const DEFAULT_KEY = '';

/** One of this browser's themes, as its card shows it. */
interface MineTheme extends ThemeChoice {
    /** The strip the builder saved with it; none: worked out from its variables. */
    swatch: string[];
    vars: Record<string, string>;
    saved?: number;
}

const savedText = (aSaved: number) => `saved ${new Date(aSaved).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}`;

/**
 * The theme for this browser, chosen from cards as the theme builder's start cards are (its name,
 * light or dark, a strip of its colors — themeCards.ts): ready to use — the built-in dark default and
 * every theme an installed package lists (a theme package's, the theme builder's presets) — and the
 * user's own, made in the theme builder and kept in this browser, which can be opened in the builder
 * again or deleted. A click applies at once (and is remembered); there is nothing to confirm.
 */
export const ThemeModal = ({ isOpen, onClose }: ThemeModalProps) => {
    // undefined: still looking; null: /public/ could not be listed.
    const [sPackages, setPackages] = useState<ThemePackage[] | null | undefined>(undefined);
    const [sSelected, setSelected] = useState<string>(() => {
        const sStored = readStoredTheme();
        return sStored ? themeKey(sStored) : DEFAULT_KEY;
    });
    const { openAppViewTab } = useAppStoreTabs();
    // The user's own themes, kept in this browser by the theme builder. They are deleted here too: they
    // stay when the builder is uninstalled (they are the user's, and need no package to be drawn).
    const readMine = (): MineTheme[] => readLocalThemes().map((t) => ({ ...localThemeChoice(t), swatch: t.swatch, vars: themeVarsOf(t.css), ...(t.saved ? { saved: t.saved } : {}) }));
    const [sMine, setMine] = useState<MineTheme[]>(readMine);
    const [sDeleting, setDeleting] = useState<MineTheme | null>(null);
    const [sDeleteError, setDeleteError] = useState<string | null>(null);
    // the strips a theme does not list are worked out from the token list and, for a package's theme,
    // its stylesheet's variables (by themeKey)
    const [sTokens, setTokens] = useState<ThemeToken[] | null | undefined>(undefined);
    const [sPackageVars, setPackageVars] = useState<Record<string, Record<string, string> | null>>({});

    useEffect(() => {
        let sAlive = true;
        loadThemeTokens().then((aTokens) => sAlive && setTokens(aTokens));
        return () => {
            sAlive = false;
        };
    }, []);

    useEffect(() => {
        let sAlive = true;
        listThemePackages().then((aPackages) => {
            if (!sAlive) return;
            setPackages(aPackages);
            if (!aPackages) return;
            aPackages.forEach((p) =>
                p.themes
                    .filter((t) => t.swatch.length === 0)
                    .forEach((t) => loadThemeVars(t).then((aVars) => sAlive && setPackageVars((prev) => ({ ...prev, [themeKey(t)]: aVars }))))
            );
            // The remembered theme was uninstalled (or deleted in the builder): its stylesheet
            // already 404s and the dark defaults show, so say so — and stop requesting it.
            const sStored = readStoredTheme();
            const sKnown = (t: ThemeChoice) => themeKey(t) === themeKey(sStored as ThemeChoice);
            if (sStored && !(sStored.pkg === LOCAL_THEME_PKG ? sMine.some(sKnown) : aPackages.some((p) => p.themes.some(sKnown)))) {
                setTheme(null);
                setSelected(DEFAULT_KEY);
            }
        });
        return () => {
            sAlive = false;
        };
    }, [sMine]);

    const choose = (aTheme: ThemeChoice | null) => {
        // the card's extras (strip, variables, saved) are not part of the choice
        setSelected(aTheme ? themeKey(aTheme) : DEFAULT_KEY);
        setTheme(aTheme && { pkg: aTheme.pkg, stylesheet: aTheme.stylesheet, label: aTheme.label, scheme: aTheme.scheme, ...(aTheme.version ? { version: aTheme.version } : {}) });
    };

    const deleteMine = (aTheme: MineTheme) => {
        const sResult = deleteLocalTheme(aTheme.stylesheet.replace(/\.css$/, ''));
        setDeleting(null);
        if (!sResult.ok) {
            setDeleteError(sResult.reason);
            return;
        }
        setDeleteError(null);
        setMine(readMine());
        // the one in use gave way to the dark default (deleteLocalTheme)
        if (sSelected === themeKey(aTheme)) setSelected(DEFAULT_KEY);
    };

    const openApp = (aPkg: string) => {
        openAppViewTab(aPkg);
        onClose();
    };

    const sApps = sPackages?.filter((p) => p.hasApp) ?? [];
    // the app the user's themes are made in (the theme builder): Edit opens it on the theme
    const sBuilder = sApps[0];

    const editMine = (aTheme: MineTheme) => {
        if (!sBuilder) return;
        editInThemeBuilder(aTheme);
        openApp(sBuilder.pkg);
    };

    /** The strip a theme lists, else the one its variables give (null: not known yet, or the token list could not be read). */
    const stripOf = (aListed: string[], aVars: Record<string, string> | null | undefined) => (aListed.length > 0 ? aListed : sTokens && aVars ? swatchOf(sTokens, aVars) : null);

    /** A theme's card: its name, whether it is in use (else light or dark), and its colors. */
    const card = (aKey: string, aTestId: string, aLabel: string, aKind: string, aSwatch: string[] | null, aTheme: ThemeChoice | null, aMine?: MineTheme) => {
        const sChecked = sSelected === aKey;
        return (
            <div key={aKey || 'default'} className={`theme-modal__card${sChecked ? ' theme-modal__card--selected' : ''}`}>
                <button type="button" role="radio" aria-checked={sChecked} className="theme-modal__option" data-testid={`theme-option-${aTestId}`} onClick={() => choose(aTheme)}>
                    <span className="theme-modal__card-head">
                        <span className="theme-modal__label">{aLabel}</span>
                        <span className="theme-modal__detail">{sChecked ? 'In use' : aKind}</span>
                    </span>
                    {/* the theme's own colors, not the theme in use: fixed on purpose */}
                    <span className={`theme-modal__swatch${aSwatch && aSwatch.length > 0 ? '' : ' theme-modal__swatch--empty'}`} aria-hidden="true">
                        {aSwatch?.map((c, i) => <i key={i} style={{ background: c }} />)}
                    </span>
                </button>
                {aMine && (
                    <div className="theme-modal__card-foot">
                        <span className="theme-modal__saved">{aMine.saved ? savedText(aMine.saved) : ''}</span>
                        {sBuilder && (
                            <IconButton
                                icon={<MdOutlineEdit size={15} />}
                                variant="ghost"
                                size="xsm"
                                aria-label={`Edit ${aMine.label} in ${sBuilder.label}`}
                                data-testid={`theme-edit-${aKey}`}
                                onClick={() => editMine(aMine)}
                            />
                        )}
                        <IconButton
                            icon={<MdDeleteOutline size={15} />}
                            variant="ghost"
                            size="xsm"
                            aria-label={`Delete ${aMine.label}`}
                            data-testid={`theme-delete-${aKey}`}
                            onClick={() => setDeleting(aMine)}
                        />
                    </div>
                )}
            </div>
        );
    };

    const schemeText = (aTheme: ThemeChoice) => (aTheme.scheme === 'light' ? 'Light' : 'Dark');

    // A single-theme package keeps the package's name as the test id (as before packages could hold
    // several); a theme from an index is named by package and stylesheet.
    const packageCards = (aPackage: ThemePackage) => {
        const sSingle = !aPackage.hasApp && aPackage.themes.length === 1 && aPackage.label === aPackage.themes[0].label;
        return aPackage.themes.map((t) => card(themeKey(t), sSingle ? t.pkg : themeKey(t), t.label, schemeText(t), stripOf(t.swatch, sPackageVars[themeKey(t)]), t));
    };

    return (
        <Modal.Root isOpen={isOpen} onClose={onClose} data-testid="theme-modal">
            <Modal.Header>
                <Modal.Title>
                    <MdOutlinePalette />
                    <span> Theme</span>
                </Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body>
                <div className="theme-modal__list" role="radiogroup" aria-label="Theme">
                    <div className="theme-modal__group" role="group" aria-label="Ready to use">
                        <div className="theme-modal__group-head">
                            <span className="theme-modal__group-label">Ready to use</span>
                        </div>
                        <div className="theme-modal__grid">
                            {card(DEFAULT_KEY, 'default', 'Dark', 'Built in', stripOf([], {}), null)}
                            {sPackages?.flatMap(packageCards)}
                        </div>
                    </div>
                    {(sMine.length > 0 || !!sBuilder) && (
                        <div className="theme-modal__group" role="group" aria-label="My themes">
                            <div className="theme-modal__group-head">
                                <span className="theme-modal__group-label">My themes</span>
                                <span className="theme-modal__detail">this browser</span>
                            </div>
                            {sMine.length > 0 ? (
                                <div className="theme-modal__grid">{sMine.map((t) => card(themeKey(t), themeKey(t), t.label, schemeText(t), stripOf(t.swatch, t.vars), t, t))}</div>
                            ) : (
                                <p className="theme-modal__note">Themes you save in {sBuilder?.label} are listed here.</p>
                            )}
                        </div>
                    )}
                </div>
                {sPackages === undefined && <p className="theme-modal__note">Looking for installed themes…</p>}
                {sPackages?.length === 0 && sMine.length === 0 && <p className="theme-modal__note">No themes installed yet. Install Theme Builder from the App Store.</p>}
                {sPackages === null && <p className="theme-modal__note">The installed packages could not be read.</p>}
                {sDeleteError && <p className="theme-modal__note">Could not delete the theme: {sDeleteError}</p>}
            </Modal.Body>
            <Modal.Footer>
                {sApps.map((p) => (
                    <Modal.Cancel key={p.pkg} onClick={() => openApp(p.pkg)} data-testid={`theme-open-app-${p.pkg}`}>
                        Open {p.label}
                    </Modal.Cancel>
                ))}
                <Modal.Cancel onClick={onClose}>Close</Modal.Cancel>
            </Modal.Footer>
            {sDeleting && (
                <ConfirmModal
                    data-testid="theme-delete-dialog"
                    setIsOpen={(aOpen) => !aOpen && setDeleting(null)}
                    pCallback={() => deleteMine(sDeleting)}
                    pContents={<div className="body-content">{`Delete "${sDeleting.label}" from this browser? It cannot be brought back.`}</div>}
                />
            )}
        </Modal.Root>
    );
};
