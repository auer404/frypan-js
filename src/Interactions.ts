import type { dragData, mouseData } from "./types";
import type Scene from "./Scene";

export default class Interactions {

    parentScene: Scene;
    surface: HTMLElement;
    isFocused: boolean = document.hasFocus();
    dragKeyDown: boolean = false;
    zoomKeyDown: boolean = false;
    wheelCooldown: number | null = null;

    mouse: mouseData = {
        x: null,
        y: null,
        directionX: null,
        directionY: null,
        down: false
    }

    dragData: dragData = {
        x: null,
        y: null,
        mouseX: null,
        mouseY: null
    }

    handlers: { eventName: string, global?: true, options?: {} }[] = [];
    callbacks: Record<string, EventListener | Function> = {};

    constructor(parentScene: Scene) {
        this.parentScene = parentScene;
        this.surface = this.parentScene.viewportElement as HTMLElement;
        this.handlersSetup();
        this.listen();
    }

    handlersSetup() {

        const s = this.parentScene.settings;

        this.handlers = [
            { eventName: "mouseenter" },
            { eventName: "mouseleave" },
            { eventName: "pointerdown" },
            { eventName: "pointerup", global: true },
            { eventName: "pointermove" },
            { eventName: "wheel", options: { passive: !s.mouseWheelTakeover } },
            { eventName: "keydown", global: true },
            { eventName: "keyup", global: true },
            { eventName: "contextmenu" },
            { eventName: "blur", global: true },
            { eventName: "focus", global: true }
        ];

        this.callbacks = {

            mouseenter: () => {
                if (this.canDrag() && s.autoDragCursor) this.surface.style.cursor = "grab";
            },

            mouseleave: () => {
                if (s.autoDragCursor) this.surface.style.cursor = "";
            },

            pointerdown: (e: PointerEvent) => {
                this.isFocused = true;
                const elem = e.target as HTMLElement;
                elem.setPointerCapture(e.pointerId);
                this.mouse.down = true;
                this.dragData.mouseX = e.offsetX;
                this.dragData.mouseY = e.offsetY;
                this.dragData.x = this.parentScene.data.x;
                this.dragData.y = this.parentScene.data.y;
            },

            pointerup: () => {
                this.isFocused = true;
                this.mouse.down = false;
                this.dragData.mouseX = null;
                this.dragData.mouseY = null;
                this.dragData.x = null;
                this.dragData.y = null;

                if (this.canDrag() && s.autoDragCursor) this.surface.style.cursor = "grab";
                else if (s.autoDragCursor) this.surface.style.cursor = "";
            },

            pointermove: (e: PointerEvent) => {

                if (document.hasFocus()) this.isFocused = true;

                if (e.offsetX == this.mouse.x) this.mouse.directionX = 0;
                else this.mouse.directionX = e.offsetX > (this.mouse.x as number) ? 1 : -1;

                if (e.offsetY == this.mouse.y) this.mouse.directionY = 0;
                else this.mouse.directionY = e.offsetY > (this.mouse.y as number) ? 1 : -1;

                this.mouse.x = e.offsetX;
                this.mouse.y = e.offsetY;

                if (this.mouse.down === true && this.canDrag()) this.drag(e);
            },

            wheel: (e: WheelEvent) => {
                if (!this.isFocused || !this.canZoom()) return;

                if (s.mouseWheelTakeover) e.preventDefault();

                this.parentScene.setZoomOriginTo({
                    x: this.mouse.x as number,
                    y: this.mouse.y as number
                });

                const currZoomFactor = this.parentScene.data.zoomFactor;

                let newZoomFactor = currZoomFactor - e.deltaY / 500;

                let boost = newZoomFactor * s.intensityCurve;
                if (e.deltaY > 0) boost *= -1;
                newZoomFactor += boost;

                if (newZoomFactor < s.minZoomFactor) newZoomFactor = s.minZoomFactor;

                if (newZoomFactor > s.maxZoomFactor) newZoomFactor = s.maxZoomFactor;

                this.parentScene.setZoomTo(newZoomFactor);

                if (s.autoZoomCursor) {

                    if (newZoomFactor > currZoomFactor) {
                        this.surface.style.cursor = "zoom-in";
                    } else if (newZoomFactor < currZoomFactor) {
                        this.surface.style.cursor = "zoom-out";
                    } else {
                        this.surface.style.cursor = "not-allowed";
                    }

                    clearTimeout(this.wheelCooldown as number);

                    this.wheelCooldown = window.setTimeout(() => {
                        if (this.canDrag() && s.autoDragCursor) this.surface.style.cursor = "grab";
                        else this.surface.style.cursor = "";
                    }, 250);
                }
            },

            keydown: (e: KeyboardEvent) => {

                if ((e.key == s.dragKey || e.code == s.dragKey) && !this.dragKeyDown) {
                    this.dragKeyDown = true;
                    if (this.canDrag() && s.autoDragCursor) this.surface.style.cursor = "grab";
                }
                if ((e.key == s.zoomKey || e.code == s.zoomKey) && !this.zoomKeyDown) {
                    this.zoomKeyDown = true;
                }
            },

            keyup: (e: KeyboardEvent) => {

                if (e.key === s.dragKey || e.code == s.dragKey) {
                    this.dragKeyDown = false;
                    if (s.autoDragCursor) this.surface.style.cursor = "";
                }
                if (e.key == s.zoomKey || e.code == s.zoomKey) {
                    this.zoomKeyDown = false;
                }
            },

            contextmenu: (e: PointerEvent) => {
                this.callbacks.pointerup(e);
            },

            blur: () => {
                this.isFocused = false;
            },

            focus: () => {
                this.isFocused = true;
            }

        }
    }

