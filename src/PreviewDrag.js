const SIDE = Object.freeze({ left: 'left', right: 'right', center: 'center' });

export default class PreviewDrag {
    /**
     * 
     * @param {Object} config 
     * @param {HTMLElement} config.target
     */
    constructor(config = {}) {
        const target = this.target = config.target;
        
        this.frame = target.querySelector('.frame');
        this.leftFiller = target.querySelector('.filler-left');
        this.rightFiller = target.querySelector('.filler-right');

        // store end drag handler, since we don't have any inner events
        this.onEndDrag = config.onEndDrag;
        this.onMove = config.onMove;

        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);

        // listen to pointer down on target
        this.frame.addEventListener('pointerdown', this.onPointerDown);

        // listen to pointerup on document
        document.addEventListener('pointerup', this.onPointerUp);

    }

    //#region params
    get handleWidth() {
        return 20;
    }
    //#endregion

    onPointerDown(event) {
        if (this.dragging) {
            return;
        }

        event.stopPropagation();
        event.preventDefault();

        let targetBox = event.target.getBoundingClientRect(),
            boxLeft = targetBox.left,
            boxRight = targetBox.left + targetBox.width;

        if (event.pageX > boxLeft && event.pageX < boxRight) {
            if (event.pageX - boxLeft < this.handleWidth) {
                this.startDrag(SIDE.left, event);
            }
            else if (boxRight - event.pageX < this.handleWidth) {
                this.startDrag(SIDE.right, event);
            }
            else {
                this.startDrag(SIDE.move, event);
            }
        }
    }

    onPointerMove(event) {
        let {
                startX,
                side,
                leftFillerWidth,
                rightFillerWidth,
                totalWidth : width
            } = this.dragConfig,
            delta = startX - event.pageX,
            newLeft, newRight;

        switch (side) {
        case SIDE.left:
            newLeft = leftFillerWidth - delta;

            if (newLeft > 0) {
                this.leftFiller.style.width = `${newLeft}px`;
                this.onMove({ width, left : leftFillerWidth - delta, right : rightFillerWidth });
            }
            break;
        case SIDE.right:
            newRight = rightFillerWidth + delta;

            if (newRight > 0) {
                this.rightFiller.style.width = `${newRight}px`;
                this.onMove({ width, left : leftFillerWidth, right : newRight });
            }
            break;
        case SIDE.move:
            newLeft = leftFillerWidth - delta;
            newRight = rightFillerWidth + delta;

            if (newLeft > 0 && newRight > 0) {
                this.leftFiller.style.width = `${newLeft}px`;
                this.rightFiller.style.width = `${newRight}px`;
                this.onMove({ width, left : leftFillerWidth - delta, right : rightFillerWidth + delta });
            }
            break;
        }
    }

    onPointerUp(event) {
        event.stopPropagation();
        this.endDrag();
    }

    //#region Drag

    startDrag(side, event) {
        if (this.dragging) {
            return;
        }

        this.dragging = true;

        this.dragConfig = {
            side,
            startX: event.pageX,
            leftFillerWidth: this.leftFiller.clientWidth,
            rightFillerWidth: this.rightFiller.clientWidth,
            totalWidth: this.target.clientWidth
        };

        document.addEventListener('pointermove', this.onPointerMove);
    }

    endDrag() {
        if (this.dragging) {
            this.onEndDrag();
        }

        this.dragging = false;

        document.removeEventListener('pointermove', this.onPointerMove);
    }

    //#endregion
}