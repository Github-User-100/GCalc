import { AppLogger } from '../../shared/AppLogger/javascript/AppLogger.js';
import { Calculator, CalcState } from './Calculator.js';
import { KeyRegistry } from './KeyRegistry.js';
import { HistoryDisplay } from './HistoryDisplay.js';
import { GraphDisplay } from './GraphDisplay.js';

AppLogger.configure('GCalc', 'INFO');

const log = AppLogger.enter('main');
try {
  // ── DOM references ───────────────────────────────────────────────────
  const keypadEl    = document.getElementById('keypad');
  const historyLogEl = document.getElementById('history-log');
  const liveInputEl  = document.getElementById('live-input');
  const graphCanvas  = document.getElementById('graph-canvas');
  const axisCanvas   = document.getElementById('axis-canvas');
  const graphTooltip = document.getElementById('graph-tooltip');
  const btnClrGraph  = document.getElementById('btn-clr-graph');
  const btnClrHist   = document.getElementById('btn-clr-hist');

  // ── Displays ─────────────────────────────────────────────────────────
  const graphDisplay = new GraphDisplay(graphCanvas, axisCanvas, graphTooltip);

  const historyDisplay = new HistoryDisplay(historyLogEl, liveInputEl, (text) => {
    calculator.clearLiveInput();
    for (const ch of text) calculator.input(ch);
  });

  // ── Calculator ───────────────────────────────────────────────────────
  const calculator = new Calculator((buffer, state) => {
    let prefix = '';
    if (state === CalcState.GRAPH_2D) prefix = 'f(x) = ';
    if (state === CalcState.GRAPH_3D) prefix = 'f(x,y) = ';
    historyDisplay.updateLiveInput(buffer, prefix);
    log.log('DEBUG', `State: ${state}  Buffer: "${buffer}"`);
  });

  // Intercept evaluate — routes to graph renderer in graph modes
  const originalEvaluate = calculator.evaluate.bind(calculator);
  calculator.evaluate = () => {
    if (calculator.state === CalcState.GRAPH_2D) {
      const expr = calculator.buffer;
      if (!expr.trim()) return;
      graphDisplay.renderFunction2D(expr);
      historyDisplay.appendEntry(`f(x) = ${expr}`, '→ graphed', false);
      calculator.enterGraphMode('2d');
      return;
    }
    if (calculator.state === CalcState.GRAPH_3D) {
      return; // Phase 2b stub
    }
    const entry = originalEvaluate();
    if (entry) {
      historyDisplay.appendEntry(entry.expr, entry.result, entry.isError);
      calculator.clearLiveInput();
    }
  };

  // ── Keys ─────────────────────────────────────────────────────────────
  const registry = new KeyRegistry();
  registry.build(calculator, keypadEl);

  // ── CLR buttons ──────────────────────────────────────────────────────
  btnClrGraph.addEventListener('click', () => graphDisplay.clearGraph());
  btnClrHist.addEventListener('click',  () => {
    historyDisplay.clearHistory();
    graphDisplay.clearGraph();
  });

  // ── Keyboard support — routes through registry so buttons animate ──
  const KEY_MAP = { '*': '*', '/': '/', '-': '-', '+': '+',
                    '.': '.', '(': '(', ')': ')', '^': '^' };
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    if (e.key === 'Enter')     { e.preventDefault(); registry.pressAction('evaluate');       return; }
    if (e.key === 'Backspace') { e.preventDefault(); registry.pressAction('delete');         return; }
    if (e.key === 'Escape')    { e.preventDefault(); registry.pressAction('clearLiveInput'); return; }

    if (/^[0-9]$/.test(e.key))       { e.preventDefault(); registry.pressChar(e.key);          return; }
    if (KEY_MAP[e.key] !== undefined) { e.preventDefault(); registry.pressChar(KEY_MAP[e.key]); return; }
    // x animates the x,T,θ button; other letters go direct (Calculator gates by mode)
    if (e.key === 'x') { e.preventDefault(); registry.pressChar('x'); return; }
    if (/^[a-zA-Z]$/.test(e.key)) { e.preventDefault(); calculator.input(e.key.toLowerCase()); return; }
  });

  log.log('INFO', 'GCalc ready');
} catch (err) {
  log.log('ERROR', err.message);
  throw err;
} finally {
  log.complete();
}
