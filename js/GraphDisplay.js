import { AppLogger } from '../../shared/AppLogger/javascript/AppLogger.js';
import { ExpressionParser } from './ExpressionParser.js';
import * as THREE from '../lib/three.module.min.js';

export class GraphDisplay {
  #canvas;
  #renderer;
  #scene;
  #camera;
  #colorIndex = 0;
  #colors = [0x00e5ff, 0xff6b35, 0x7fff00, 0xff69b4, 0xffd700, 0xda70d6];

  constructor(canvas) {
    const log = AppLogger.enter('GraphDisplay.constructor');
    try {
      this.#canvas = canvas;
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
      this.#renderer.render(this.#scene, this.#camera);
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
      const xMin = this.#camera.left;
      const xMax = this.#camera.right;
      const yRange = this.#camera.top - this.#camera.bottom;
      const maxDy = yRange * 0.4; // treat larger jumps as discontinuities
      const steps = 600;
      const dx = (xMax - xMin) / steps;

      const color = this.#colors[this.#colorIndex++ % this.#colors.length];
      const material = new THREE.LineBasicMaterial({ color });
      let run = [];

      const flushRun = () => {
        if (run.length >= 2) {
          const pos = new Float32Array(run.length * 3);
          for (let i = 0; i < run.length; i++) {
            pos[i * 3] = run[i].x; pos[i * 3 + 1] = run[i].y; pos[i * 3 + 2] = 0;
          }
          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
          const line = new THREE.Line(geo, material);
          line.userData.removable = true;
          this.#scene.add(line);
        }
        run = [];
      };

      for (let i = 0; i <= steps; i++) {
        const x = xMin + i * dx;
        const result = ExpressionParser.evaluateAt(expr, x);
        const y = (result instanceof Error || !isFinite(result)) ? null : result;
        if (y === null) {
          flushRun();
        } else {
          if (run.length > 0 && Math.abs(y - run[run.length - 1].y) > maxDy) flushRun();
          run.push({ x, y });
        }
      }
      flushRun();

      this.#renderer.render(this.#scene, this.#camera);
      log.log('INFO', `Rendered 2D: ${expr}`);
    } catch (err) {
      log.log('ERROR', err.message);
      throw err;
    } finally {
      log.complete();
    }
  }

  // ── Private ────────────────────────────────────────────────────────

  #initScene() {
    const w = this.#canvas.clientWidth  || 320;
    const h = this.#canvas.clientHeight || 240;

    this.#renderer = new THREE.WebGLRenderer({
      canvas: this.#canvas,
      antialias: false,
      alpha: false,
    });
    this.#renderer.setSize(w, h, false);
    this.#renderer.setClearColor(0x0d0d1a, 1);

    this.#scene  = new THREE.Scene();
    this.#camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
    this.#camera.position.set(0, 0, 10);
    this.#camera.lookAt(0, 0, 0);

    this.#drawGrid();
    this.#renderer.render(this.#scene, this.#camera);
    this.#startResizeObserver();
  }

  #drawGrid() {
    const gridColor = 0x1e2a3a;
    const axisColor = 0x2a4060;

    const gridHelper = new THREE.GridHelper(20, 20, axisColor, gridColor);
    gridHelper.rotation.x = Math.PI / 2; // lay flat → face camera in orthographic
    this.#scene.add(gridHelper);
  }

  #startResizeObserver() {
    const observer = new ResizeObserver(() => {
      const w = this.#canvas.clientWidth;
      const h = this.#canvas.clientHeight;
      if (w > 0 && h > 0) {
        this.#renderer.setSize(w, h, false);
        const aspect = w / h;
        const halfH  = (this.#camera.top - this.#camera.bottom) / 2;
        const midY   = (this.#camera.top + this.#camera.bottom) / 2;
        const midX   = (this.#camera.left + this.#camera.right) / 2;
        this.#camera.left   = midX - halfH * aspect;
        this.#camera.right  = midX + halfH * aspect;
        this.#camera.top    = midY + halfH;
        this.#camera.bottom = midY - halfH;
        this.#camera.updateProjectionMatrix();
        this.#renderer.render(this.#scene, this.#camera);
      }
    });
    observer.observe(this.#canvas.parentElement);
  }
}
