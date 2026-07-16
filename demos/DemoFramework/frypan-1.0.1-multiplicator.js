//#region src/defaultConfig.ts
var defaultConfig = {
	initialZoomFactor: 1,
	minZoomFactor: 1,
	maxZoomFactor: 2,
	intensityCurve: .025,
	autoResize: true,
	preserveCenterOnResize: true,
	enableZoom: true,
	enableMouseWheel: false,
	mouseWheelTakeover: false,
	zoomKey: false,
	autoZoomCursor: false,
	enablePan: true,
	enableMouseDrag: false,
	dragKey: false,
	autoDragCursor: false
};
//#endregion
//#region src/Interactions.ts
var Interactions = class {
	parentScene;
	surface;
	isFocused = document.hasFocus();
	dragKeyDown = false;
	zoomKeyDown = false;
	wheelCooldown = null;
	mouse = {
		x: null,
		y: null,
		directionX: null,
		directionY: null,
		down: false
	};
	dragData = {
		x: null,
		y: null,
		mouseX: null,
		mouseY: null
	};
	handlers = [];
	callbacks = {};
	constructor(parentScene) {
		this.parentScene = parentScene;
		this.surface = this.parentScene.viewportElement;
		this.handlersSetup();
		this.listen();
	}
	handlersSetup() {
		const s = this.parentScene.settings;
		this.handlers = [
			{ eventName: "mouseenter" },
			{ eventName: "mouseleave" },
			{ eventName: "pointerdown" },
			{
				eventName: "pointerup",
				global: true
			},
			{ eventName: "pointermove" },
			{
				eventName: "wheel",
				options: { passive: !s.mouseWheelTakeover }
			},
			{
				eventName: "keydown",
				global: true
			},
			{
				eventName: "keyup",
				global: true
			},
			{ eventName: "contextmenu" },
			{
				eventName: "blur",
				global: true
			},
			{
				eventName: "focus",
				global: true
			}
		];
		this.callbacks = {
			mouseenter: () => {
				if (this.canDrag() && s.autoDragCursor) this.surface.style.cursor = "grab";
			},
			mouseleave: () => {
				if (s.autoDragCursor) this.surface.style.cursor = "";
			},
			pointerdown: (e) => {
				this.isFocused = true;
				e.target.setPointerCapture(e.pointerId);
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
			pointermove: (e) => {
				if (document.hasFocus()) this.isFocused = true;
				if (e.offsetX == this.mouse.x) this.mouse.directionX = 0;
				else this.mouse.directionX = e.offsetX > this.mouse.x ? 1 : -1;
				if (e.offsetY == this.mouse.y) this.mouse.directionY = 0;
				else this.mouse.directionY = e.offsetY > this.mouse.y ? 1 : -1;
				this.mouse.x = e.offsetX;
				this.mouse.y = e.offsetY;
				if (this.mouse.down === true && this.canDrag()) this.drag(e);
			},
			wheel: (e) => {
				if (!this.isFocused || !this.canZoom()) return;
				if (s.mouseWheelTakeover) e.preventDefault();
				this.parentScene.setZoomOriginTo({
					x: this.mouse.x,
					y: this.mouse.y
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
					if (newZoomFactor > currZoomFactor) this.surface.style.cursor = "zoom-in";
					else if (newZoomFactor < currZoomFactor) this.surface.style.cursor = "zoom-out";
					else this.surface.style.cursor = "not-allowed";
					clearTimeout(this.wheelCooldown);
					this.wheelCooldown = window.setTimeout(() => {
						if (this.canDrag() && s.autoDragCursor) this.surface.style.cursor = "grab";
						else this.surface.style.cursor = "";
					}, 250);
				}
			},
			keydown: (e) => {
				if ((e.key == s.dragKey || e.code == s.dragKey) && !this.dragKeyDown) {
					this.dragKeyDown = true;
					if (this.canDrag() && s.autoDragCursor) this.surface.style.cursor = "grab";
				}
				if ((e.key == s.zoomKey || e.code == s.zoomKey) && !this.zoomKeyDown) this.zoomKeyDown = true;
			},
			keyup: (e) => {
				if (e.key === s.dragKey || e.code == s.dragKey) {
					this.dragKeyDown = false;
					if (s.autoDragCursor) this.surface.style.cursor = "";
				}
				if (e.key == s.zoomKey || e.code == s.zoomKey) this.zoomKeyDown = false;
			},
			contextmenu: (e) => {
				this.callbacks.pointerup(e);
			},
			blur: () => {
				this.isFocused = false;
			},
			focus: () => {
				this.isFocused = true;
			}
		};
	}
	listen() {
		for (const h of this.handlers) (h.global ? window : this.surface).addEventListener(h.eventName, this.callbacks[h.eventName], h.options);
	}
	destroy() {
		for (const h of this.handlers) (h.global ? window : this.surface).removeEventListener(h.eventName, this.callbacks[h.eventName], h.options);
	}
	canZoom() {
		return this.parentScene.settings.enableZoom && this.parentScene.settings.enableMouseWheel && (this.zoomKeyDown || this.parentScene.settings.zoomKey === false);
	}
	canDrag() {
		return this.parentScene.settings.enablePan && this.parentScene.settings.enableMouseDrag && (this.dragKeyDown || this.parentScene.settings.dragKey === false);
	}
	drag(e) {
		if (this.mouse.x == null || this.mouse.y == null || this.dragData.mouseX == null || this.dragData.mouseY == null || this.dragData.x == null || this.dragData.y == null) return;
		const distX = this.mouse.x - this.dragData.mouseX;
		const distY = this.mouse.y - this.dragData.mouseY;
		const newX = this.dragData.x + distX;
		const newY = this.dragData.y + distY;
		const clamped = this.parentScene.clampPosition({
			x: newX,
			y: newY
		});
		const cancelX = newX != clamped.x;
		const cancelY = newY != clamped.y;
		let finalX = newX;
		if (cancelX) {
			if (newX < 0 && this.mouse.directionX == -1 || newX > this.parentScene.data.viewportWidth - this.parentScene.data.width && this.mouse.directionX == 1 || this.mouse.directionX == 0) {
				finalX = this.parentScene.data.x;
				this.callbacks.pointerup(e);
				this.callbacks.pointerdown(e);
			}
		}
		let finalY = newY;
		if (cancelY) {
			if (newY < 0 && this.mouse.directionY == -1 || newY > this.parentScene.data.viewportHeight - this.parentScene.data.height && this.mouse.directionY == 1 || this.mouse.directionY == 0) {
				finalY = this.parentScene.data.y;
				this.callbacks.pointerup(e);
				this.callbacks.pointerdown(e);
			}
		}
		const positionChanged = this.parentScene.setPositionTo({
			x: finalX,
			y: finalY
		}, false);
		if (this.parentScene.settings.autoDragCursor) if (positionChanged) this.surface.style.cursor = "grabbing";
		else this.surface.style.cursor = "not-allowed";
	}
};
//#endregion
//#region src/Scene.ts
var Scene = class {
	data = FryPan.sceneData();
	viewportElement = null;
	observer = null;
	interactions = null;
	settings = FryPan.sceneSettings();
	constructor(options) {
		this.initSettings(options);
		this.initState(options);
		this.initInteractions();
	}
	initSettings(options) {
		const s = this.settings;
		if (options.viewportElement && options.viewportElement instanceof HTMLElement) this.viewportElement = options.viewportElement;
		else this.viewportElement = document.body;
		for (const key in s) {
			const propName = key;
			s[propName] = options[propName] ?? s[propName];
		}
	}
	initState(options) {
		if (!this.viewportElement) return;
		this.resizeViewport({
			width: this.viewportElement.offsetWidth,
			height: this.viewportElement.offsetHeight
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
				this.resizeViewport({
					width: this.viewportElement?.offsetWidth,
					height: this.viewportElement?.offsetHeight
				});
				this.onUpdate();
			});
			this.observer.observe(this.viewportElement);
		} else setTimeout(() => this.onUpdate(), 50);
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
	setZoomTo(newZoomValue) {
		newZoomValue = Math.max(Math.min(newZoomValue, this.settings.maxZoomFactor), this.settings.minZoomFactor);
		this.data.previousZoomFactor = this.data.zoomFactor;
		this.data.zoomFactor = newZoomValue;
		const zoomChanged = this.data.previousZoomFactor != this.data.zoomFactor;
		if (zoomChanged) this.applyZoom();
		return zoomChanged;
	}
	changeZoomBy(zoomDiff) {
		return this.setZoomTo(this.data.zoomFactor + zoomDiff);
	}
	setPositionTo(options, clamp = true) {
		const clampedPosition = clamp ? this.clampPosition(options) : options;
		const currPosition = {
			x: this.data.x,
			y: this.data.y
		};
		if (clampedPosition.x !== void 0) this.data.x = clampedPosition.x;
		if (clampedPosition.y !== void 0) this.data.y = clampedPosition.y;
		const positionChanged = currPosition.x != this.data.x || currPosition.y != this.data.y;
		if (positionChanged) {
			this.updateRelativeZoomOrigin();
			this.updateRelativeZoomOutOrigin();
			this.onUpdate();
		}
		return positionChanged;
	}
	changePositionBy(options) {
		const newPosition = {
			x: options.x !== void 0 ? this.data.x + options.x : void 0,
			y: options.y !== void 0 ? this.data.y + options.y : void 0
		};
		this.setPositionTo(newPosition);
	}
	center() {
		const x = (this.data.viewportWidth - this.data.width) / 2;
		const y = (this.data.viewportHeight - this.data.height) / 2;
		this.setPositionTo({
			x,
			y
		});
	}
	trySetView(options) {
		const wRatio = this.data.viewportWidth / options.width;
		const hRatio = this.data.viewportHeight / options.height;
		const optimalZoomFactor = Math.min(wRatio, hRatio);
		const zoomed = this.setZoomTo(optimalZoomFactor);
		const finalDiff = {
			x: Math.round(this.data.viewportWidth - options.width * this.data.zoomFactor),
			y: Math.round(this.data.viewportHeight - options.height * this.data.zoomFactor)
		};
		const scaledOrigin = {
			x: options.x * this.data.zoomFactor,
			y: options.y * this.data.zoomFactor
		};
		const finalPosition = {
			x: finalDiff.x === 0 ? -scaledOrigin.x : finalDiff.x / 2 - scaledOrigin.x,
			y: finalDiff.y === 0 ? -scaledOrigin.y : finalDiff.y / 2 - scaledOrigin.y
		};
		if (zoomed) this.setPositionTo(finalPosition);
	}
	resizeViewport(options) {
		this.data.previousViewportHeight = this.data.viewportHeight;
		this.data.previousViewportWidth = this.data.viewportWidth;
		this.data.viewportWidth = options.width;
		this.data.viewportHeight = options.height;
		if (this.settings.preserveCenterOnResize) {
			const diff = {
				x: (this.data.viewportWidth - this.data.previousViewportWidth) / 2,
				y: (this.data.viewportHeight - this.data.previousViewportHeight) / 2
			};
			this.changePositionBy(diff);
		}
		this.onUpdate();
	}
	resizeBase(options) {
		this.data.baseWidth = options.width;
		this.data.baseHeight = options.height;
	}
	setZoomOriginTo(options) {
		if (options.x !== void 0) this.data.zoomOriginX = options.x;
		if (options.y !== void 0) this.data.zoomOriginY = options.y;
		this.updateRelativeZoomOrigin();
	}
	setZoomOutOriginTo(options) {
		if (options.x !== void 0) this.data.zoomOutOriginX = options.x;
		if (options.y !== void 0) this.data.zoomOutOriginY = options.y;
		this.updateRelativeZoomOutOrigin();
	}
	setRelativeZoomOriginTo(options) {
		if (options.x !== void 0) this.data.relativeZoomOriginX = options.x;
		if (options.y !== void 0) this.data.relativeZoomOriginY = options.y;
	}
	setRelativeZoomOutOriginTo(options) {
		if (options.x !== void 0) this.data.relativeZoomOutOriginX = options.x;
		if (options.y !== void 0) this.data.relativeZoomOutOriginY = options.y;
	}
	getRelativeZoomOrigin() {
		return {
			x: (this.data.zoomOriginX - this.data.x) / this.data.width || 0,
			y: (this.data.zoomOriginY - this.data.y) / this.data.height || 0
		};
	}
	getRelativeZoomOutOrigin() {
		return {
			x: (this.data.zoomOutOriginX - this.data.x) / this.data.width || 0,
			y: (this.data.zoomOutOriginY - this.data.y) / this.data.height || 0
		};
	}
	updateRelativeZoomOrigin() {
		const o = this.getRelativeZoomOrigin();
		this.setRelativeZoomOriginTo(o);
	}
	updateRelativeZoomOutOrigin() {
		const o = this.getRelativeZoomOutOrigin();
		this.setRelativeZoomOutOriginTo(o);
	}
	getView() {
		const reverted = this.revertTranspose({
			x: 0,
			y: 0
		});
		return {
			x: reverted.x,
			y: reverted.y,
			width: this.revertScale(this.data.viewportWidth),
			height: this.revertScale(this.data.viewportHeight)
		};
	}
	clampPosition(options) {
		const clamped = {};
		if (options.x !== void 0) {
			const maxX = this.data.viewportWidth - this.data.width;
			const widthContained = this.data.width <= this.data.viewportWidth;
			if (options.x < 0 && widthContained || options.x >= 0 && !widthContained) clamped.x = 0;
			else if (options.x > maxX && widthContained || options.x <= maxX && !widthContained) clamped.x = maxX;
			else clamped.x = options.x;
		}
		if (options.y !== void 0) {
			const maxY = this.data.viewportHeight - this.data.height;
			const heightContained = this.data.height <= this.data.viewportHeight;
			if (options.y < 0 && heightContained || options.y >= 0 && !heightContained) clamped.y = 0;
			else if (options.y > maxY && heightContained || options.y <= maxY && !heightContained) clamped.y = maxY;
			else clamped.y = options.y;
		}
		return clamped;
	}
	applyZoom() {
		this.data.width = this.data.baseWidth * this.data.zoomFactor;
		this.data.height = this.data.baseHeight * this.data.zoomFactor;
		const zoomIn = this.data.zoomFactor > this.data.previousZoomFactor;
		const viewportFull = !this.coordsInsideViewport({ x: this.data.x }) && !this.coordsInsideViewport({ x: this.data.x + this.data.width }) && !this.coordsInsideViewport({ y: this.data.y }) && !this.coordsInsideViewport({ y: this.data.y + this.data.height });
		const origin = {
			x: zoomIn || viewportFull ? this.data.zoomOriginX : this.data.zoomOutOriginX,
			y: zoomIn || viewportFull ? this.data.zoomOriginY : this.data.zoomOutOriginY,
			relX: zoomIn || viewportFull ? this.data.relativeZoomOriginX : this.data.relativeZoomOutOriginX,
			relY: zoomIn || viewportFull ? this.data.relativeZoomOriginY : this.data.relativeZoomOutOriginY
		};
		const minWidth = this.data.baseWidth * this.settings.minZoomFactor;
		const minHeight = this.data.baseHeight * this.settings.minZoomFactor;
		const centerOffsetAtMinZoom = {
			x: (this.data.viewportWidth - minWidth) / 2,
			y: (this.data.viewportHeight - minHeight) / 2
		};
		this.data.x = 0 - (origin.relX * this.data.width - origin.x);
		this.data.y = 0 - (origin.relY * this.data.height - origin.y);
		this.updateRelativeZoomOrigin();
		const denomX = this.data.width - minWidth;
		const denomY = this.data.height - minHeight;
		const zoomOutOrigin = {
			x: (centerOffsetAtMinZoom.x * this.data.width - minWidth * this.data.x) / denomX,
			y: (centerOffsetAtMinZoom.y * this.data.height - minHeight * this.data.y) / denomY
		};
		if (!isFinite(zoomOutOrigin.x)) zoomOutOrigin.x = centerOffsetAtMinZoom.x;
		if (!isFinite(zoomOutOrigin.y)) zoomOutOrigin.y = centerOffsetAtMinZoom.y;
		this.setZoomOutOriginTo(zoomOutOrigin);
		this.onUpdate();
	}
	coordsInsideViewport(options) {
		return (options.x !== void 0 || options.y !== void 0) && (options.x === void 0 || options.x >= 0 && options.x <= this.data.viewportWidth) && (options.y === void 0 || options.y >= 0 && options.y <= this.data.viewportHeight);
	}
	getDisplayedPortion() {
		const x = this.data.x > 0 ? this.data.x : 0;
		const y = this.data.y > 0 ? this.data.y : 0;
		const right = this.data.x + this.data.width;
		const bottom = this.data.y + this.data.height;
		return {
			x,
			y,
			width: right < this.data.viewportWidth ? right - x : this.data.viewportWidth - x,
			height: bottom < this.data.viewportHeight ? bottom - y : this.data.viewportHeight - y
		};
	}
	applyMultiplicator(value, multiplicator) {
		return 1 + multiplicator * (value - 1);
	}
	transpose(options, multiplicator = 1) {
		const res = {};
		if (options.x !== void 0) res.x = options.x * this.applyMultiplicator(this.data.zoomFactor, multiplicator) + this.applyMultiplicator(this.data.x, multiplicator);
		if (options.y !== void 0) res.y = options.y * this.applyMultiplicator(this.data.zoomFactor, multiplicator) + this.applyMultiplicator(this.data.y, multiplicator);
		return res;
	}
	revertTranspose(options) {
		const res = {};
		if (options.x !== void 0) res.x = (options.x - this.data.x) / this.data.zoomFactor;
		if (options.y !== void 0) res.y = (options.y - this.data.y) / this.data.zoomFactor;
		return res;
	}
	scale(value, multiplicator = 1) {
		return value * this.applyMultiplicator(this.data.zoomFactor, multiplicator);
	}
	revertScale(value) {
		return value / this.data.zoomFactor;
	}
	onUpdate() {}
};
//#endregion
//#region src/main.ts
var FryPan = class {
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
		};
	}
	static sceneData() {
		return {
			x: 0,
			y: 0,
			width: 0,
			height: 0,
			zoomFactor: 0,
			previousZoomFactor: 0,
			zoomOriginX: 0,
			zoomOriginY: 0,
			relativeZoomOriginX: 0,
			relativeZoomOriginY: 0,
			zoomOutOriginX: 0,
			zoomOutOriginY: 0,
			relativeZoomOutOriginX: 0,
			relativeZoomOutOriginY: 0,
			viewportWidth: 0,
			previousViewportWidth: 0,
			viewportHeight: 0,
			previousViewportHeight: 0,
			baseWidth: 0,
			baseHeight: 0
		};
	}
};
//#endregion
export { FryPan as default };
