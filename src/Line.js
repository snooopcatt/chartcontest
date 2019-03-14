export default class Line {
    constructor(config = {}) {
        this.name = config.name;
        this.color = config.color;
        this.processPoints(config.values);
    }

    processPoints(points) {
        this.maxYValue = Math.max(...points);
        this.points = points;
    }

    render(axis, height) {
        if (axis.length !== this.points.length) {
            // eslint-disable-next-line no-console
            console.warn('x axis has incorrect size');
        }
        let lineElement = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');

        const points = this.points.map((value, i) => `${axis[i]},${height-value}`).join(' ');
        lineElement.setAttribute('points', points);
        
        lineElement.setAttribute('style', `stroke: ${this.color};`);
        lineElement.setAttribute('class', 'c-line');

        return lineElement;
    }
}