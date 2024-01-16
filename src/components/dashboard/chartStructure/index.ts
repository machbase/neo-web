import * as line from './Line.json';

export const ChartStructure = (aChartType: string) => {
    switch (aChartType) {
        case 'line':
            return line;
    }
};
