import FryPan from "../../src/main";
// import FryPan from "../../dist/frypan-1.0.0.js"

export default class DemoFramwork {

    canvas;
    ctx;
    miniatureVP;
    miniatureCtx;
    miniatureZorigin;
    miniatureZOutorigin;
    miniatureScale = 0.1;
    scene;

    constructor(options) {

        this.canvas = options.viewportElement;
        this.ctx = this.canvas.getContext("2d");

        this.setMiniature();
        this.resizeCanvas();

        this.scene = new FryPan.Scene(options);
        this.scene.onUpdate = () => this.draw();

        window.addEventListener("resize", () => {
            this.resizeCanvas();
            this.draw(); //? "HACK"
        });
    }

    setMiniature() {
        this.miniatureVP = document.createElement("div");
        this.miniatureVP.id = "miniature";
        document.body.append(this.miniatureVP);
        this.miniatureVP.innerHTML = `
            <div id="ctx"></div>
            <div id="zoomout"></div>
            <div id="zoomin"></div>`;
        this.miniatureCtx = document.querySelector("#miniature #ctx");
        this.miniatureZorigin = document.querySelector("#miniature #zoomin");
        this.miniatureZOutorigin = document.querySelector("#miniature #zoomout");
    }

    resizeCanvas() {
        this.canvas.height = window.innerHeight;
        this.canvas.width = window.innerWidth * 3 / 5;
        this.miniatureVP.style.height = this.canvas.height * this.miniatureScale + "px";
        this.miniatureVP.style.width = this.canvas.width * this.miniatureScale + "px";
    }

    draw() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.onDraw();
        this.updateMiniature();
    }

    updateMiniature() {
        this.miniatureCtx.style.height = this.scene.data.height * this.miniatureScale + "px";
        this.miniatureCtx.style.width = this.scene.data.width * this.miniatureScale + "px";
        this.miniatureCtx.style.top = this.scene.data.y * this.miniatureScale + "px";
        this.miniatureCtx.style.left = this.scene.data.x * this.miniatureScale + "px";
        this.miniatureZorigin.style.top = this.scene.data.zoomOriginY * this.miniatureScale + "px";
        this.miniatureZorigin.style.left = this.scene.data.zoomOriginX * this.miniatureScale + "px";
        this.miniatureZOutorigin.style.top = this.scene.data.zoomOutOriginY * this.miniatureScale + "px";
        this.miniatureZOutorigin.style.left = this.scene.data.zoomOutOriginX * this.miniatureScale + "px";
    }

    onDraw() {/* HOOK */}
}