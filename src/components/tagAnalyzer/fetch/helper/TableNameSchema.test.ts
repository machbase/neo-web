import { addAdminSchemaIfNeeded } from './TableNameSchema';

describe('TableNameSchema', () => {
    describe('addAdminSchemaIfNeeded', () => {
        it('keeps fully qualified tables unchanged', () => {
            expect(addAdminSchemaIfNeeded('APP.table_name', 'admin')).toBe(
                'APP.table_name',
            );
        });

        it('prefixes bare tables with the admin id', () => {
            expect(addAdminSchemaIfNeeded('table_name', 'admin')).toBe(
                'ADMIN.table_name',
            );
        });
    });
});
