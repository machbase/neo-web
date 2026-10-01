import { getTutorial } from '@/api/repository/api';
import { CheckDataCompatibility } from '@/utils/CheckDataCompatibility';
import { STATZ_TABLE } from './serverMetrics';

/**
 * Ready-to-run examples for the New tab. Every one of them reads `_NEO_STATZ` or generates its own
 * data, so each produces a result on a server that has nothing else in it yet.
 */
export interface StarterTemplate {
    id: string;
    title: string;
    summary: string;
    /** Shown as a monospace preview under the title. */
    snippet: string;
    /** Fields that turn the current New tab into the example; the caller keeps the tab id. Absent for the neo_statz dashboard, which is loaded from the server. */
    build?: () => Record<string, any>;
}

/**
 * The server's own dashboard over `_NEO_STATZ`, shipped with machbase-neo and listed under
 * References as `neo_statz`. Opened the way the References list opens it — same title and the same
 * `_CHEAT_SHEET` mark — so either place finds the tab the other one opened instead of stacking a copy.
 */
export const NEO_STATZ_DASHBOARD = { title: 'neo_statz', address: './tutorials/neo_statz.dsh' };

export const loadNeoStatzDashboard = async (): Promise<Record<string, any>> => {
    const sContent: any = await getTutorial(NEO_STATZ_DASHBOARD.address);
    // Served from /web/tutorials, so axios has usually parsed the JSON already; the loader takes text.
    const sRaw = typeof sContent === 'string' ? sContent : JSON.stringify(sContent);
    const sParsed = JSON.parse(sRaw);
    if (!sParsed?.dashboard) throw new Error(sParsed?.reason ?? 'The server did not return the neo_statz dashboard.');
    return {
        ...CheckDataCompatibility(sRaw, 'dsh'),
        type: 'dsh',
        name: NEO_STATZ_DASHBOARD.title,
        path: '',
        savedCode: JSON.stringify(sParsed.dashboard),
        _CHEAT_SHEET: true,
    };
};

const CPU_SQL = `SELECT TIME, VALUE
FROM ${STATZ_TABLE}
WHERE NAME = 'ps:cpu_percent'
  AND TIME > NOW - 1h
ORDER BY TIME;`;

const WAVE_TQL = `// Generated data, so this runs without any table.
FAKE( oscillator(freq(1.5, 1.0), freq(0.4, 0.5), range('now', '3s', '10ms')) )
CHART_LINE()`;

export const STARTER_TEMPLATES: StarterTemplate[] = [
    {
        id: 'server-metrics',
        title: 'Server metrics dashboard',
        summary: 'CPU, memory, HTTP, DB pool, appends and rollups in 15 live panels',
        snippet: 'neo_statz.dsh · _NEO_STATZ · last 1 hour',
    },
    {
        id: 'cpu-sql',
        title: "Query your server's CPU in SQL",
        summary: 'Runs right away. Open the CHART tab to plot it',
        snippet: `SELECT TIME, VALUE FROM _NEO_STATZ\nWHERE NAME = 'ps:cpu_percent' AND TIME > NOW - 1h`,
        build: () => ({ type: 'sql', name: 'server-cpu.sql', path: '', code: CPU_SQL, savedCode: false, autoRun: true }),
    },
    {
        id: 'wave-tql',
        title: 'Draw a chart with no table (TQL)',
        summary: 'Generate a signal and plot it in two lines',
        snippet: `FAKE( oscillator(freq(1.5, 1.0), ...) )\nCHART_LINE()`,
        build: () => ({ type: 'tql', name: 'wave-chart.tql', path: '', code: WAVE_TQL, savedCode: false, autoRun: true }),
    },
];
