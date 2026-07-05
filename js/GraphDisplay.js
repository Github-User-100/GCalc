import { AppLogger } from '../../shared/AppLogger/javascript/AppLogger.js';
import { ExpressionParser } from './ExpressionParser.js';
import * as THREE from '../lib/three.module.min.js';

function niceStep(range, targetTicks = 8) {
  const rough = range / targetTicks;
  const mag   = Math.pow(10, Math.floor(Math.log10(Math.abs(rough))));
  const norm  = rough / mag;
  const nice  = norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10;
  return nice * mag;
}

function formatTick(n) {
  if (Math.abs(n) < 1e-9) return '0';
  const abs = Math.abs(n);
  if (abs >= 1e4 || abs < 0.01) return parseFloat(n.toPrecision(3)).toString();
  const d = abs >= 100 ? 0 : abs >= 10 ? 1 : abs >= 1 ? 2 : 3;
  return parseFloat(n.toFixed(d)).toString();
}

export class GraphDisplay {
  #canvas;
  #renderer;
  #scene;
  #camera;
  #colorIndex = 0;
  #colors = [0x00e5ff, 0xff6b35, 0x7fff00, 0xff69b4, 0xffd700, 0xda70d6];

  #axisCanvas;
  #axisCtx;
  #tooltipEl;
  #exprList = [];

  #isDragging = false;
  #dragStart  = { x: 0, y: 0 };
  #dragCam    = { left: 0, right: 0, top: 0, bottom: 0 };

  constructor(canvas, axisCanvas, tooltipEl) {
    const log = AppLogger.enter('GraphDisplay.constructor');
    try {
      this.#canvas     = canvas;
      this.#axisCanvas = axisCanvas;
      this.#axisCtx    = axisCanvas.getContext('2d');
      this.#tooltipEl  = tooltipEl;
      this.#initScene();
      log.log('INFO', 'Three.js scene initialized');
    } catch (err) {
      log.log('ERROR', err.message);
      throw err;
    } finally {
      log.complete();
    }
  }

  clearGraph() {
    const log = AppLogger.enter('GraphDisplay.clearGraph');
    try {
      const toRemove = this.#scene.children.filter(obj => obj.userData.removable);
      for (const obj of toRemove) {
        this.#scene.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      }
      this.#colorIndex = 0;
      this.#exprList   = [];
      this.#renderer.render(this.#scene, this.#camera);
      this.#renderAxisLabels();
      log.log('INFO', 'Graph cleared');
    } catch (err) {
      log.log('ERROR', err.message);
      throw err;
    } finally {
      log.complete();
    }
  }

  renderFunction2D(expr) {
    const log = AppLogger.enter('GraphDisplay.renderFunction2D');
    try {
      this.#addFunctionGeometry(expr);
      this.#exprList.push(expr);
      this.#renderer.render(this.#scene, this.#camera);
      this.#renderAxisLabels();
      log.log('INFO', `Rendered 2D: ${expr}`);
    } catch (err) {
      log.log('ERROR', err.message);
      throw err;
    } finally {
      log.complete();
    }
  }

  // ── Private ────────────────────────────────────────────────────────

  #addFunctionGeometry(expr) {
    const cam    = this.#camera;
    const xMin   = cam.left;
    const xMax   = cam.right;
    const yRange = cam.top - cam.bottom;
    const maxDy  = yRange * 0.4;
    const steps  = 600;
    const dx     = (xMax - xMin) / steps;

    const color    = this.#colors[this.#colorIndex++ % this.#colors.length];
    const material = new THREE.LineBasicMaterial({ color });
    let run = [];

    const flushRun = () => {
      if (run.length >= 2) {
        const pos = new Float32Array(run.length * 3);
        for (let i = 0; i < run.length; i++) {
          pos[i * 3] = run[i].x; pos[i * 3 + 1] = run[i].y; pos[i * 3 + 2] = 0;
        }
        const geo  = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const line = new THREE.Line(geo, material);
        line.userData.removable = true;
        this.#scene.add(line);
      }
      run = [];
    };

    for (let i = 0; i <= steps; i++) {
      const x      = xMin + i * dx;
      const result = ExpressionParser.evaluateAt(expr, x);
      const y      = (result instanceof Error || !isFinite(result)) ? null : result;
      if (y === null) {
        flushRun();
      } else {
        if (run.length > 0 && Math.abs(y - run[run.length - 1].y) > maxDy) flushRun();
        run.push({ x, y });
      }
    }
    flushRun();
  }

