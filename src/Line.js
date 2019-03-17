export default class Line {
    constructor(config = {}) {
        this.name = config.name;
        this.color = config.color;
        this.processPoints(config.values);
    }

    processPoints(points) {
        this.maxYValue = Math.max(...points);
        this.points = points;

        //TODO: remove this when debug is done
        this.points[0] = 0;
        this.points[10] = 250;
        this.points[20] = 95;
    }

    generatePath(xAxis, height, scale = 1) {
        return `M${this.points.map((value, i) => {
            return `${xAxis[i]},${height - value * scale}`;
        }).join(' ')}`;
    }

    render(axis, height, scale = 1) {
        if (axis.length !== this.points.length) {
            // eslint-disable-next-line no-console
            console.warn('x axis has incorrect size');
        }
        let lineElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');

        lineElement.setAttribute('d', this.generatePath(axis, height, scale));
        lineElement.setAttribute('name', this.name);
        lineElement.setAttribute('style', `stroke: ${this.color};`);
        lineElement.setAttribute('class', 'c-line');

        return lineElement;
    }
}