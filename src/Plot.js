/* eslint-disable quotes */
import Line from './Line.js';
import PreviewDrag from './PreviewDrag.js';
import LabelsAxis from './Labels.js';
import { formatDate } from './Utils.js';

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

const hideCls = 'c-hide',
    nvsblCls = 'c-hidden';

export default class Plot {
    static generateId() {
        this.lastId = this.lastId || 0;
        return `plot-${++this.lastId}`;
    }
    constructor(config = {}) {
        this.lines = new Map();
        this.maxYValues = new Map();
        this.maxXValues = new Map();
        this.linesCacheMain = new Map();
        this.linesCachePrev = new Map();

        this.id = Plot.generateId();
        this.name = config.name || this.id;


        if (config.appendTo instanceof HTMLElement) {
            this.container = config.appendTo;
        }
        else if (config.appendTo) {
            this.container = document.getElementById(config.appendTo);
        }

        // chart configs
        this.anchorCount = 6;
        this.xAxisSize = 30;
        this.rendered = false;
        this.tickWidth = 50;
        this.frameWidth = 35;
        // Pixels to move lines out of the view, to not see them too early
        this.labelsInitialPosBuffer = 20;

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

    get tooltipEl() {
        if (this._tooltipEl) {
            return this._tooltipEl;
        }

        return this._tooltipEl = this.element.querySelector('.c-tooltip');
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

    getMaxValue() {
        let maxValue = 0;

        this.lines.forEach(line => {
            if (!line.disabled && line.maxYValue > maxValue) {
                maxValue = line.maxYValue;
            }
        });

        return maxValue;
    }

    renderLine(config = {}) {
        const lineElement = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        lineElement.setAttribute('class', config.cls || '');
        lineElement.setAttribute('style', config.style || '');
        lineElement.setAttribute('x1', config.x1);
        lineElement.setAttribute('x2', config.x2);
        lineElement.setAttribute('y1', config.y1);
        lineElement.setAttribute('y2', config.y2);

        return lineElement;
    }

    renderLabel({ x, y, text, cls, style }) {
        const element = document.createElementNS('http://www.w3.org/2000/svg', 'text');

        element.setAttribute('x', x);
        element.setAttribute('y', y);
        element.setAttribute('class', cls);
        element.setAttribute('style', style || '');

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

    createLinesAndLabels(startY = 0) {
        let scale = this.getScale(),
            height = this.chartHeight - 30,
            step = Math.ceil(height / this.anchorCount),
            adjustedHeight = startY > height ? -this.labelsInitialPosBuffer : this.chartHeight,
            result = [];

        [...Array(this.anchorCount).keys()].forEach((i) => {
            const
                value = i * step,
                y = adjustedHeight - value - 1;

            result.push(
                {
                    el: this.renderLine({
                        x1: 0,
                        x2: this.chartWidth,
                        y1: startY,
                        y2: startY,
                        cls: `c-anchor-line c-anchor-line-${i}`,
                        style: `transform:translateY(0px);opacity:0;`
                    }),
                    style: `transform:translateY(${y}px);opacity:1;`
                },
                {
                    el: this.renderLabel({
                        x: 0,
                        y: startY,
                        text: Math.ceil(value / scale),
                        cls: `c-anchor-label c-anchor-label-${i}`,
                        style: `transform:translateY(-10px);opacity:0;`
                    }),
                    style: `transform:translateY(${y - 10}px);opacity:1;`
                }
            );
        });

        return result;
    }

    createLegendCanvas() {
        const canvas = this.createCanvas({
            width: this.chartWidth,
            height: this.chartHeight,
            chartWidth: this.chartWidth,
            chartHeight: this.chartHeight,
            cls: 'c-legend-canvas'
        });

        const items = this.createLinesAndLabels();

        items.forEach(item => {
            item.el.setAttribute('style', item.style);
            canvas.appendChild(item.el);
        });

        this.zeroLineTransform = items[0].el.style.transform;
        this.zeroLabelTransform = items[1].el.style.transform;

        return canvas;
    }

    createTipCanvas() {
        const canvas = this.createCanvas({
            width: this.chartWidth,
            height: this.chartHeight,
            chartWidth: this.chartWidth,
            chartHeight: this.chartHeight,
            cls: 'c-tip-canvas'
        });

        canvas.innerHTML += `<line class="${hideCls} c-anchor-line" y1="0" y2="${this.chartHeight}"/>`;

        this.lines.forEach(line => {
            canvas.innerHTML += `<circle class="${hideCls}" name="${line.name}" fill="${line.color}" r="5"/>
            <circle class="${hideCls} c-circle-mask" name="${line.name}" r="3" />`;
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
                onStartDrag: this.onStartDrag.bind(this),
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
    onStartDrag() {
        this.hideTip();
    }

    onMove({ left, right, width }) {
        this.updateChart(left, width - left - right, width);
    }

    onButtonDown(event) {
        const
            btn = event.currentTarget,
            name = btn.getAttribute('name'),
            line = this.lines.get(name);

        this.toggleLine(line);
        this.hideTip();

        // if (lineEl.classList.contains('c-opaque')) {
        if (line.disabled) {
            btn.querySelector('.c-mask').setAttribute('r', 40);
        }
        else {
            btn.querySelector('.c-mask').setAttribute('r', 0);
        }
    }

    onCanvasClick(e) {
        const target = e.currentTarget,
            svgWidth = target.viewBox.baseVal.width,
            hScale = target.clientWidth / svgWidth,
            scrollLeft = target.viewBox.baseVal.x,
            // experimental feature
            eventX = e.layerX,
            chartX = eventX / hScale + scrollLeft,
            step = this.tickWidth,
            index = Math.round(chartX / step),
            x = this.xAxis[index],
            clientX = (x - scrollLeft) * hScale;

        this.showTipAt(clientX, index);
    }

    hideTip() {
        let els = this.tipCanvas.querySelectorAll('*');

        for (let i = 0, l = els.length; i < l; i++) {
            els[i].classList.add(hideCls);
        }

        this.tooltipEl.classList.add(nvsblCls);
    }

    showTipAt(clientX, index) {
        const
            chartHeight = this.chartHeight,
            vScale = this.getScale(),
            tipEl = this.tooltipEl,
            tipContent = [];

        this.lines.forEach(line => {
            if (!line.disabled) {
                let els = this.tipCanvas.querySelectorAll(`[name="${line.name}"]`),
                    value = line.points[index];

                // there are two circles
                for (let i = 0; i < 2; i++) {
                    let el = els[i];

                    el.setAttribute('cx', clientX);
                    el.setAttribute('cy', chartHeight - value * vScale);
                    el.classList.remove(hideCls);
                }

                tipContent.push(`<div style="color:${line.color};"><div>${value}</div><div>${line.name}</div></div>`);
            }
        });

        let lineEl = this.tipCanvas.querySelector('line');
        lineEl.classList.remove(hideCls);
        lineEl.setAttribute('x1', clientX);
        lineEl.setAttribute('x2', clientX);

        tipEl.classList.remove(nvsblCls);
        tipEl.querySelector('.title').innerHTML = formatDate(new Date(this.columns[index]), true);
        const el = tipEl.querySelector('.c-container');
        el.innerHTML = `${tipContent.join('')}`;

        let tipX = clientX - 5;
        if (tipX + tipEl.offsetWidth - 10 > this.chartWidth) {
            tipX = tipX - tipEl.offsetWidth + 10;
        }
        tipEl.style.transform = `translateX(${tipX}px)`;
    }
    //#endregion

    //#region Calculations
    getScale() {
        let maxY = 0;

        this.maxYValues.forEach((value, key) => {
            if (!this.lines.get(key).disabled) {
                maxY = Math.max(maxY, value);
            }
        });

        // All lines were hidden
        if (maxY === 0) {
            return 0;
        }

        let height = this.chartHeight - this.previewHeight;

        return (height / maxY).toFixed(2);
    }
    /**
     * @param {Line} line 
     */
    toggleLine(line) {
        let prevMaxY = this.getMaxValue();
        line.disabled = !line.disabled;

        let direction = prevMaxY > this.getMaxValue() ? 'in' : 'out';

        this.updateLines();
        this.updateLegend(direction);
    }

    updateLines() {
        const scale = this.getScale();

        if (scale === 0) {
            window.requestAnimationFrame(() => {
                this.lines.forEach(line => {
                    this.linesCacheMain.get(line.name).classList.add('c-opaque');
                    this.linesCachePrev.get(line.name).classList.add('c-opaque');
                });
            });
            return;
        }

        const map = new Map();

        this.lines.forEach(line => {
            const path = line.generatePath(this.xAxis, this.chartHeight, scale);
            map.set(line.name, path);
        });

        window.requestAnimationFrame(() => {
            map.forEach((path, name) => {
                let line = this.linesCacheMain.get(name);
                let method = this.lines.get(name).disabled ? 'add' : 'remove';

                line.setAttribute('d', path);
                line.classList[method]('c-opaque');

                line = this.linesCachePrev.get(name);
                line.setAttribute('d', path);
                line.classList[method]('c-opaque');
            });
        });
    }

    updateLegend(dir) {
        const
            scale = this.getScale(),
            bufferPx = this.labelsInitialPosBuffer;

        if (scale === this.oldScale || scale === 0) { return; }

        const
            currentItems = Array.from(this.legendCanvas.children).slice(2),
            newItems = this.createLinesAndLabels(dir === 'in' ? this.chartHeight + bufferPx : 0).slice(2);

        this.oldScale = scale;

        // At first append elements and then change style to enable animations
        newItems.forEach(i => this.legendCanvas.appendChild(i.el));

        window.requestAnimationFrame(() => {
            currentItems.forEach(item => {
                item.setAttribute('style', 'transform:translateY(0);opacity:0;');
                item.addEventListener('transitionend', () => {
                    item.remove();
                });
            });

            newItems.forEach(i => {
                i.el.setAttribute('style', i.style);
            });
        });
    }

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
            height = this.chartHeight,
            iterator = this.lines.values(),
            xAxis = this.buildXAxis(),
            mainCanvas = this.mainCanvas,
            previewCanvas = this.previewCanvas,
            scale = this.getScale() || 1;

        let result = iterator.next();

        while (!result.done) {
            const
                line = result.value,
                name = line.name,
                lineEl = line.render(xAxis, height, scale);

            if (this.linesCacheMain.has(name)) {
                this.linesCacheMain.get(name).setAttribute('points', lineEl.getAttribute('points'));
            }
            else {
                this.linesCacheMain.set(name, mainCanvas.appendChild(lineEl.cloneNode(true)));
            }

            if (this.linesCachePrev.has(name)) {
                this.linesCachePrev.get(name).setAttribute('points', lineEl.getAttribute('points'));
            }
            else {
                this.linesCachePrev.set(name, previewCanvas.appendChild(lineEl.cloneNode(true)));
            }

            result = iterator.next();
        }

        // Cache x axis for future updates
        this.xAxis = xAxis;
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
            <div class="c-main">
                <div class="c-tooltip c-hidden">
                    <div class="title"></div>
                    <div class="c-container"></div>
                </div>
            </div>
            <div class="c-axis"></div>
            <div class="c-preview"></div>
            <div class="c-buttons-container"></div>
        `;

        const
            previewCanvas = this.previewCanvas = this.createPreviewCanvas(),
            legendCanvas = this.legendCanvas = this.createLegendCanvas(),
            mainCanvas = this.mainCanvas = this.createMainCanvas(),
            tipCanvas = this.tipCanvas = this.createTipCanvas();

        let el = element.querySelector('.c-main');
        el.appendChild(legendCanvas);
        el.appendChild(mainCanvas);
        el.appendChild(tipCanvas);

        element.querySelector('.c-preview').appendChild(previewCanvas);

        mainCanvas.addEventListener('pointerdown', this.onCanvasClick.bind(this));

        this.createLabelsAxis();
        this.createButtons();

        this.createPreviewFrame({ width: this.frameWidth });

        // This flag should be true before drawing lines, it shows that all containers are rendered
        this.rendered = true;

        this.oldScale = this.getScale();

        // Draw chart based on dimensions calculated from previewFrame config
        this.updateChart(this.chartWidth * (1 - this.frameWidth / 100), this.chartWidth * (this.frameWidth / 100), this.chartWidth);
    }
}