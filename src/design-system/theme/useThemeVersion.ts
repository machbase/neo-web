import { useEffect, useState } from 'react';
import { THEME_CHANGE_EVENT } from './theme';

/**
 * A number that changes each time a theme is applied — for the components that hold resolved
 * colours (Monaco's editor theme) and must resolve them again.
 */
export const useThemeVersion = () => {
    const [sVersion, setVersion] = useState(0);
    useEffect(() => {
        const sOnChange = () => setVersion((v) => v + 1);
        window.addEventListener(THEME_CHANGE_EVENT, sOnChange);
        return () => window.removeEventListener(THEME_CHANGE_EVENT, sOnChange);
    }, []);
    return sVersion;
};
