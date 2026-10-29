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

/**
 * The repeat-count badge after a log line: the level colour is its fill, so its digits are accent
 * ink. With no theme they keep the row's text colour (brighter on the selected task's rows).
 */
export const logRepeatBadgeStyle = (aLevel: string | undefined, aSelected: boolean) => ({
    background: logLevelColor(aLevel),
    color: `var(--neo-text-on-accent, ${aSelected ? '#f4f4f4' : '#d1d1d1'})`,
});
