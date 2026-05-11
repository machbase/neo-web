export const FIELD_WIDTH = 160;
export const FIELD_GAP = 4;
export const FIELD_LABEL_OFFSET = 132;
export const WIDE_FIELD_WIDTH = 456;
export const FIELD_ALIGN_SPACER_WIDTH = FIELD_WIDTH + FIELD_LABEL_OFFSET;

export const FIELD_STYLE = { width: `${FIELD_WIDTH}px` };
export const WIDE_FIELD_STYLE = { width: `${WIDE_FIELD_WIDTH}px` };
export const FIELD_ALIGN_SPACER_STYLE = { width: `${FIELD_ALIGN_SPACER_WIDTH}px`, flexShrink: 0 };
export const FIELD_ROW_STYLE = { gap: `${FIELD_GAP}px`, flexFlow: 'wrap' as const };
export const FIELD_STACK_STYLE = { gap: `${FIELD_GAP}px`, display: 'flex', flexDirection: 'column' as const };
