import { itemKey, parseGroups, serializeGroups, splitFilePath } from './groupModel';

describe('parseGroups', () => {
    it('keeps well-formed groups and tags them with the file they came from', () => {
        const sGroups = parseGroups(
            {
                version: 1,
                groups: [
                    {
                        id: 'g1',
                        name: 'Plant A',
                        color: '#4d95f2',
                        owner: 'SYS',
                        updatedAt: 5,
                        items: [
                            { kind: 'file', ref: '/DASHBOARD.dsh', label: 'DASHBOARD.dsh' },
                            { kind: 'timer', ref: '12', label: 'DB_ROLL' },
                        ],
                    },
                ],
            },
            'shared'
        );
        expect(sGroups).toEqual([
            {
                id: 'g1',
                name: 'Plant A',
                color: '#4d95f2',
                visibility: 'shared',
                owner: 'SYS',
                updatedAt: 5,
                items: [
                    { kind: 'file', ref: '/DASHBOARD.dsh', label: 'DASHBOARD.dsh' },
                    { kind: 'timer', ref: '12', label: 'DB_ROLL' },
                ],
            },
        ]);
    });

    it('drops broken groups and items, repeats, and colors that are not hex', () => {
        const [sGroup, ...sRest] = parseGroups(
            {
                groups: [
                    {
                        id: 'g1',
                        name: 'A',
                        color: 'red;}',
                        items: [{ kind: 'file', ref: '/a.sql' }, { kind: 'file', ref: '/a.sql' }, { kind: 'printer', ref: 'x' }, { kind: 'table', ref: '' }, null],
                    },
                    { name: 'no id' },
                    { id: 'g2' },
                ],
            },
            'private'
        );
        expect(sRest).toEqual([]);
        expect(sGroup.color).toMatch(/^#[0-9a-f]{6}$/i);
        expect(sGroup.items).toEqual([{ kind: 'file', ref: '/a.sql', label: '/a.sql' }]);
    });

    it('answers an empty list for anything that is not a groups file', () => {
        expect(parseGroups(undefined, 'private')).toEqual([]);
        expect(parseGroups({ groups: {} }, 'shared')).toEqual([]);
    });
});

describe('captions', () => {
    it('keeps a trimmed caption, drops an empty one, and caps its length', () => {
        const [sWith, sEmpty, sLong] = parseGroups(
            { groups: [{ id: 'a', name: 'A', caption: '  Line 3 sensors  ' }, { id: 'b', name: 'B', caption: '   ' }, { id: 'c', name: 'C', caption: 'x'.repeat(300) }] },
            'private'
        );
        expect(sWith.caption).toBe('Line 3 sensors');
        expect(sEmpty).not.toHaveProperty('caption');
        expect(sLong.caption).toHaveLength(120);
        expect(serializeGroups([sWith]).groups[0]).toMatchObject({ caption: 'Line 3 sensors' });
        expect(serializeGroups([sEmpty]).groups[0]).not.toHaveProperty('caption');
    });
});

describe('serializeGroups', () => {
    it('leaves visibility out, since the file it is written to already says it', () => {
        const sOut = serializeGroups([{ id: 'g', name: 'n', color: '#000000', visibility: 'private', owner: 'SYS', items: [], updatedAt: 1 }]);
        expect(sOut).toEqual({ version: 1, groups: [{ id: 'g', name: 'n', color: '#000000', owner: 'SYS', items: [], updatedAt: 1 }] });
    });
});

describe('helpers', () => {
    it('splits a file path into its folder and name', () => {
        expect(splitFilePath('/TEST/CHART/DSH_01_LINE.dsh')).toEqual({ path: '/TEST/CHART/', name: 'DSH_01_LINE.dsh' });
        expect(splitFilePath('/DEMO_TAG')).toEqual({ path: '/', name: 'DEMO_TAG' });
    });

    it('keys items by kind and ref, so a timer and a token with the same id differ', () => {
        expect(itemKey({ kind: 'timer', ref: '1' })).not.toBe(itemKey({ kind: 'token', ref: '1' }));
    });
});
