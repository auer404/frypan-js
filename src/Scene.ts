import type { sceneOptions, coordOptions, sceneData, dimOptions, rectOptions, sceneSettings } from "./types";

type cloneData = {
    width: number,
    height: number,
    ref: {x: number, y: number}
}

import defaultConfig from "./defaultConfig";
import Interactions from "./Interactions";
import FryPan from "./main";

export default class Scene {

    data: sceneData = FryPan.sceneData();
    viewportElement: HTMLElement | null = null;
    observer: ResizeObserver | null = null;
    interactions: Interactions | null = null;
    settings: sceneSettings = FryPan.sceneSettings();
    clones: cloneData = {width: 1, height: 1, ref: {x: 0, y: 0}};

    constructor(options: sceneOptions) {
        this.initSettings(options);
        this.initState(options);
        this.initInteractions();
    }

    initSettings(options: sceneOptions) {

        const s = this.settings;
        if (options.viewportElement && options.viewportElement instanceof HTMLElement) {
            this.viewportElement = options.viewportElement;
        } else this.viewportElement = document.body;

        for (const key in s) {
            const propName = key as keyof typeof s;
            (s as any)[propName] = options[propName] ?? s[propName];
        }
    }

    initState(options: sceneOptions) {
        if (!this.viewportElement) return;

        this.resizeViewport({
            width: this.viewportElement.offsetWidth,
            height: this.viewportElement.offsetHeight,
        });

        this.resizeBase({
            width: options.width ?? this.viewportElement.offsetWidth,
            height: options.height ?? this.viewportElement.offsetHeight
        });

        this.setZoomTo(options.initialZoomFactor || defaultConfig.initialZoomFactor);
        if (this.data.zoomFactor < this.settings.minZoomFactor) this.setZoomTo(this.settings.minZoomFactor);
        if (this.data.zoomFactor > this.settings.maxZoomFactor) this.setZoomTo(this.settings.maxZoomFactor);
    }

    initInteractions() {

        this.interactions = new Interactions(this);

        if (this.settings.autoResize) {
            this.observer = new ResizeObserver(() => {
                this.resizeViewport({ width: this.viewportElement?.offsetWidth, height: this.viewportElement?.offsetHeight });
                this.onUpdate();
            });
            this.observer.observe(this.viewportElement as HTMLElement);
        } else {
            setTimeout(() => this.onUpdate(), 50);
        }
    }

    reset() {
        this.data.x = 0;
        this.data.y = 0;
        this.data.zoomFactor = 1;
    }

    destroy() {
        this.interactions?.destroy();
        this.observer?.disconnect();
    }

    setZoomTo(newZoomValue: number): boolean {

        newZoomValue = Math.max(Math.min(newZoomValue, this.settings.maxZoomFactor), this.settings.minZoomFactor);

        this.data.previousZoomFactor = this.data.zoomFactor;
        this.data.zoomFactor = newZoomValue;
        const zoomChanged = this.data.previousZoomFactor != this.data.zoomFactor;
        if (zoomChanged) {
            this.applyZoom();
            this.updateClones();
            this.onUpdate();
        } 
        return zoomChanged;
    }

    changeZoomBy(zoomDiff: number): boolean {
        return this.setZoomTo(this.data.zoomFactor + zoomDiff);
    }

    setPositionTo(options: coordOptions, clamp: boolean = true): boolean {

        const clampedPosition = clamp ? this.clampPosition(options) : options;

        const currPosition = { x: this.data.x, y: this.data.y }

        if (clampedPosition.x !== undefined) this.data.x = clampedPosition.x;
        if (clampedPosition.y !== undefined) this.data.y = clampedPosition.y;

        const positionChanged = currPosition.x != this.data.x || currPosition.y != this.data.y;

        if (positionChanged) {
            this.updateClones();
            this.updateRelativeZoomOrigin();
            this.updateRelativeZoomOutOrigin();
            this.onUpdate();
        }

        return positionChanged;
    }

