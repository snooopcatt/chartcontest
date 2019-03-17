/* eslint-disable quotes */
import Line from './Line.js';
import PreviewDrag from './PreviewDrag.js';
import LabelsAxis from './Labels.js';

//#region Debug
// function renderIcon(container) {
//     let el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
//     el.setAttribute('width', 200);
//     el.setAttribute('height', 200);
//     el.setAttribute('viewBox', '0 0 100 100');

//     let lw = 5, cx = 50, cy = 60;
//     let points = [
//         [cx - 2 * lw, cy + lw],
//         [cx + 5 * lw, cy - 6 * lw],
//         [cx + 6 * lw, cy - 5 * lw],
//         [cx - 2 * lw, cy + 3 * lw],
//         [cx - 6 * lw, cy - 1 * lw],
//         [cx - 5 * lw, cy - 2 * lw],
//         [cx - 2 * lw, cy + lw]
//     ].map(i => i.join(',')).join(' ');
//     el.innerHTML = '<circle cx="50" cy="50" r="50" fill="#3DC23F"></circle>';
//     el.innerHTML += `<polyline fill="white" points="${points}"></polyline>`;
//     el.innerHTML += '<circle fill="white" cx="50" cy="50" r="0"><animate attributeName="r" dur="600ms" fill="freeze" from="0" to="40"/></circle>';

//     container.insertBefore(el, this.container.firstElementChild);
// }
//#endregion

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
        this.name = config.name || this.id;

        this.linesCacheMain = new Map();
        this.linesCachePrev = new Map();

        if (config.appendTo instanceof HTMLElement) {
            this.container = config.appendTo;
        }
        else if (config.appendTo) {
            this.container = document.getElementById(config.appendTo);
        }

        // chart configs
        this.anchorCount = 5;
        this.xAxisSize = 30;
        this.rendered = false;
        this.tickWidth = 50;
        this.frameWidth = 35;

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

        return this._cachedChartHeight = this.element.offsetHeight - this.previewHeight;
    }

    /**
     * Returns chart width (container width)
     */
    get chartWidth() {
        if (this._cachedChartWidth) {
            return this._cachedChartWidth;
        }

        return this._cachedChartWidth = this.element.offsetWidth;
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

        let maxValue = this.getMaxValue('y'),
            step = Math.ceil(maxValue / this.anchorCount);

        [...Array(this.anchorCount).keys()].map((i) => {
            const
                value = i * step,
                y = this.chartHeight - value - 1;

            canvas.appendChild(this.renderLine({
                x1: 0,
                x2: this.chartWidth,
                y1: y,
                y2: y,
                cls: `c-anchor-line c-anchor-line-${i}`
            }));

            canvas.appendChild(this.renderLabel({
                x: 0,
                y: y - 10,
                text: value,
                cls: `c-anchor-label c-anchor-label-${i}`
            }));
        });

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
                chartHeight: height,
                cls: 'c-main-canvas'
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
                cls: 'c-preview-canvas'
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
        const previewCanvas = this.element.querySelector('.c-preview');

        if (previewCanvas) {
            let element = document.createElement('div'),
                width = 100 - (config.width || 30);

            element.setAttribute('class', 'c-preview-frame');
            element.setAttribute('style', `height:${this.previewHeight}px;`);

            element.innerHTML = `
                <div class="filler filler-left" style="width:${width}%"></div>
                <div class="frame"></div>
                <div class="filler filler-right"></div>`;

            element = this.element.querySelector('.c-preview').appendChild(element);

            this.previewDrag = new PreviewDrag({
                target: element,
                onEndDrag: this.onEndDrag.bind(this),
                onMove: this.onMove.bind(this)
            });
        }
    }

    createLabelsAxis(xAxis) {
        this.labelsAxis = new LabelsAxis({
            xAxis,
            totalWidth: this.totalWidth,
            columns: this.columns,
            appendTo: this.element.querySelector('.c-axis')
        });
    }

    /**
     * 
     * @param {Line} line 
     */
    createButton(line) {
        let element = document.createElement('div');

        element.innerHTML = `
        <button class="c-button c-presed" name="${line.name}">
            <svg xmlns='http://www.w3.org/2000/svg' width='1.5em' height='1.5em' viewBox='0 0 100 100'>
                <circle cx='50' cy='50' r='50' fill='${line.color}'></circle>
                <polyline fill='white' points='40,65 75,30 80,35 40,75 20,55 25,50 40,65'></polyline>
                <circle class="c-mask" fill='white' cx='50' cy='50' r='0'></circle>
            </svg>
            <p>${line.name}</p>
        </button>`;
        return element.firstElementChild;
    }

    createButtons() {
        let buttonsEl = this.element.querySelector('.c-buttons-container');

        this.lines.forEach(line => {
            const btn = buttonsEl.appendChild(this.createButton(line));
            btn.addEventListener('pointerdown', this.onButtonDown.bind(this));
        });
    }

    //#endregion    

    //#region Events
    onEndDrag() {
    }

    onMove({ left, right, width }) {
        this.updateChart(left, width - left - right, width);
    }

    onButtonDown(event) {
        const
            btn = event.currentTarget,
            name = btn.getAttribute('name'),
            lineEl = this.linesCacheMain.get(name);

        lineEl.classList.toggle('c-opaque');

        if (lineEl.classList.contains('c-opaque')) {
            btn.querySelector('.c-mask').setAttribute('r', 40);
        }
        else {
            btn.querySelector('.c-mask').setAttribute('r', 0);
        }
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

        this.labelsAxis.setWidth(totalWidth / scale);
        this.labelsAxis.setLeft(totalWidth / scale * (left / totalWidth));

        if (!this.linesCacheMain.size) {
            this.drawLines();
        }
    }

    drawLines() {
        const
            height = this.chartHeight - this.xAxisSize,
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

        const element = document.createElement('div');
        element.setAttribute('class', 'c-plot');
        this.element = this.container.appendChild(element);

        element.innerHTML = `
            <div class="title">${this.name}</div>
            <div class="c-main"></div>
            <div class="c-axis"></div>
            <div class="c-preview"></div>
            <div class="c-buttons-container"></div>
        `;

        const
            previewCanvas = this.previewCanvas = this.createPreviewCanvas(),
            legendCanvas = this.legendCanvas = this.createLegendCanvas(),
            mainCanvas = this.mainCanvas = this.createMainCanvas();

        element.querySelector('.c-main').appendChild(legendCanvas);
        element.querySelector('.c-main').appendChild(mainCanvas);
        element.querySelector('.c-preview').appendChild(previewCanvas);

        this.createLabelsAxis();
        this.createButtons();

        this.createPreviewFrame({ width: this.frameWidth });

        // This flag should be true before drawing lines, it shows that all containers are rendered
        this.rendered = true;

        // Draw chart based on dimensions calculated from previewFrame config
        this.updateChart(this.chartWidth * (1 - this.frameWidth / 100), this.chartWidth * (this.frameWidth / 100), this.chartWidth);
    }
}