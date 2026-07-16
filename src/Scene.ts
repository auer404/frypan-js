import type { sceneOptions, coordOptions, sceneData, dimOptions, rectOptions, sceneSettings } from "./types";

import defaultConfig from "./defaultConfig";
import Interactions from "./Interactions";
import FryPan from "./main";

export default class Scene {

    data: sceneData = FryPan.sceneData();
    viewportElement: HTMLElement | null = null;
    observer: ResizeObserver | null = null;
    interactions: Interactions | null = null;

    settings: sceneSettings = FryPan.sceneSettings();

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
        if (zoomChanged) this.applyZoom();
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
            this.updateRelativeZoomOrigin();
            this.updateRelativeZoomOutOrigin();
            this.onUpdate();
        }

        return positionChanged;
    }

    changePositionBy(options: coordOptions) {

        const newPosition = {
            x: options.x !== undefined ? this.data.x + options.x : undefined,
            y: options.y !== undefined ? this.data.y + options.y : undefined,
        }

        this.setPositionTo(newPosition);
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

        this.onUpdate();
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

    getDisplayedPortion(): rectOptions {

        const x = this.data.x > 0 ? this.data.x : 0;
        const y = this.data.y > 0 ? this.data.y : 0;

        const right = this.data.x + this.data.width;
        const bottom = this.data.y + this.data.height;

        const width = right < this.data.viewportWidth ? right - x : this.data.viewportWidth - x;
        const height = bottom < this.data.viewportHeight ? bottom - y : this.data.viewportHeight - y;

        return { x, y, width, height };
    }

    applyMultiplicator(value: number, multiplicator: number) {
        return 1 + multiplicator * (value - 1);
    }

    transpose(options: coordOptions, multiplicator: number = 1): coordOptions {
        const res: coordOptions = {};
//x = Math.round(this.base_x * this.apply_multiplicator(zd.zoomfactor) + this.apply_multiplicator(zd.x));

        if (options.x !== undefined) {
            res.x = options.x * this.applyMultiplicator(this.data.zoomFactor, multiplicator) + this.applyMultiplicator(this.data.x, multiplicator);
        }
        if (options.y !== undefined) {
            res.y = options.y * this.applyMultiplicator(this.data.zoomFactor, multiplicator) + this.applyMultiplicator(this.data.y, multiplicator);
        }
        return res;
    }

    revertTranspose(options: coordOptions): coordOptions {
        const res: coordOptions = {};

        if (options.x !== undefined) {
            res.x = (options.x - this.data.x) / this.data.zoomFactor;
        }
        if (options.y !== undefined) {
            res.y = (options.y - this.data.y) / this.data.zoomFactor;
        }
        return res;
    }

    scale(value: number, multiplicator: number = 1): number {
        return value * this.applyMultiplicator(this.data.zoomFactor, multiplicator);
    }

    revertScale(value: number): number {
        return value / this.data.zoomFactor;
    }

    onUpdate() {/* HOOK */ }
}