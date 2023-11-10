import { getTimeZoneValue, toDateUtcChart } from '@/utils/utils';
import { useState, useEffect } from 'react';
import Highcharts from 'highcharts/highstock';
import HighchartsReact from 'highcharts-react-official';
const OverlapChart = ({ pChartData, pAllInfo, pStartTimeList, pPanelInfo, pAreaChart }: any) => {
    const [sOptions, setOptions] = useState<any>({});
    const getMinValue = (array: number[][]) => {
        return array.reduce(
            (result: number, current: any) => {
                if (current[1] < result) result = current[1];
                return result;
            },
            pPanelInfo.zero_base === 'Y' ? 0 : array[0]?.[1]
        );
    };

    const getMaxValue = (array: number[][]) => {
        return array.reduce(
            (result: number, current: any) => {
                if (current[1] > result) result = current[1];
                return result;
            },
            pPanelInfo.zero_base === 'Y' ? 0 : array[0]?.[1]
        );
    };
    const updateYaxis = () => {
        const yAxis: any = {
            left: [] as number[],
            right: [] as number[],
        };

        const newData = pChartData && JSON.parse(JSON.stringify(pChartData));
        newData?.forEach((item: any) => {
            if (item.yAxis === 0) {
                if (!yAxis.left[0] || yAxis.left[0] > getMinValue(item.data)) {
                    yAxis.left[0] = getMinValue(item.data);
                }
                if (!yAxis.left[1] || yAxis.left[1] < getMaxValue(item.data)) {
                    yAxis.left[1] = getMaxValue(item.data);
                }
            }
            if (item.yAxis === 1) {
                if (!yAxis.right[0] || yAxis.right[0] > getMinValue(item.data)) {
                    yAxis.right[0] = getMinValue(item.data);
                }
                if (!yAxis.right[1] || yAxis.right[1] < getMaxValue(item.data)) {
                    yAxis.right[1] = getMaxValue(item.data);
                }
            }
        });
        return yAxis;
    };

    return (
        sOptions && (
            <HighchartsReact
                highcharts={Highcharts}
                options={{
                    accessibility: {
                        enabled: false,
                    },
                    title: {
                        text: '',
                    },
                    colors: ['#EB5757', '#6FCF97', '#9C8FFF', '#F5AA64', '#BB6BD9', '#B4B4B4', '#FFD95F', '#2D9CDB', '#C3A080', '#B4B4B4', '#6B6B6B'],
                    chart: {
                        spacing: [50, 10, 15, 10],
                        height: pAreaChart.current.clientHeight - 10 - pChartData.length * 43,
                        backgroundColor: '#262831',
                        type: 'area',
                        zoomType: 'x',
                        lineWidth: 1,
                        width: pAreaChart.current.clientWidth - 10,
                    },

                    series: pChartData,
                    plotOptions: {
                        series: {
                            showInNavigator: false,
                            lineWidth: 1,
                            fillOpacity: 0.15,
                            cursor: 'pointer',
                            marker: {
                                enabled: true,
                                radius: 0.1,
                            },
                            states: {
                                hover: {
                                    enabled: true,
                                    lineWidthPlus: 0,
                                    lineWidth: 0,
                                },
                            },
                            point: {},
                        },
                    },
                    scrollbar: {
                        enabled: false,
                    },
                    rangeSelector: {
                        buttons: [],
                        allButtonsEnabled: false,
                        selected: 1,
                        inputEnabled: false,
                    },

                    xAxis: {
                        zoomEnabled: false,
                        type: 'datetime',
                        ordinal: false,
                        gridLineWidth: 1,
                        gridLineColor: '#323333',
                        lineColor: '#323333',
                        labels: {
                            align: 'center',
                            style: {
                                color: '#f8f8f8',
                                fontSize: '10px',
                            },
                            y: 35,
                            dateTimeLabelFormats: {
                                millisecond: '%H:%M:%S.%L',
                                second: '%H:%M:%S',
                                minute: '%H:%M',
                                hour: '%H:%M',
                                day: '%e. %b',
                                week: '%e. %b',
                                month: '%e. %b',
                                year: '',
                            },
                        },
                        minorTickColor: 'red',

                        crosshair: {
                            snap: false,
                            width: 0.5,
                            color: 'red',
                        },
                        tickColor: '#323333',
                    },
                    yAxis: [
                        {
                            min: updateYaxis().left[0],
                            max: updateYaxis().left[1],
                            startOnTick: true,
                            endOnTick: true,
                            gridLineColor: '#323333',
                            lineColor: '#323333',
                            labels: {
                                align: 'center',
                                style: {
                                    color: '#afb5bc',
                                    fontSize: '10px',
                                },
                                x: -5,
                                y: 3,
                            },
                            opposite: false,
                        },
                    ],
                    tooltip: {
                        valueDecimals: 2,
                        split: false,
                        shared: true,
                        followPointer: true,
                        backgroundColor: '#1f1d1d',
                        borderColor: '#292929',
                        borderWidth: 1,
                        xDateFormat: '%H:%M:%S.%L',
                        headerFormat: `<div style="minWidth:0px; paddingLeft:10px; fontSize:10px"><div style="color: #afb5bc">{point.key}</div>`,
                        pointFormat:
                            '<br/><div style="display: flex; justifyContent: space-between"><p style="color: {series.color}">{series.name}</p><p style="color: {series.color}">{point.y} {point.key} {series.x}</p><' +
                            '/div>',
                        footerFormat: '<div></div>',

                        formatter: function (): any {
                            return `<div style="minWidth:0px; paddingLeft:10px; fontSize:10px"><div style="color: #afb5bc">${(this as any).points
                                .map((aItem: any) => {
                                    return `<div style="color: ${aItem.color}">${
                                        pChartData[aItem.colorIndex].name +
                                        ' : ' +
                                        toDateUtcChart((this as any).x + pStartTimeList[aItem.colorIndex] - 1000 * 60 * getTimeZoneValue(), true) +
                                        ' : ' +
                                        aItem.y
                                    }</div>`;
                                })
                                .join('<br/>')}</div>`;
                        },
                    },
                    legend: {
                        enabled: true,
                        align: 'left',
                        itemDistance: 15,
                        squareSymbol: true,
                        symbolRadius: 1,
                        itemHoverStyle: {
                            color: '#23527c',
                            'text-decoration': 'underline',
                        },
                        itemStyle: {
                            color: '#e7e8ea',
                            cursor: 'pointer',
                            fontSize: '10px',
                            fontWeight: 'none',
                            'font-family': 'Open Sans,Helvetica,Arial,sans-serif',
                            textOverflow: 'ellipsis',
                            'text-decoration': 'none',
                        },
                        margin: 20,
                    },
                    lang: {
                        noData: 'No data',
                    },
                    noData: {
                        style: {
                            fontFamily: 'Open Sans,Helvetica,Arial,sans-serif',
                            fontSize: '24px',
                            color: '#9ca2ab',
                            fontStyle: 'italic',
                            fontWeight: 'normal',
                        },
                    },
                    credits: {
                        enabled: false,
                    },
                }}
            />
        )
    );
};
export default OverlapChart;
