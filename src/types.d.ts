export type sceneOptions = {
    viewportElement: HTMLElement,
    width?: number,
    height?: number,
    initialZoomFactor?: number,
    minZoomFactor?: number,
    maxZoomFactor?: number,
    intensityCurve?: number,
    autoResize?: boolean,
    preserveCenterOnResize?: boolean,
    enableZoom?: boolean,
    enableMouseWheel?: boolean,
    mouseWheelTakeover?: boolean,
    zoomKey?: string | boolean,
    autoZoomCursor?: boolean,
    enablePan?: boolean,
    enableMouseDrag?: boolean,
    dragKey?: string | boolean,
    autoDragCursor?: boolean
}

export type sceneSettings = Required<Omit<sceneOptions, "viewportElement" | "width" | "height" | "initialZoomFactor">>;

export type coordOptions = {
    x?: number, y?: number
}

export type dimOptions = {
    width?: number, height?: number
}

export type rectOptions = Required<coorOptions & dimOptions>;

/**************************************/

export type sceneData = {
    x: number,
    y: number,
    baseWidth: number,
    baseHeight: number,
    viewportWidth: number,
    viewportHeight: number,
    previousViewportWidth: number,
    previousViewportHeight: number,
    width: number,
    height: number,
    zoomFactor: number,
    previousZoomFactor: number,
    zoomOriginX: number,
    zoomOriginY: number,
    relativeZoomOriginX: number,
    relativeZoomOriginY: number,
    zoomOutOriginX: number,
    zoomOutOriginY: number,
    relativeZoomOutOriginX: number,
    relativeZoomOutOriginY: number
}

export type mouseData = {
    x: number | null,
    y: number | null,
    directionX: 1 | 0 | -1 | null,
    directionY: 1 | 0 | -1 | null,
    down: boolean
}

export type dragData = {
    x: number | null,
    y: number | null,
    mouseX: number | null,
    mouseY: number | null
}