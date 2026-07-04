import { AppLogger } from '../../shared/AppLogger/javascript/AppLogger.js';
import * as THREE from '../lib/three.module.min.js';

export class GraphDisplay {
  #canvas;
  #renderer;
  #scene;
  #camera;

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
      // Remove everything except the grid
      const toRemove = this.#scene.children.filter(obj => obj.userData.removable);
      for (const obj of toRemove) {
        this.#scene.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      }
      this.#renderer.render(this.#scene, this.#camera);
      log.log('INFO', 'Graph cleared');
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
    this.#camera = new THREE.OrthographicCamera(-10, 10, 7.5, -7.5, 0.1, 100);
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
        const halfH  = 7.5;
        this.#camera.left   = -halfH * aspect;
        this.#camera.right  =  halfH * aspect;
        this.#camera.updateProjectionMatrix();
        this.#renderer.render(this.#scene, this.#camera);
      }
    });
    observer.observe(this.#canvas.parentElement);
  }
}
