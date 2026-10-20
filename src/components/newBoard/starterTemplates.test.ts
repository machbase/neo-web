import { loadNeoStatzDashboard, NEO_STATZ_DASHBOARD, STARTER_TEMPLATES } from './starterTemplates';
import { STATZ_TABLE } from './serverMetrics';
import { getTutorial } from '@/api/repository/api';

jest.mock('@/api/repository/database', () => ({ fetchQuery: jest.fn() }));
jest.mock('@/api/repository/api', () => ({ getTutorial: jest.fn() }));

const mockGetTutorial = getTutorial as jest.Mock;

const NEO_STATZ_FILE = {
    id: 'file-id',
    type: 'dsh',
    name: 'neo_statz.dsh',
    path: '/',
    dashboard: {
        variables: [],
        timeRange: { start: 'now-1h', end: 'now', refresh: '10 seconds' },
        title: 'NEO STATZ',
        panels: [],
    },
};

describe('loadNeoStatzDashboard', () => {
    beforeEach(() => mockGetTutorial.mockReset());

    it('opens the bundled dashboard as the References list does', async () => {
        mockGetTutorial.mockResolvedValue(NEO_STATZ_FILE);
        const sBoard = await loadNeoStatzDashboard();
        expect(mockGetTutorial).toHaveBeenCalledWith(NEO_STATZ_DASHBOARD.address);
        expect(sBoard).toMatchObject({ type: 'dsh', name: 'neo_statz', path: '', _CHEAT_SHEET: true });
        expect(sBoard.dashboard.title).toBe('NEO STATZ');
        expect(JSON.parse(sBoard.savedCode).title).toBe('NEO STATZ');
    });

    it('accepts the file as text too', async () => {
        mockGetTutorial.mockResolvedValue(JSON.stringify(NEO_STATZ_FILE));
        await expect(loadNeoStatzDashboard()).resolves.toMatchObject({ name: 'neo_statz' });
    });

    it('fails with the server reason when no dashboard comes back', async () => {
        mockGetTutorial.mockResolvedValue({ success: false, reason: 'not found' });
        await expect(loadNeoStatzDashboard()).rejects.toThrow('not found');
    });
});

describe('STARTER_TEMPLATES', () => {
    it('opens the SQL and TQL examples ready to run once', () => {
        const sCode = STARTER_TEMPLATES.filter((aTemplate) => aTemplate.build).map((aTemplate) => aTemplate.build!());
        expect(sCode.map((aBoard) => aBoard.type)).toEqual(['sql', 'tql']);
        sCode.forEach((aBoard) => {
            expect(aBoard.autoRun).toBe(true);
            expect(aBoard.code).toBeTruthy();
        });
        expect(sCode[0].code).toContain(STATZ_TABLE);
    });

    it('loads the server metrics example from the server instead of building it', () => {
        expect(STARTER_TEMPLATES.find((aTemplate) => aTemplate.id === 'server-metrics')?.build).toBeUndefined();
    });
});