    listen() {
        for (const h of this.handlers) {
            const target = h.global ? window : this.surface;
            target.addEventListener(h.eventName, this.callbacks[h.eventName] as EventListener, h.options);
        }
    }

    destroy() {
        for (const h of this.handlers) {
            const target = h.global ? window : this.surface;
            target.removeEventListener(h.eventName, this.callbacks[h.eventName] as EventListener, h.options);
        }
    }

    canZoom(): boolean {
        return this.parentScene.settings.enableZoom && this.parentScene.settings.enableMouseWheel && (
            this.zoomKeyDown || this.parentScene.settings.zoomKey === false
        )
    }

    canDrag(): boolean {
        return this.parentScene.settings.enablePan && this.parentScene.settings.enableMouseDrag && (
            this.dragKeyDown || this.parentScene.settings.dragKey === false
        )
    }

    drag(e: PointerEvent) {

        if (
            this.mouse.x == null
            || this.mouse.y == null
            || this.dragData.mouseX == null
            || this.dragData.mouseY == null
            || this.dragData.x == null
            || this.dragData.y == null
        ) return;

        const distX = this.mouse.x - this.dragData.mouseX;
        const distY = this.mouse.y - this.dragData.mouseY;

        const newX = this.dragData.x + distX;
        const newY = this.dragData.y + distY;

        const clamped = this.parentScene.clampPosition({ x: newX, y: newY });
        const cancelX = newX != clamped.x;
        const cancelY = newY != clamped.y;

        let finalX = newX;

        if (cancelX) {
            if (
                (newX < 0 && this.mouse.directionX == -1)
                ||
                (newX > this.parentScene.data.viewportWidth - this.parentScene.data.width && this.mouse.directionX == 1)
                ||
                this.mouse.directionX == 0
            ) {
                finalX = this.parentScene.data.x;
                this.callbacks.pointerup(e);
                this.callbacks.pointerdown(e);
            }
        }

        let finalY = newY;

        if (cancelY) {
            if (
                (newY < 0 && this.mouse.directionY == -1)
                ||
                (newY > this.parentScene.data.viewportHeight - this.parentScene.data.height && this.mouse.directionY == 1)
                ||
                this.mouse.directionY == 0
            ) {
                finalY = this.parentScene.data.y;
                this.callbacks.pointerup(e);
                this.callbacks.pointerdown(e);
            }
        }

        const positionChanged = this.parentScene.setPositionTo({
            x: finalX,
            y: finalY
        }, false);

        if (this.parentScene.settings.autoDragCursor) {
            if (positionChanged) {
                this.surface.style.cursor = "grabbing";
            } else {
                this.surface.style.cursor = "not-allowed";
            }
        }
    }

}