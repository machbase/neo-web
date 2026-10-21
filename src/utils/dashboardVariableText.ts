// Board variables and user text are put into SQL/TQL/chart code with String.replace. Both sides of that
// call read some characters as syntax: the pattern as a regular expression, the replacement's `$&` `$'`
// `$1` `$$` as back-references. A board variable name or value is text the user typed, so neither side
// may read it as syntax (#1558).

const escapeRegExp = (aText: string) => aText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Finds a board variable name such as `{{a(b}}` as the characters it is, never as a regular expression. */
export const variableKeyRegExp = (aKey: unknown) => new RegExp(escapeRegExp(String(aKey)), 'g');

/** A String.replace/replaceAll replacement that inserts `aValue` as typed: `$&` `$'` `$1` `$$` stay literal. */
export const literalReplacement = (aValue: unknown) => () => String(aValue);