    changePositionBy(options: coordOptions, clamp: boolean = true) {

        const newPosition = {
            x: options.x !== undefined ? this.data.x + options.x : undefined,
            y: options.y !== undefined ? this.data.y + options.y : undefined,
        }
        this.setPositionTo(newPosition, clamp);
    }

    center() {
        const x = (this.data.viewportWidth - this.data.width) / 2;
        const y = (this.data.viewportHeight - this.data.height) / 2;
        this.setPositionTo({ x, y });
    }

    trySetView(options: rectOptions) {

        const wRatio = this.data.viewportWidth / options.width;
        const hRatio = this.data.viewportHeight / options.height;

        const optimalZoomFactor = Math.min(wRatio, hRatio);

        const zoomed = this.setZoomTo(optimalZoomFactor);

        const finalDiff = {
            x: Math.round(this.data.viewportWidth - (options.width * this.data.zoomFactor)),
            y: Math.round(this.data.viewportHeight - (options.height * this.data.zoomFactor))
        }

        const scaledOrigin = {
            x: options.x * this.data.zoomFactor,
            y: options.y * this.data.zoomFactor
        }

        const finalPosition = {
            x: (finalDiff.x === 0) ? - scaledOrigin.x : finalDiff.x / 2 - scaledOrigin.x,
            y: (finalDiff.y === 0) ? - scaledOrigin.y : finalDiff.y / 2 - scaledOrigin.y,
        }

        if (zoomed) {
            this.setPositionTo(finalPosition);
        }
    }

    resizeViewport(options: dimOptions) {

        this.data.previousViewportHeight = this.data.viewportHeight;
        this.data.previousViewportWidth = this.data.viewportWidth;

        this.data.viewportWidth = options.width as number;
        this.data.viewportHeight = options.height as number;

        if (this.settings.preserveCenterOnResize) {
            const diff = {
                x: (this.data.viewportWidth - this.data.previousViewportWidth) / 2,
                y: (this.data.viewportHeight - this.data.previousViewportHeight) / 2,
            }

            this.changePositionBy(diff);
        }

        this.onUpdate();
    }

    resizeBase(options: dimOptions) {
        this.data.baseWidth = options.width as number;
        this.data.baseHeight = options.height as number;
    }

    setZoomOriginTo(options: coordOptions) {
        if (options.x !== undefined) this.data.zoomOriginX = options.x;
        if (options.y !== undefined) this.data.zoomOriginY = options.y;
        this.updateRelativeZoomOrigin();
    }

    setZoomOutOriginTo(options: coordOptions) {
        if (options.x !== undefined) this.data.zoomOutOriginX = options.x;
        if (options.y !== undefined) this.data.zoomOutOriginY = options.y;
        this.updateRelativeZoomOutOrigin();
    }

    setRelativeZoomOriginTo(options: coordOptions) {
        if (options.x !== undefined) this.data.relativeZoomOriginX = options.x;
        if (options.y !== undefined) this.data.relativeZoomOriginY = options.y;
    }

    setRelativeZoomOutOriginTo(options: coordOptions) {
        if (options.x !== undefined) this.data.relativeZoomOutOriginX = options.x;
        if (options.y !== undefined) this.data.relativeZoomOutOriginY = options.y;
    }

    getRelativeZoomOrigin(): coordOptions {
        return {
            x: ((this.data.zoomOriginX - this.data.x) / this.data.width) || 0,
            y: ((this.data.zoomOriginY - this.data.y) / this.data.height) || 0
        }
    }

    getRelativeZoomOutOrigin(): coordOptions {
        return {
            x: ((this.data.zoomOutOriginX - this.data.x) / this.data.width) || 0,
            y: ((this.data.zoomOutOriginY - this.data.y) / this.data.height) || 0
        }
    }

    updateRelativeZoomOrigin() {
        const o = this.getRelativeZoomOrigin();
        this.setRelativeZoomOriginTo(o);
    }

    updateRelativeZoomOutOrigin() {
        const o = this.getRelativeZoomOutOrigin();
        this.setRelativeZoomOutOriginTo(o);
    }

