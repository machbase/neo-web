import { isValidElement } from 'react';
import icons from './icons';

const typeOf = (aNode: unknown) => (isValidElement(aNode) ? aNode.type : undefined);

describe('icons', () => {
    it.each(['SQL', 'Sql', 'TQL', 'TAZ', 'DSH', 'WRK', 'JSON', 'MD'])('picks the same icon for upper-case "%s" as for lower-case', (aType) => {
        expect(typeOf(icons(aType))).toBe(typeOf(icons(aType.toLowerCase())));
    });

    it('keeps camelCase keys and the generic fallback', () => {
        expect(typeOf(icons('gitClosedDirectory'))).not.toBe(typeOf(icons('no-such-type')));
        expect(typeOf(icons('UNKNOWN'))).toBe(typeOf(icons('unknown-ext')));
    });
});
