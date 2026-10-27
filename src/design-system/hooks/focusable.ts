export const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const isShown = (aEl: HTMLElement | null | undefined): aEl is HTMLElement => !!aEl && aEl.isConnected && aEl.getClientRects().length > 0;

/** The controls inside `aContainer` that Tab can reach, in document order. */
export const focusables = (aContainer: HTMLElement) => [...aContainer.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(isShown);
