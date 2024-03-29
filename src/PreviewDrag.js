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
        const fn = () => {};
        this.onEndDrag = config.onEndDrag || fn;
        this.onMove = config.onMove || fn;
        this.onStartDrag = config.onStartDrag || fn;

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
                leftFillerWidth : newLeft,
                rightFillerWidth : newRight,
                totalWidth : width,
                frameWidth
            } = this.dragConfig,
            delta = startX - event.pageX;

        switch (side) {
        case SIDE.left:
            newLeft = newLeft - delta;

            if (newLeft >= 0 && width - newRight - newLeft >= this.minWidth) {
                this.leftFiller.style.width = `${newLeft}px`;
                this.onMove({ width, left : newLeft, right : newRight });
            }
            break;
        case SIDE.right:
            newRight = newRight + delta;

            if (newRight >= 0 && width - newLeft - newRight >= this.minWidth) {
                this.rightFiller.style.width = `${newRight}px`;
                this.onMove({ width, left : newLeft, right : newRight });
            }
            break;
        case SIDE.move:
            newLeft = newLeft - delta;
            newRight = newRight + delta;

            if (newLeft >= 0 && newRight >= 0) {
                this.block = false;
                this.leftFiller.style.width = `${newLeft}px`;
                this.rightFiller.style.width = `${newRight}px`;
                this.onMove({ width, left : newLeft, right : newRight });
            }
            else if (!this.block) {
                this.block = true;
                
                if (newLeft < newRight) {
                    newRight = width - frameWidth;
                    this.leftFiller.style.width = `${0}px`;
                    this.rightFiller.style.width = `${newRight}px`;
                    this.onMove({ width, left : 0, right : newRight });
                }
                else {
                    newLeft = width - frameWidth;
                    this.leftFiller.style.width = `${newLeft}px`;
                    this.rightFiller.style.width = `${0}px`;
                    this.onMove({ width, left : newLeft, right : 0 });
                }
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
            frameWidth: this.frame.offsetWidth,
            leftFillerWidth: this.leftFiller.clientWidth,
            rightFillerWidth: this.rightFiller.clientWidth,
            totalWidth: this.target.clientWidth
        };

        document.addEventListener('pointermove', this.onPointerMove);
        this.onStartDrag();
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