    getView(): rectOptions {

        const reverted = this.revertTranspose({ x: 0, y: 0 })

        return {
            x: reverted.x,
            y: reverted.y,
            width: this.revertScale(this.data.viewportWidth),
            height: this.revertScale(this.data.viewportHeight)
        };
    }

    clampPosition(options: coordOptions) {

        const clamped: coordOptions = {};

        if (options.x !== undefined) {

            const maxX = this.data.viewportWidth - this.data.width;
            const widthContained = this.data.width <= this.data.viewportWidth;

            if ((options.x < 0 && widthContained) || (options.x >= 0 && !widthContained)) {
                clamped.x = 0;
            } else if ((options.x > maxX && widthContained) || (options.x <= maxX && !widthContained)) {
                clamped.x = maxX;
            } else {
                clamped.x = options.x;
            }
        }

        if (options.y !== undefined) {

            const maxY = this.data.viewportHeight - this.data.height;
            const heightContained = this.data.height <= this.data.viewportHeight;

            if ((options.y < 0 && heightContained) || (options.y >= 0 && !heightContained)) {
                clamped.y = 0;
            } else if ((options.y > maxY && heightContained) || (options.y <= maxY && !heightContained)) {
                clamped.y = maxY;
            } else {
                clamped.y = options.y;
            }
        }

        return clamped;
    }

    applyZoom() {

        this.data.width = this.data.baseWidth * this.data.zoomFactor;
        this.data.height = this.data.baseHeight * this.data.zoomFactor;

        const zoomIn = this.data.zoomFactor > this.data.previousZoomFactor;

        const viewportFull = (
            !this.coordsInsideViewport({ x: this.data.x })
            &&
            !this.coordsInsideViewport({ x: this.data.x + this.data.width })
            &&
            !this.coordsInsideViewport({ y: this.data.y })
            &&
            !this.coordsInsideViewport({ y: this.data.y + this.data.height })
        )

        const origin = {
            x: zoomIn || viewportFull ? this.data.zoomOriginX : this.data.zoomOutOriginX,
            y: zoomIn || viewportFull ? this.data.zoomOriginY : this.data.zoomOutOriginY,
            relX: zoomIn || viewportFull ? this.data.relativeZoomOriginX : this.data.relativeZoomOutOriginX,
            relY: zoomIn || viewportFull ? this.data.relativeZoomOriginY : this.data.relativeZoomOutOriginY,
        }

        const minWidth = this.data.baseWidth * this.settings.minZoomFactor;
        const minHeight = this.data.baseHeight * this.settings.minZoomFactor;

        const centerOffsetAtMinZoom = {
            x: (this.data.viewportWidth - minWidth) / 2,
            y: (this.data.viewportHeight - minHeight) / 2
        }

        this.data.x = 0 - (origin.relX * this.data.width - origin.x);
        this.data.y = 0 - (origin.relY * this.data.height - origin.y);

        this.updateRelativeZoomOrigin();

        const denomX = this.data.width - minWidth;
        const denomY = this.data.height - minHeight;

        const zoomOutOrigin = {
            x: (centerOffsetAtMinZoom.x * this.data.width - minWidth * this.data.x) / denomX,
            y: (centerOffsetAtMinZoom.y * this.data.height - minHeight * this.data.y) / denomY
        }

        if (!isFinite(zoomOutOrigin.x)) zoomOutOrigin.x = centerOffsetAtMinZoom.x;
        if (!isFinite(zoomOutOrigin.y)) zoomOutOrigin.y = centerOffsetAtMinZoom.y;

        this.setZoomOutOriginTo(zoomOutOrigin);
    }

