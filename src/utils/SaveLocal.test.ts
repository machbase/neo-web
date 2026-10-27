import { SavedToCSV } from './SaveLocal';

describe('SavedToCSV', () => {
    it('quotes names holding a comma or a quote so every row keeps its columns', async () => {
        let sBlob: Blob | undefined;
        URL.createObjectURL = jest.fn((blob: Blob) => {
            sBlob = blob;
            return 'blob:csv';
        });
        URL.revokeObjectURL = jest.fn();
        jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
        const names = ['a', 'a,b', 'e"f', "o'b"];

        SavedToCSV(
            'panel.csv',
            names.map((name) => ({ name, data: [[1000, 1.5]] })),
            names.map((name) => ({ name, visible: true })),
            jest.fn(),
        );

        // jsdom's Blob has no text(); read it the way a browser download would.
        const sText = await new Promise<string>((resolve) => {
            const sReader = new FileReader();
            sReader.onload = () => resolve(String(sReader.result));
            sReader.readAsText(sBlob!);
        });
        expect(sText).toBe(
            'a, 1000, 1.5\n"a,b", 1000, 1.5\n"e""f", 1000, 1.5\no\'b, 1000, 1.5\n',
        );
    });
});
