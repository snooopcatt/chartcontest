import Line from './Line.js';
import PreviewDrag from './PreviewDrag.js';

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

        this.linesCacheMain = new Map();
        this.linesCachePrev = new Map();

        if (config.appendTo instanceof HTMLElement) {
            this.container = config.appendTo;
        }
        else if (config.appendTo) {
            this.container = document.getElementById(config.appendTo);
        }

        this.anchorCount = 5;
        this.rendered = false;
        this.tickWidth = 50;

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

    get previewHeight() {
        return 50;
    }

    /**
     * Returns height of the chart portion of the plot (total height - preview height)
     */
    get chartHeight() {
        if (this._cachedChartHeight) {
            return this._cachedChartHeight;
        }

        return this._cachedChartHeight = this.container.offsetHeight - this.previewHeight;
    }

    /**
     * Returns chart width (container width)
     */
    get chartWidth() {
        if (this._cachedChartWidth) {
            return this._cachedChartWidth;
        }

        return this._cachedChartWidth = this.container.offsetWidth;
    }

    //#endregion
    
    //#region Canvas/Rendering
    
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

    createCanvas({ width, height, chartWidth, chartHeight, chartX = 0, cls }) {
        const element = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        // element.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
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

    createMainCanvas() {
        const
            width = this.chartWidth,
            height = this.chartHeight,
            el = this.createCanvas({
                width,
                height,
                chartX: this.totalWidth - width,
                chartWidth: width,
                chartHeight: height
            });
        
        el.setAttribute('preserveAspectRatio', 'none');

        return el;
    }

    createPreviewCanvas() {
        const
            width = this.chartWidth,
            height = this.previewHeight,
            element = this.createCanvas({
                width,
                height,
                chartWidth: this.totalWidth,
                chartHeight: this.chartHeight,
                cls: 'c-preview'
            });

        element.setAttribute('preserveAspectRatio', 'none');

        return element;
    }

    /**
     * 
     * @param {Object} config Config for preview frame
     * @param {Number} config.width Width of the preview frame in percents
     */
    createPreviewFrame(config = {}) {
        const previewCanvas = this.container.querySelector('.c-preview');

        if (previewCanvas) {
            let element = document.createElement('div'),
                width = 100 - (config.width || 30);
                
            element.setAttribute('class', 'c-preview-frame');
            element.setAttribute('style', `height:${this.previewHeight}px;`);

            element.innerHTML = `<div class="filler filler-left" style="width:${width}%"></div>
            <div class="frame"></div>
            <div class="filler filler-right"></div>`;

            element = this.container.appendChild(element);

            this.previewDrag = new PreviewDrag({ 
                target : element,
                onEndDrag : this.onEndDrag.bind(this),
                onMove : this.onMove.bind(this)
            });

            return { 
                left : this.container.querySelector('.filler-left').offsetWidth, 
                width : this.container.querySelector('.frame').offsetWidth 
            };
        }
    }

    createButton(attrs = {}, innerHTML = '') {
        let element = document.createElement('div');

        for (let attr in attrs) {
            element.setAttribute(attr, attrs[attr]);
        }

        element.innerHTML = innerHTML;

        return element;
    }

    createButtons() {
        let iterator = this.lines.iterator.next(),
            buttonsEl = this.container.querySelector('.c-buttons-container');

        while(!iterator.done) {
            let line = iterator.value;

            buttonsEl.appendChild(this.createButton({ class : 'c-button-line' }, line.name));
        }
    }

    //#endregion    

    //#region Events
    onEndDrag() {
    }

    onMove({ left, right, width }) {
        this.updateChart(left, width - left - right, width);
    }
    //#endregion

    //#region Calculations
    /**
     * Recalculates chart params based on frame config
     * @param {Number} left Left position of the preview frame
     * @param {Number} width Width of the preview frame
     */
    updateChart(left, width, totalWidth) {
        let
            scale = width / totalWidth,
            newViewBoxWidth = this.totalWidth * scale,
            leftScroll = left / totalWidth * this.totalWidth;

        this.mainCanvas.viewBox.baseVal.width = newViewBoxWidth;
        this.mainCanvas.viewBox.baseVal.x = leftScroll;
        this.previewCanvas.viewBox.baseVal.width = this.totalWidth;

        if (!this.linesCacheMain.size) {
            this.drawLines();
        }
    }

    drawLines() {
        const
            height = this.chartHeight,
            iterator = this.lines.values(),
            xAxis = this.buildXAxis(),
            mainCanvas = this.mainCanvas,
            previewCanvas = this.previewCanvas;

        let result = iterator.next();

        while (!result.done) {
            const
                line = result.value,
                name = line.name,
                lineEl = line.render(xAxis, height);

            if (this.linesCacheMain.has(name)) {
                this.linesCacheMain.get(name).setAttribute('points', lineEl.getAttribute('points'));       
            }
            else {
                this.linesCacheMain.set(name, mainCanvas.appendChild(lineEl.cloneNode()));
            }

            if (this.linesCachePrev.has(name)) {
                this.linesCachePrev.get(name).setAttribute('points', lineEl.getAttribute('points'));
            }
            else {
                this.linesCachePrev.set(name, previewCanvas.appendChild(lineEl.cloneNode()));
            }

            result = iterator.next();
        }
    }
    //#endregion

    render() {
        if (!this.container) {
            return;
        }

        const
            previewCanvas = this.previewCanvas = this.createPreviewCanvas(),
            legendCanvas = this.legendCanvas = this.createLegendCanvas(),
            mainCanvas = this.mainCanvas = this.createMainCanvas();

        this.container.appendChild(legendCanvas);
        this.container.appendChild(mainCanvas);
        this.container.appendChild(previewCanvas);

        this.createPreviewFrame({ width : 20 });

        // This flag should be true before drawing lines, it shows that all containers are rendered
        this.rendered = true;

        // Draw chart based on dimensions calculated from previewFrame config
        this.updateChart(this.chartWidth * 0.8, this.chartWidth * 0.2, this.chartWidth);
    }
}