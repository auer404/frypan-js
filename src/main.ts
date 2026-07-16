/*//TODO

- Clean demos + doc

---

- multiplicator
- hooks
- minZoomFactor > 0
- maxZoomFactor >= minZoomFactor
- setup.fluidSize > scene auto-resizes according to viewportSize

-- Top-down game engine test/integration (MODS >> 1.1)

*/

import defaultConfig from "./defaultConfig";
import Scene from "./Scene";

export default abstract class FryPan {

    static Scene = Scene;

    static sceneSettings() {
        return {
            minZoomFactor: defaultConfig.minZoomFactor,
            maxZoomFactor: defaultConfig.maxZoomFactor,
            intensityCurve: defaultConfig.intensityCurve,
            autoResize: defaultConfig.autoResize,
            preserveCenterOnResize: defaultConfig.preserveCenterOnResize,
            enableZoom: defaultConfig.enableZoom,
            enablePan: defaultConfig.enablePan,
            enableMouseWheel: defaultConfig.enableMouseWheel,
            mouseWheelTakeover: defaultConfig.mouseWheelTakeover,
            enableMouseDrag: defaultConfig.enableMouseDrag,
            zoomKey: defaultConfig.zoomKey,
            dragKey: defaultConfig.dragKey,
            autoZoomCursor: defaultConfig.autoZoomCursor,
            autoDragCursor: defaultConfig.autoDragCursor
        }
    }

    static sceneData() {
        return {
            x: 0,
            y: 0,
            width:0,
            height:0,
            zoomFactor:0,
            previousZoomFactor:0,
            zoomOriginX: 0,
            zoomOriginY: 0,
            relativeZoomOriginX: 0,
            relativeZoomOriginY: 0,
            zoomOutOriginX: 0,
            zoomOutOriginY: 0,
            relativeZoomOutOriginX: 0,
            relativeZoomOutOriginY: 0,
            viewportWidth: 0,
            previousViewportWidth:0,
            viewportHeight:0,
            previousViewportHeight: 0,
            baseWidth:0,
            baseHeight:0
        }
    }
}
