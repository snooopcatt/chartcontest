import Line from './Line';

export default class Plot {
    static generateId() {
        this.lastId = this.lastId || 0;
        return `plot-${++this.lastId}`;
    }
    constructor(config = {}) {
        this.lines = new Map();
        this.maxYValues = new Map();
        this.maxXValues = new Map();
        this.id = Plot.generateId();

        if (config.appendTo instanceof HTMLElement) {
            this.container = config.appendTo;
        }
        else if (config.appendTo) {
            this.container = document.getElementById(config.appendTo);
        }

        this.anchorCount = 5;
        this.rendered = false;
        this._tickWidth = 30;

        const chart = config.chart;

        chart.columns.forEach(col => {
            const name = col[0];
            const values = col.slice(1);
            if (chart.types[name] === 'line') {
                let l = new Line({
                    name: chart.names[name],
                    color: chart.colors[name],
                    values
                });
                this.addLine(l);
            }
            else {
                this.columns = values;
                this.chartLengthMS = values[values.length - 1] - values[0];
            }
        });
    }

    buildXAxis() {
        const tickWidth = this.tickWidth;
        return [...new Array(this.columns.length).keys()].map(i => i * tickWidth);
    }

    /**
     * 
     * @param {Line} line 
     */
    addLine(line) {
        this.lines.set(line.name, line);
        this.maxYValues.set(line.name, line.maxYValue);
    }

    getLines() {
        return this.lines.values();
    }

    //#region Chart dimensions

    get totalWidth() {
        return this.tickWidth * (this.columns.length - 1);
    }

    get tickWidth() {
        return this._tickWidth;
    }

    set tickWidth(value) {
        this._tickWidth = value;
        if (this.rendered) {
            // this.refresh();
        }
    }

    get previewHeight() {
        return 50;
    }

    get chartHeight() {
        if (this._cachedChartHeight) {
            return this._cachedChartHeight;
        }

        return this._cachedChartHeight = this.container.offsetHeight - this.previewHeight;
    }

    get chartWidth() {
        if (this._cachedChartWidth) {
            return this._cachedChartWidth;
        }

        return this._cachedChartWidth = this.container.offsetWidth;
    }

    //#endregion

    getMaxValue(axis = 'x') {
        const iterator = this[axis === 'x' ? 'maxXValues' : 'maxYValues'].values();
        let result, maxValue = 0;

        while (!(result = iterator.next()).done) {
            maxValue = result.value > maxValue ? result.value : maxValue;
        }

        return maxValue;
    }

    renderLine(config = {}) {
        const lineElement = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        lineElement.setAttribute('class', config.cls || '');
        lineElement.setAttribute('x1', config.x1);
        lineElement.setAttribute('x2', config.x2);
        lineElement.setAttribute('y1', config.y1);
        lineElement.setAttribute('y2', config.y2);

        return lineElement;
    }

    renderLabel({ x, y, text, cls }) {
        const element = document.createElementNS('http://www.w3.org/2000/svg', 'text');

        element.setAttribute('x', x);
        element.setAttribute('y', y);
        element.setAttribute('class', cls);

        element.innerHTML = text;

        return element;
    }

    //#region Canvas

    createCanvas({ width, height, chartWidth, chartHeight, chartX = 0, cls }) {
        const element = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        element.setAttribute('width', width);
        element.setAttribute('height', height);
        element.setAttribute('viewBox', `${chartX} 0 ${chartWidth} ${chartHeight}`);
        element.setAttribute('class', cls || '');

        return element;
    }

    createLegendCanvas() {
        const canvas = this.createCanvas({
            width: this.chartWidth,
            height: this.chartHeight,
            chartWidth: this.chartWidth,
            chartHeight: this.chartHeight,
            cls: 'c-legend-canvas'
        });

        let maxValue = this.getMaxValue('y');
        let step = Math.ceil(maxValue / this.anchorCount);

        [...Array(this.anchorCount).keys()].map((i) => {
            const
                value = (i + 1) * step,
                y = this.chartHeight - value;

            canvas.appendChild(this.renderLine({
                x1: 0,
                x2: this.chartWidth,
                y1: y,
                y2: y,
                cls: `c-anchor-line c-anchor-line-${i + 1}`
            }));

            canvas.appendChild(this.renderLabel({
                x: 0,
                y: y - 10,
                text: value,
                cls: `c-anchor-label c-anchor-label-${i + 1}`
            }));
        });

        const xAxis = this.renderLine({
            x1: 0,
            x2: this.chartWidth,
            y1: this.chartHeight,
            y2: this.chartHeight,
            cls: 'c-axis-line'
        });
        canvas.appendChild(xAxis);

        return canvas;
    }

    createPreviewCanvas() {
        const
            width = this.chartWidth,
            height = this.previewHeight,
            element = this.createCanvas({
                width,
                height,
                chartWidth: this.totalWidth,
                chartHeight: this.chartHeight
            });

        element.setAttribute('preserveAspectRatio', 'none');

        return element;
    }

    createMainCanvas() {
        const
            width = this.chartWidth,
            height = this.chartHeight;

        return this.createCanvas({
            width,
            height,
            chartX: this.totalWidth - width,
            chartWidth: width,
            chartHeight: height
        });
    }

    //#endregion    

    render() {
        if (!this.container) {
            return;
        }

        const
            height = this.chartHeight,
            i = this.lines.values(),
            previewCanvas = this.createPreviewCanvas(),
            legendCanvas = this.createLegendCanvas(),
            mainCanvas = this.createMainCanvas(),
            xAxis = this.buildXAxis();

        let result = i.next();

        while (!result.done) {
            const line = result.value.render(xAxis, height);
            mainCanvas.appendChild(line),
            previewCanvas.appendChild(line.cloneNode());
            result = i.next();
        }

        previewCanvas.setAttribute('class', 'preview');
        this.container.appendChild(legendCanvas);
        this.container.appendChild(mainCanvas);
        this.container.appendChild(previewCanvas);

        this.rendered = true;
    }
}