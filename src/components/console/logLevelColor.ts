/**
 * The colour of a console log level: the theme's token, with the dark console's colour as its
 * fallback. They were literals made for the dark panel (DEBUG near-white, WARN bright yellow), so
 * on a light theme those two vanished.
 */
const LEVEL_COLORS: Record<string, string> = {
    TRACE: 'var(--neo-text-secondary, #C4C4C4)',
    DEBUG: 'var(--neo-text-primary, #F8F8F8)',
    INFO: 'var(--neo-success-main, #339900)',
    ERROR: 'var(--neo-error-main, #CC3300)',
    WARN: 'var(--neo-warning-main, #FFCC00)',
};

export const logLevelColor = (aLevel: string | undefined): string | undefined => (aLevel ? LEVEL_COLORS[aLevel] : undefined);
