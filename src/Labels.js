import { formatDate } from './Utils.js';

export default class LabelsAxis {
    constructor(config = {}) {
        // Approx label width
        this.labelWidth = 40;

        this.visibleClassName = 'c-axis-label-visible';

        let { columns, appendTo, totalWidth } = config;

        const
            labels = [],
            colsCount = columns.length,
            step = 100 / colsCount;

        columns.forEach((date, i) => {
            const text = formatDate(new Date(date)).replace(' ', '&nbsp;');
            const cls = `
                c-axis-label ${i === 0 ? 'c-axis-label-first' : ''} 
                ${i === colsCount - 1 ? 'c-axis-label-last' : ''}`;
            labels.push(`<div class="${cls}" style="left:${step * i}%">${text}</div>`);
        });

        appendTo.innerHTML = `<div class="c-labels-container" style="width:${totalWidth}px">${labels.join('')}</div>`;

        this.container = appendTo.querySelector('.c-labels-container');
        // cache all labels
        this.labels = Array.from(appendTo.querySelectorAll('.c-axis-label')).reverse();
    }

    setWidth(width) {
        if (width === this.width) {
            return;
        }

        this.width = width;

        this.container.style.width = `${width}px`;

        const
            maxLabelsToShow = Math.floor(width / (this.labelWidth * 1.5)),
            labelsCount = this.labels.length;

        if (maxLabelsToShow === this.maxLabelsToShow) {
            return;
        }

        this.maxLabelsToShow = maxLabelsToShow;

        let step = 2;
        while (step < labelsCount / maxLabelsToShow) {
            step *= 2;
        }

        for (let i = 0; i < labelsCount; i++) {
            if (i === labelsCount - 1 || i % step === 0) {
                this.labels[i].classList.add(this.visibleClassName);
            }
            else {
                this.labels[i].classList.remove(this.visibleClassName);
            }
        }
    }

    setLeft(left) {
        this.container.style.marginLeft = `-${left}px`;
    }
}