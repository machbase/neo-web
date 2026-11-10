/**
 * The colour of a console log level: the theme's token, with the dark console's colour as its
 * fallback. They were literals made for the dark panel (DEBUG near-white, WARN bright yellow), so
 * on a light theme those two vanished. A level's word is text, so a signal takes its `-text` token
 * (readable on the page); the repeat badge below is a fill and takes the signal itself.
 */
const LEVEL_COLORS: Record<string, string> = {
    TRACE: 'var(--neo-text-secondary, #c4c4c4)',
    DEBUG: 'var(--neo-text-primary, #f1f1f1)',
    INFO: 'var(--neo-success-text, #9df486)',
    ERROR: 'var(--neo-error-text, #fa6464)',
    WARN: 'var(--neo-warning-text, #ff9800)',
};
const LEVEL_FILLS: Record<string, string> = {
    TRACE: 'var(--neo-neutral-main, #6f7173)',
    DEBUG: 'var(--neo-neutral-main, #6f7173)',
    INFO: 'var(--neo-success-main, #37aa3b)',
    ERROR: 'var(--neo-error-main, rgb(255, 83, 83))',
    WARN: 'var(--neo-warning-main, #d67f00)',
};

export const logLevelColor = (aLevel: string | undefined): string | undefined => (aLevel ? LEVEL_COLORS[aLevel] : undefined);

/**
 * The repeat-count badge after a log line: the level's signal is its fill (TRACE and DEBUG: the neutral
 * button's), its digits the text that reads on that fill — one colour, on a selected task's rows too.
 */
export const logRepeatBadgeStyle = (aLevel: string | undefined) => ({
    background: aLevel ? LEVEL_FILLS[aLevel] : undefined,
    // text-on-accent is the signal and primary fills' text; on the neutral fill the page's text reads
    color: aLevel === 'TRACE' || aLevel === 'DEBUG' ? 'var(--neo-text-primary, #f1f1f1)' : 'var(--neo-text-on-accent, #ffffff)',
});
