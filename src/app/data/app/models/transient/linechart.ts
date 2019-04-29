type methodType = (x: Date, y: Date, controlCenterRestriction: boolean) => Promise<number>;

export class LinechartSeries {

    private _title: string;
    private _method: methodType;
    private _color: string;
    private _data = new Array<any>();
    private _dataProgress = 0;

    constructor(title: string, method: methodType, color: string) {
        this.title = title;
        this.method = method;
        this.color = color;
    }

    public get title(): string {
        return this._title;
    }

    public set title(value: string) {
        this._title = value;
    }

    public get color(): string {
        return this._color;
    }

    public set color(value: string) {
        this._color = value;
    }

    public get method(): methodType {
        return this._method;
    }

    public set method(value: methodType) {
        this._method = value;
    }

    public get data(): Array<any> {
        return this._data;
    }

    public set data(value: Array<any>) {
        this._data = value;
    }

    public get dataProgress(): number {
        return this._dataProgress;
    }

    public set dataProgress(value: number) {
        this._dataProgress = value;
    }

    public get options() {
        return {
            name: this.title,
            type: 'line',
            data: this.data,
            smooth: true,
            markPoint: {
                data: [
                    { type: 'max', name: 'Max' },
                    { type: 'min', name: 'Min' }
                ]
            },
            markLine: {
                data: [
                    { type: 'average', name: 'Average' }
                ]
            },
            itemStyle: {
                normal: {
                    color: this.color
                }
            },
            symbol: 'diamond'
        }
    }
}

export const LinechartColors = {
    text: '#989898',
    splitLine: 'rgba(0,0,0,.05)',
    splitArea: ['rgba(250,250,250,0.035)', 'rgba(200,200,200,0.1)'],
    series: {
        default: '#20a8d8',
        positive: '#4dbd74',
        negative: '#f86c6b'
    }
}

export class Linechart {

    private _title: string;
    private _subtitle: string;
    private _months: number;
    private _series: Array<LinechartSeries>;
    private _legend: Array<string>;
    private _options: any;

    constructor(title: string, subtitle: string, months: number, series: Array<LinechartSeries>) {
        this.title = title;
        this.subtitle = subtitle;
        this.months = months;
        this.series = series;
        this.legend = new Array();
        this._options = null;
    }

    public get title(): string {
        return this._title;
    }

    public set title(value: string) {
        this._title = value;
    }

    public get subtitle(): string {
        return this._subtitle;
    }

    public set subtitle(value: string) {
        this._subtitle = value;
    }

    public get months(): number {
        return this._months;
    }

    public set months(value: number) {
        this._months = value;
    }

    public get series(): Array<LinechartSeries> {
        return this._series;
    }

    public set series(value: Array<LinechartSeries>) {
        this._series = value;
    }

    public get legend(): Array<string> {
        return this._legend;
    }

    public set legend(value: Array<string>) {
        this._legend = value;
    }

    public get options(): any {
        return this._options;
    }

    public updateOptions() {
        const seriesOptions = new Array<any>();
        for (const series of this.series) {
            seriesOptions.push(series.options);
        }
        this._options = {
            tooltip: {
                trigger: 'axis'
            },
            legend: {
                data: ['Abgeschlossen', 'Abgebrochen'],
                textStyle: {
                    color: LinechartColors.text
                }
            },
            toolbox: {
                show: false
            },
            calculable: true,
            xAxis: [
                {
                    type: 'category',
                    boundaryGap: false,
                    data: this.legend,
                    axisLabel: {
                        textStyle: {
                            color: LinechartColors.text
                        }
                    },
                    splitLine: {
                        lineStyle: {
                            color: LinechartColors.splitLine
                        }
                    }
                }
            ],
            yAxis: [
                {
                    type: 'value',
                    axisLabel: {
                        textStyle: {
                            color: LinechartColors.text
                        }
                    },
                    splitLine: {
                        lineStyle: {
                            color: LinechartColors.splitLine
                        }
                    },
                    splitArea: {
                        show: true,
                        areaStyle: {
                            color: LinechartColors.splitArea
                        }
                    }
                }
            ],
            series: seriesOptions
        }
    }
}
