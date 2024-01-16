import { ChartStructure } from '@/components/dashboard/chartStructure';

export const DashboardChartOptionParser = (aChartType: string) => {
    // console.log('ChartStructure', ChartStructure(aChartType));
    return `{
        "legend": { "show":true, "bottom": 10 },
        "xAxis": { "type": "time" },
        "yAxis": {},
        "animation": false,
        "tooltip": {
        "show": true,
        "trigger": "item",
        "formatter": null
    },
        "series": [
            {
                "type": "line",
                "connectNulls": false,
                "name": "test",
                "data": []
            },
            {
                "type": "line",
                "connectNulls": false,
                "name": "tag01",
                "data": []
            }
        ]
    }`;
};
