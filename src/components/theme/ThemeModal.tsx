import { useEffect, useState } from 'react';
import { MdOutlinePalette } from 'react-icons/md';
import { Modal } from '@/design-system/components';
import { readStoredTheme, setTheme, type ThemeChoice } from '@/design-system/theme';
import { listInstalledThemes } from './installedThemes';
import './ThemeModal.scss';

interface ThemeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const DEFAULT_KEY = '';

/**
 * The theme for this browser: the built-in dark default or an installed theme package.
 * A click applies at once (and is remembered); there is nothing to confirm.
 */
export const ThemeModal = ({ isOpen, onClose }: ThemeModalProps) => {
    // undefined: still looking; null: /public/ could not be listed.
    const [sThemes, setThemes] = useState<ThemeChoice[] | null | undefined>(undefined);
    const [sSelected, setSelected] = useState<string>(() => readStoredTheme()?.pkg ?? DEFAULT_KEY);

    useEffect(() => {
        let sAlive = true;
        listInstalledThemes().then((aThemes) => {
            if (!sAlive) return;
            setThemes(aThemes);
            if (!aThemes) return;
            // The remembered theme was uninstalled: its stylesheet already 404s and the dark
            // defaults show, so say so — and stop requesting it on every load.
            const sStored = readStoredTheme();
            if (sStored && !aThemes.some((t) => t.pkg === sStored.pkg)) {
                setTheme(null);
                setSelected(DEFAULT_KEY);
            }
        });
        return () => {
            sAlive = false;
        };
    }, []);

    const choose = (aTheme: ThemeChoice | null) => {
        setSelected(aTheme?.pkg ?? DEFAULT_KEY);
        setTheme(aTheme);
    };

    const option = (aKey: string, aLabel: string, aDetail: string, aTheme: ThemeChoice | null) => (
        <button
            key={aKey || 'default'}
            type="button"
            role="radio"
            aria-checked={sSelected === aKey}
            className={`theme-modal__option${sSelected === aKey ? ' theme-modal__option--selected' : ''}`}
            data-testid={`theme-option-${aKey || 'default'}`}
            onClick={() => choose(aTheme)}
        >
            <span className="theme-modal__radio" aria-hidden="true" />
            <span className="theme-modal__label">{aLabel}</span>
            <span className="theme-modal__detail">{aDetail}</span>
        </button>
    );

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
                    {option(DEFAULT_KEY, 'Dark', 'Built in', null)}
                    {sThemes?.map((t) => option(t.pkg, t.label, t.pkg, t))}
                </div>
                {sThemes === undefined && <p className="theme-modal__note">Looking for installed themes…</p>}
                {sThemes?.length === 0 && <p className="theme-modal__note">No theme package is installed. Themes are installed from the App Store.</p>}
                {sThemes === null && <p className="theme-modal__note">The installed packages could not be read.</p>}
            </Modal.Body>
            <Modal.Footer>
                <Modal.Cancel onClick={onClose}>Close</Modal.Cancel>
            </Modal.Footer>
        </Modal.Root>
    );
};
