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
    nvsblCls = 'c-hidden',
    opaqCls = 'c-opaque',
    tmin = 'c-transform-min',
    tmaxP = 'c-transform-max-p',
    tmaxN = 'c-transform-max-n',
    notrans = 'c-notrans';

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

        this.rescaleOnMove = this.createBuffered(this.scaleChart, this, 500);

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

        this.xAxis = this.buildXAxis();
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

    get currentScale() {
        if (this._currentScale) {
            return this._currentScale;
        }

        return this.getScale();
    }
    set currentScale(value) { this._currentScale = value; }

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

        if (text != null)
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

    createLinesAndLabels() {
        let items = [[
            this.renderLine({
                x1: 0,
                x2: this.chartWidth,
                y1: this.chartHeight,
                y2: this.chartHeight,
                cls: `c-anchor-line c-zero`
            }),
            this.renderLabel({
                x: 0,
                y: this.chartHeight - 10,
                text: 0,
                cls: `c-anchor-label c-zero`
            })
        ], []];

        for (let i = 1; i < this.anchorCount; i++) {
            items[1].push(
                this.renderLine({
                    x1: 0,
                    x2: this.chartWidth,
                    y1: 0,
                    y2: 0,
                    cls: `c-anchor-line`
                }),
                this.renderLabel({
                    x: 0,
                    y: 0,
                    cls: `c-anchor-label`
                })
            );
        }

        return items;
    }

    positionLegend({ direction }) {
        let scale = this.currentScale,//this.getScale(),
            height = this.chartHeight - 30,
            chartHeight = this.chartHeight,
            step = Math.ceil(height / this.anchorCount),
            // adjustedHeight = startY > height ? -this.labelsInitialPosBuffer : this.chartHeight,
            zoomIn = direction === 'in',
            startY = zoomIn ? chartHeight : 0,
            sign = zoomIn ? -1 : 1;

        if (direction === 'none') return;

        let labelsToShow = this.showEvenLabels ? this.labelsEven : this.labelsOdd,
            labelsToHide = this.showEvenLabels ? this.labelsOdd : this.labelsEven;
        
        labelsToShow.forEach((el, index) => {
            let i = Math.floor(index / 2) + 1,
                value = i * step,
                transformY = chartHeight - startY - value;

            el.classList.add(notrans);
            el.style.transform = '';
            [tmaxP, tmaxN, tmin].forEach(cls => el.classList.remove(cls));
            

            if (el.tagName === 'text') {
                el.innerHTML = Math.ceil(value / scale);
                el.setAttribute('y', startY - 10);
            }
            else {
                el.setAttribute('y1', startY);
                el.setAttribute('y2', startY);
            }
            window.requestAnimationFrame(() => {
                el.classList.remove(notrans);
                el.style.transform = `translateY(${transformY}px)`;
                el.classList.remove(opaqCls);
            });
        });

        let currentY = parseInt(labelsToHide[0].getAttribute('y1')),
            cls;

        if (currentY !== 0) {
            if (zoomIn) cls = tmaxN;
            else cls = tmin;
        }
        else {
            if (zoomIn) cls = tmin;
            else cls = tmaxP;
        }

        labelsToHide.forEach(el => {
            el.classList.add(cls);
            el.classList.add(opaqCls);
        });

        this.showEvenLabels = !this.showEvenLabels;
    }

    createLegendCanvas() {
        const canvas = this.createCanvas({
            width: this.chartWidth,
            height: this.chartHeight,
            chartWidth: this.chartWidth,
            chartHeight: this.chartHeight,
            cls: 'c-legend-canvas'
        });

        const [zero, items] = this.createLinesAndLabels();

        zero.forEach(item => {
            canvas.appendChild(item);
        });

        this.labelsOdd = items.map(item => canvas.appendChild(item));
        this.labelsEven = items.map(item => canvas.appendChild(item.cloneNode(true)));
        this.showEvenLabels = false;

        // add rule for every chart so far
        const styleEl = document.getElementById('appcss');
        styleEl.sheet.insertRule(`.${tmaxP} { transform: translateY(${this.chartHeight}px) !important; }`);
        styleEl.sheet.insertRule(`.${tmaxN} { transform: translateY(-${this.chartHeight}px) !important; }`);

        // this.zeroLineTransform = items[0].el.style.transform;
        // this.zeroLabelTransform = items[1].el.style.transform;

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
        this.rescaleOnMove({ left, right, width });
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
            vScale = this.currentScale,//getScale(),
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

        return (height / maxY).toFixed(10);
    }
    /**
     * @param {Line} line 
     */
    toggleLine(line) {
        let prevMaxY = this.getMaxValue();
        line.disabled = !line.disabled;

        let maxY = this.getMaxValue(),
            direction;

        if (prevMaxY > maxY) direction = 'in';
        else if (prevMaxY < maxY) direction = 'out';
        else direction = 'none';

        this.scaleChart(null, direction, true);
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
            this.scaleChart({ left, right: 0, width: totalWidth });
        }
    }

    createBuffered(fn, scope, timeout) {
        fn = fn.bind(scope);
        const bfn = (...args) => {
            bfn.args = args;
            if (bfn.timer) return;
            bfn.timer = setTimeout(() => {
                fn(...bfn.args);
                bfn.timer = null;
            }, timeout);
        };
        return bfn;
    }

    scaleChart(config, direction, toggle) {
        config = config || this.lastConfig;
        this.lastConfig = config;

        let { left, right, width } = config,
            from = Math.floor(left / width * this.columns.length),
            to = Math.ceil((1 - right / width) * this.columns.length),
            overallMax = this.getMaxValue(),
            min = overallMax,
            max = 0,
            height = this.chartHeight - this.previewHeight,
            overallScale = height / overallMax,
            scale;

        // find min/max
        this.lines.forEach(line => {
            if (!line.disabled) {
                let [mn, mx] = line.getMinMaxValue(from, to);
                min = Math.min(min, mn);
                max = Math.max(max, mx);
            }
        });

        scale = height / max;

        if (!direction) {
            if (this.currentScale > scale) direction = 'out';
            else if (this.currentScale < scale) direction = 'in';
            else direction = 'none';
        }

        this.currentScale = scale;

        const
            mainCache = this.linesCacheMain,
            previewCache = this.linesCachePrev,
            mainCanvas = this.mainCanvas,
            previewCanvas = this.previewCanvas,
            updatePreview = previewCache.size === 0 || toggle,
            axis = this.xAxis;

        this.lines.forEach(line => {
            let name = line.name,
                method = line.disabled || max === 0 ? 'add' : 'remove';

            if (updatePreview) {
                if (previewCache.has(name)) {
                    let el = previewCache.get(name);
                    if (max !== 0) {
                        el.setAttribute('d', line.generatePath(axis, height, overallScale));
                    }
                    el.classList[method](opaqCls);
                }
                else {
                    let el = line.render(axis, height, overallScale);
                    previewCache.set(name, previewCanvas.appendChild(el));
                }
            }

            if (mainCache.has(name)) {
                let el = mainCache.get(name);
                if (max !== 0) {
                    el.setAttribute('d', line.generatePath(axis, this.chartHeight, scale));
                }
                el.classList[method](opaqCls);
            }
            else {
                let el = line.render(axis, this.chartHeight, overallScale);
                mainCache.set(name, mainCanvas.appendChild(el));
            }
        });

        if (max !== 0) {
            this.positionLegend({ direction, scale });
            // this.updateLegend({ direction, scale });
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
        tipCanvas.addEventListener('pointerdown', this.onCanvasClick.bind(this));

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