    updateClones() {
        if (!this.settings.spherical || this.data.width == 0 || this.data.height == 0) return;

        const margin = {
            left:this.data.x,
            right: this.data.viewportWidth - (this.data.x + this.data.width),
            top:this.data.y,
            bottom: this.data.viewportHeight - (this.data.y + this.data.height)
        }

        this.clones.width = 1;
        this.clones.height = 1;
        this.clones.ref = {x: 0, y:0};

        if (margin.left > 0) {
            const left = Math.ceil(margin.left / this.data.width);
            this.clones.width += left;
            this.clones.ref.x = left;
        }
        if (margin.right > 0) {
            const right = Math.ceil(margin.right / this.data.width);
            this.clones.width += right;
            this.clones.ref.x = this.clones.width - right - 1;
        }
        if (margin.top > 0) {
            const top = Math.ceil(margin.top / this.data.height);
            this.clones.height += top;
            this.clones.ref.y = top;
        }
        if (margin.bottom > 0) {
            const bottom = Math.ceil(margin.bottom / this.data.height);
            this.clones.height += bottom;
            this.clones.ref.y = this.clones.height - bottom - 1;
        }

        const idealX = Math.round((this.clones.width - 1) / 2);
        const idealY = Math.round((this.clones.height - 1) / 2);

        const diffX = this.clones.ref.x - idealX;
        const diffY = this.clones.ref.y - idealY;

        if (diffX != 0 && !isNaN(diffX)) {
            const offsetX = - diffX * this.data.width;
            this.changePositionBy({x: offsetX , y: 0}, false);
        }

        if (diffY != 0 && !isNaN(diffY)) {
            const offsetY = - diffY * this.data.height;
            this.changePositionBy({x: 0, y: offsetY}, false);
        }
    }

    forEachClone(callback: Function) {
        
        for (let y = 0; y < this.clones.height; y++) {
            for (let x = 0; x < this.clones.width; x++) {

                const offsetX = (x - this.clones.ref.x) * this.data.width;
                const offsetY = (y - this.clones.ref.y) * this.data.height;

                const transposeFunction = this.createCloneTransposeFunction(offsetX, offsetY);
                
                callback({
                    scene: {x: this.data.x + offsetX, y: this.data.y +  offsetY},
                    transpose: transposeFunction
                });
            }
        }
    }

    coordsInsideViewport(options: coordOptions): boolean {
        return (
            (options.x !== undefined || options.y !== undefined)
            &&
            (options.x === undefined || (options.x >= 0 && options.x <= this.data.viewportWidth))
            &&
            (options.y === undefined || (options.y >= 0 && options.y <= this.data.viewportHeight))
        );
    }

    getDisplayRect() {

        const { x, y, zoomFactor, viewportWidth, viewportHeight } = this.data;

        const startX = -x / zoomFactor;
        const startY = -y / zoomFactor;
        const endX = (viewportWidth - x) / zoomFactor;
        const endY = (viewportHeight - y) / zoomFactor;

        return {
            x: startX,
            y: startY,
            width: endX,
            height: endY,
        };
    }

    transpose(options: coordOptions): coordOptions {
        const res: coordOptions = {};

        if (options.x !== undefined) {
            res.x = options.x * this.data.zoomFactor + this.data.x;
        }
        if (options.y !== undefined) {
            res.y = options.y * this.data.zoomFactor + this.data.y;
        }
        return res;
    }

    createCloneTransposeFunction(offsetX: number, offsetY: number): Function {
        
        const f = (options: coordOptions) => {
            const res: coordOptions = {};
            const transposed = this.transpose(options);
            if (transposed.x !== undefined) res.x = transposed.x + offsetX;
            if (transposed.y !== undefined) res.y = transposed.y + offsetY;
            return res;
        }

        return f;
    }

    revertTranspose(options: coordOptions): coordOptions {
        const res: coordOptions = {};
        if (options.x !== undefined) res.x = (options.x - this.data.x) / this.data.zoomFactor;
        if (options.y !== undefined) res.y = (options.y - this.data.y) / this.data.zoomFactor;
        return res;
    }

    scale(value: number): number {
        return value * this.data.zoomFactor;
    }

    revertScale(value: number): number {
        return value / this.data.zoomFactor;
    }

    onUpdate() {/* HOOK */ }
    onZoomKeyDown() {/* HOOK */}
    onZoomKeyUp() {/* HOOK */}
    onDragKeyDown() {/* HOOK */}
    onDragKeyUp() {/* HOOK */}
}