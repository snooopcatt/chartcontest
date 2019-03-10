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

    getMaxValue(axis = 'x') {
        const iterator = this[axis === 'x' ? 'maxXValues' : 'maxYValues'].values();
        let result, maxValue = 0;

        while (!(result = iterator.next()).done) {
            maxValue = result.value > maxValue ? result.value : maxValue;
        }

        return maxValue;
    }

    renderAnchorLine(value) {
        const lineElement = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        lineElement.setAttribute('class', 'c-anchor-line');
        lineElement.setAttribute('x1', 0);
        lineElement.setAttribute('x2', this.totalWidth);
        lineElement.setAttribute('y1', value);
        lineElement.setAttribute('y2', value);

        return lineElement;
    }

    renderAnchorLines() {
        let maxValue = this.getMaxValue('y');
        let step = Math.ceil(maxValue / this.anchorCount);

        return [...Array(this.anchorCount).keys()].map((i) => {
            return this.renderAnchorLine((i + 1) * step);
        });
    }

    renderLegend(canvas) {
        const lines = this.renderAnchorLines();

        lines.forEach(l => canvas.appendChild(l));
    }

    createCanvas({ width, height, chartWidth, chartHeight, chartX = 0 }) {
        const element = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        element.setAttribute('width', width);
        element.setAttribute('height', height);
        element.setAttribute('viewBox', `${chartX} 0 ${chartWidth} ${chartHeight}`);

        return element;
    }

    render() {
        if (!this.container) {
            return;
        }

        const
            width = this.container.offsetWidth,
            previewHeight = 50,
            height = this.container.offsetHeight - previewHeight,
            i = this.lines.values(),
            previewCanvas = this.createPreviewCanvas({ width, height: previewHeight}),
            mainCanvas = this.createCanvas({
                width,
                height,
                chartX: this.totalWidth - width,
                chartWidth: width,
                chartHeight: this.getMaxValue('y')
            }),
            xAxis = this.buildXAxis();

        let result = i.next();

        this.renderLegend(mainCanvas);

        while (!result.done) {
            const line = result.value.render(xAxis);
            mainCanvas.appendChild(line),
            previewCanvas.appendChild(line.cloneNode());
            result = i.next();
        }

        previewCanvas.setAttribute('class', 'preview');
        this.container.appendChild(mainCanvas);
        this.container.appendChild(previewCanvas);



        this.rendered = true;
    }

    createPreviewCanvas({ width, height }) {
        const element = this.createCanvas({
            width,
            height,
            chartWidth: this.totalWidth,
            chartHeight: this.getMaxValue('y')
        });

        element.setAttribute('preserveAspectRatio', 'none');

        const viewFrame = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        viewFrame.setAttribute('x', this.totalWidth - width);
        viewFrame.setAttribute('y', 0);
        viewFrame.setAttribute('width', width);
        viewFrame.setAttribute('height', this.getMaxValue('y'));
        viewFrame.setAttribute('class', 'view-frame');

        element.appendChild(viewFrame);

        return element;
    }
}