  #rerenderAll() {
    const toRemove = this.#scene.children.filter(obj => obj.userData.removable);
    for (const obj of toRemove) {
      this.#scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    }
    const exprs = [...this.#exprList];
    this.#exprList   = [];
    this.#colorIndex = 0;
    for (const expr of exprs) {
      this.#addFunctionGeometry(expr);
      this.#exprList.push(expr);
    }
    this.#renderer.render(this.#scene, this.#camera);
    this.#renderAxisLabels();
  }

  #initScene() {
    const w = this.#canvas.clientWidth  || 320;
    const h = this.#canvas.clientHeight || 240;

    this.#renderer = new THREE.WebGLRenderer({ canvas: this.#canvas, antialias: false, alpha: false });
    this.#renderer.setSize(w, h, false);
    this.#renderer.setClearColor(0x0d0d1a, 1);

    this.#scene  = new THREE.Scene();
    this.#camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
    this.#camera.position.set(0, 0, 10);
    this.#camera.lookAt(0, 0, 0);

    this.#drawGrid();
    this.#drawSceneAxes();
    this.#renderer.render(this.#scene, this.#camera);
    this.#syncAxisCanvas(w, h);
    this.#renderAxisLabels();
    this.#startResizeObserver();
    this.#attachMouseHandlers();
  }

