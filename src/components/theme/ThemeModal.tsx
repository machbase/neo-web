import { useEffect, useState } from 'react';
import { MdOutlinePalette } from 'react-icons/md';
import { Modal } from '@/design-system/components';
import { localThemeChoice, readLocalThemes, readStoredTheme, setTheme, themeKey, LOCAL_THEME_PKG, type ThemeChoice } from '@/design-system/theme';
import { useAppStoreTabs } from '@/components/side/AppStore/appTabs';
import { listThemePackages, type InstalledTheme, type ThemePackage } from './installedThemes';
import './ThemeModal.scss';

interface ThemeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const DEFAULT_KEY = '';
const DARK_SWATCH = ['#1e1e1e', '#252525', '#f1f1f1', '#005fb8', '#626263', '#71e071', '#ff5353'];

/**
 * The theme for this browser: the built-in dark default or an installed theme. A package can
 * hold several (the theme builder's presets and the themes made in it); they are listed under
 * the package, and a package with an app offers to open it. A click applies at once (and is
 * remembered); there is nothing to confirm.
 */
export const ThemeModal = ({ isOpen, onClose }: ThemeModalProps) => {
    // undefined: still looking; null: /public/ could not be listed.
    const [sPackages, setPackages] = useState<ThemePackage[] | null | undefined>(undefined);
    const [sSelected, setSelected] = useState<string>(() => {
        const sStored = readStoredTheme();
        return sStored ? themeKey(sStored) : DEFAULT_KEY;
    });
    const { openAppViewTab } = useAppStoreTabs();
    // The user's own themes, kept in this browser by the theme builder.
    const [sMine] = useState<InstalledTheme[]>(() => readLocalThemes().map((t) => ({ ...localThemeChoice(t), swatch: t.swatch, detail: t.note || 'Mine' })));

    useEffect(() => {
        let sAlive = true;
        listThemePackages().then((aPackages) => {
            if (!sAlive) return;
            setPackages(aPackages);
            if (!aPackages) return;
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
        // the row's extras (swatch, detail) are not part of the choice
        setSelected(aTheme ? themeKey(aTheme) : DEFAULT_KEY);
        setTheme(aTheme && { pkg: aTheme.pkg, stylesheet: aTheme.stylesheet, label: aTheme.label, scheme: aTheme.scheme });
    };

    const openApp = (aPkg: string) => {
        openAppViewTab(aPkg);
        onClose();
    };

    const option = (aKey: string, aTestId: string, aLabel: string, aDetail: string, aSwatch: string[], aTheme: ThemeChoice | null) => (
        <button
            key={aKey || 'default'}
            type="button"
            role="radio"
            aria-checked={sSelected === aKey}
            className={`theme-modal__option${sSelected === aKey ? ' theme-modal__option--selected' : ''}`}
            data-testid={`theme-option-${aTestId}`}
            onClick={() => choose(aTheme)}
        >
            <span className="theme-modal__radio" aria-hidden="true" />
            <span className="theme-modal__label">{aLabel}</span>
            <span className="theme-modal__detail">{aDetail}</span>
            {aSwatch.length > 0 && (
                <span className="theme-modal__swatch" aria-hidden="true">
                    {aSwatch.map((c, i) => (
                        <i key={i} style={{ background: c }} />
                    ))}
                </span>
            )}
        </button>
    );

    // A single-theme package keeps its one row and the package's name as the test id (as before
    // packages could hold several); a theme from an index is named by package and stylesheet.
    const packageRows = (aPackage: ThemePackage) => {
        const sSingle = !aPackage.hasApp && aPackage.themes.length === 1 && aPackage.label === aPackage.themes[0].label;
        if (sSingle) {
            const t = aPackage.themes[0];
            return option(themeKey(t), t.pkg, t.label, t.detail, t.swatch, t);
        }
        return (
            <div key={aPackage.pkg} className="theme-modal__group" role="group" aria-label={aPackage.label}>
                <div className="theme-modal__group-head">
                    <span className="theme-modal__group-label">{aPackage.label}</span>
                    <span className="theme-modal__detail">{aPackage.pkg}</span>
                </div>
                {aPackage.themes.map((t) => option(themeKey(t), themeKey(t), t.label, t.detail, t.swatch, t))}
                {aPackage.themes.length === 0 && <p className="theme-modal__note">No theme in this package yet.</p>}
            </div>
        );
    };

    const sApps = sPackages?.filter((p) => p.hasApp) ?? [];

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
                    {option(DEFAULT_KEY, 'default', 'Dark', 'Built in', sPackages?.some((p) => p.themes.some((t) => t.swatch.length > 0)) ? DARK_SWATCH : [], null)}
                    {sMine.length > 0 && (
                        <div className="theme-modal__group" role="group" aria-label="My themes">
                            <div className="theme-modal__group-head">
                                <span className="theme-modal__group-label">My themes</span>
                                <span className="theme-modal__detail">this browser</span>
                            </div>
                            {sMine.map((t) => option(themeKey(t), themeKey(t), t.label, t.detail, t.swatch, t))}
                        </div>
                    )}
                    {sPackages?.map(packageRows)}
                </div>
                {sPackages === undefined && <p className="theme-modal__note">Looking for installed themes…</p>}
                {sPackages?.length === 0 && sMine.length === 0 && <p className="theme-modal__note">No theme package is installed. Themes are installed from the App Store.</p>}
                {sPackages === null && <p className="theme-modal__note">The installed packages could not be read.</p>}
            </Modal.Body>
            <Modal.Footer>
                {sApps.map((p) => (
                    <Modal.Cancel key={p.pkg} onClick={() => openApp(p.pkg)} data-testid={`theme-open-app-${p.pkg}`}>
                        Open {p.label}
                    </Modal.Cancel>
                ))}
                <Modal.Cancel onClick={onClose}>Close</Modal.Cancel>
            </Modal.Footer>
        </Modal.Root>
    );
};
