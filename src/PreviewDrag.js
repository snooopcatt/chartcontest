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

        this.minWidth = 30;
        this.handleWidth = 30;

        // store end drag handler, since we don't have any inner events
        this.onEndDrag = config.onEndDrag;
        this.onMove = config.onMove;

        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);

        // listen to pointer down on container to catch clicks outside
        // of the frame element itself
        target.addEventListener('pointerdown', this.onPointerDown);

        // listen to pointerup on document
        document.addEventListener('pointerup', this.onPointerUp);
    }

    onPointerDown(event) {
        if (this.dragging) {
            return;
        }

        event.stopPropagation();
        event.preventDefault();

        let targetBox = this.frame.getBoundingClientRect(),
            boxLeft = targetBox.left,
            boxRight = targetBox.left + targetBox.width,
            threshold = this.handleWidth / 2;

        if (event.pageX > (boxLeft - threshold) && event.pageX < (boxRight + threshold)) {
            if (Math.abs(event.pageX - boxLeft) < threshold) {
                this.startDrag(SIDE.left, event);
            }
            else if (Math.abs(boxRight - event.pageX) < threshold) {
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

            if (newLeft > 0 && width - rightFillerWidth - newLeft >= this.minWidth) {
                this.leftFiller.style.width = `${newLeft}px`;
                this.onMove({ width, left : newLeft, right : rightFillerWidth });
            }
            break;
        case SIDE.right:
            newRight = rightFillerWidth + delta;

            if (newRight > 0 && width - leftFillerWidth - newRight >= this.minWidth) {
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
                this.onMove({ width, left : newLeft, right : newRight });
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