  #drawGrid() {
    const gridColor = 0x1a2535;
    const gridHelper = new THREE.GridHelper(200, 200, gridColor, gridColor);
    gridHelper.rotation.x = Math.PI / 2;
    this.#scene.add(gridHelper);
  }

  #drawSceneAxes() {
    const mat = new THREE.LineBasicMaterial({ color: 0x3a6080 });
    const BIG = 1e6;
    const xGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-BIG, 0, 0), new THREE.Vector3(BIG, 0, 0),
    ]);
    const yGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -BIG, 0), new THREE.Vector3(0, BIG, 0),
    ]);
    this.#scene.add(new THREE.Line(xGeo, mat));
    this.#scene.add(new THREE.Line(yGeo, mat));
  }

  #syncAxisCanvas(w, h) {
    this.#axisCanvas.width  = w;
    this.#axisCanvas.height = h;
  }

  #renderAxisLabels() {
    const ctx = this.#axisCtx;
    const w   = this.#axisCanvas.width;
    const h   = this.#axisCanvas.height;
    if (!w || !h) return;
    ctx.clearRect(0, 0, w, h);

    const cam    = this.#camera;
    const xRange = cam.right  - cam.left;
    const yRange = cam.top    - cam.bottom;
    const xStep  = niceStep(xRange);
    const yStep  = niceStep(yRange);

    // Screen position of the world origin
    const ox = ((0 - cam.left) / xRange) * w;
    const oy = ((cam.top - 0)  / yRange) * h;

    ctx.font      = '10px "Courier New", monospace';
    ctx.fillStyle = '#5a8aa8';

    // X-axis tick labels
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    const labelY = Math.max(4, Math.min(h - 14, oy + 4));
    for (let i = Math.ceil(cam.left / xStep); i * xStep <= cam.right + xStep * 0.01; i++) {
      if (i === 0) continue;
      const x  = i * xStep;
      const sx = ((x - cam.left) / xRange) * w;
      ctx.fillText(formatTick(x), sx, labelY);
    }

    // Y-axis tick labels
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'middle';
    const labelX = Math.max(30, Math.min(w - 4, ox - 4));
    for (let i = Math.ceil(cam.bottom / yStep); i * yStep <= cam.top + yStep * 0.01; i++) {
      if (i === 0) continue;
      const y  = i * yStep;
      const sy = ((cam.top - y) / yRange) * h;
      ctx.fillText(formatTick(y), labelX, sy);
    }

    // Origin label — only when both axes are visible
    const oxVisible = ox > 20 && ox < w - 4;
    const oyVisible = oy > 4  && oy < h - 14;
    if (oxVisible && oyVisible) {
      ctx.textAlign    = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText('0', ox - 4, oy + 4);
    }
  }

  #worldFromScreen(clientX, clientY) {
    const rect = this.#canvas.getBoundingClientRect();
    const cam  = this.#camera;
    return {
      x: cam.left + ((clientX - rect.left) / rect.width)  * (cam.right - cam.left),
      y: cam.top  - ((clientY - rect.top)  / rect.height) * (cam.top   - cam.bottom),
    };
  }

  #zoom(factor, clientX, clientY) {
    const { x: wx, y: wy } = this.#worldFromScreen(clientX, clientY);
    const cam = this.#camera;
    cam.left   = wx + (cam.left   - wx) * factor;
    cam.right  = wx + (cam.right  - wx) * factor;
    cam.top    = wy + (cam.top    - wy) * factor;
    cam.bottom = wy + (cam.bottom - wy) * factor;
    cam.updateProjectionMatrix();
    this.#renderer.render(this.#scene, this.#camera);
    this.#renderAxisLabels();
  }

  #attachMouseHandlers() {
    const el = this.#canvas;

    // Zoom — wheel
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.#zoom(e.deltaY > 0 ? 1.15 : 1 / 1.15, e.clientX, e.clientY);
    }, { passive: false });

    // Pan — click-drag
    el.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.#isDragging = true;
      this.#dragStart  = { x: e.clientX, y: e.clientY };
      const cam = this.#camera;
      this.#dragCam = { left: cam.left, right: cam.right, top: cam.top, bottom: cam.bottom };
      el.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (this.#isDragging) {
        const rect   = el.getBoundingClientRect();
        const cam    = this.#camera;
        const xRange = this.#dragCam.right - this.#dragCam.left;
        const yRange = this.#dragCam.top   - this.#dragCam.bottom;
        const dx = (e.clientX - this.#dragStart.x) / rect.width  * xRange;
        const dy = (e.clientY - this.#dragStart.y) / rect.height * yRange;
        cam.left   = this.#dragCam.left   - dx;
        cam.right  = this.#dragCam.right  - dx;
        cam.top    = this.#dragCam.top    + dy;
        cam.bottom = this.#dragCam.bottom + dy;
        cam.updateProjectionMatrix();
        this.#renderer.render(this.#scene, this.#camera);
        this.#renderAxisLabels();
      }
      this.#onMouseMove(e);
    });

    window.addEventListener('mouseup', () => {
      if (this.#isDragging) {
        this.#isDragging    = false;
        el.style.cursor = '';
        this.#rerenderAll();
      }
    });

    el.addEventListener('mouseleave', () => {
      if (!this.#isDragging) this.#tooltipEl.style.display = 'none';
    });
  }

  #onMouseMove(e) {
    const rect = this.#canvas.getBoundingClientRect();
    const inside = e.clientX >= rect.left && e.clientX <= rect.right &&
                   e.clientY >= rect.top  && e.clientY <= rect.bottom;

    if (!inside || !this.#exprList.length) {
      if (!this.#isDragging) this.#tooltipEl.style.display = 'none';
      return;
    }

    const { x: worldX } = this.#worldFromScreen(e.clientX, e.clientY);
    const lines = [`x = ${formatTick(worldX)}`];

    for (let i = 0; i < this.#exprList.length; i++) {
      const result = ExpressionParser.evaluateAt(this.#exprList[i], worldX);
      if (!(result instanceof Error) && isFinite(result)) {
        const label = this.#exprList.length === 1 ? 'y' : `y${i + 1}`;
        lines.push(`${label} = ${formatTick(result)}`);
      }
    }

    this.#tooltipEl.innerHTML = lines.join('<br>');
    this.#tooltipEl.style.display = 'block';

    const par = this.#canvas.parentElement.getBoundingClientRect();
    let tx = e.clientX - par.left + 14;
    let ty = e.clientY - par.top  - 10;
    if (tx + 140 > par.width) tx = e.clientX - par.left - 150;
    if (ty < 4) ty = 4;
    this.#tooltipEl.style.left = `${tx}px`;
    this.#tooltipEl.style.top  = `${ty}px`;
  }

  #startResizeObserver() {
    const observer = new ResizeObserver(() => {
      const w = this.#canvas.clientWidth;
      const h = this.#canvas.clientHeight;
      if (w > 0 && h > 0) {
        this.#renderer.setSize(w, h, false);
        const cam    = this.#camera;
        const aspect = w / h;
        const halfH  = (cam.top - cam.bottom) / 2;
        const midY   = (cam.top + cam.bottom) / 2;
        const midX   = (cam.left + cam.right) / 2;
        cam.left   = midX - halfH * aspect;
        cam.right  = midX + halfH * aspect;
        cam.top    = midY + halfH;
        cam.bottom = midY - halfH;
        cam.updateProjectionMatrix();
        this.#syncAxisCanvas(w, h);
        this.#renderer.render(this.#scene, this.#camera);
        this.#renderAxisLabels();
      }
    });
    observer.observe(this.#canvas.parentElement);
  }
}
