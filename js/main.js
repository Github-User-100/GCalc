import { AppLogger } from '../../shared/AppLogger/javascript/AppLogger.js';
import { Calculator } from './Calculator.js';
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
  const btnClrGraph  = document.getElementById('btn-clr-graph');
  const btnClrHist   = document.getElementById('btn-clr-hist');

  // ── Displays ─────────────────────────────────────────────────────────
  const graphDisplay = new GraphDisplay(graphCanvas);

  const historyDisplay = new HistoryDisplay(historyLogEl, liveInputEl, (text) => {
    calculator.clearLiveInput();
    for (const ch of text) calculator.input(ch);
  });

  // ── Calculator ───────────────────────────────────────────────────────
  const calculator = new Calculator((buffer, state) => {
    historyDisplay.updateLiveInput(buffer);
    log.log('DEBUG', `State: ${state}  Buffer: "${buffer}"`);
  });

  // Intercept evaluate so results go to history
  const originalEvaluate = calculator.evaluate.bind(calculator);
  calculator.evaluate = () => {
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
  btnClrHist.addEventListener('click',  () => historyDisplay.clearHistory());

  // ── Keyboard support — routes through registry so buttons animate ──
  const KEY_MAP = { '*': '*', '/': '/', '-': '-', '+': '+',
                    '.': '.', '(': '(', ')': ')', '^': '^' };
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    if (e.key === 'Enter')     { e.preventDefault(); registry.pressAction('evaluate');       return; }
    if (e.key === 'Backspace') { e.preventDefault(); registry.pressAction('delete');         return; }
    if (e.key === 'Escape')    { e.preventDefault(); registry.pressAction('clearLiveInput'); return; }

    if (/^[0-9]$/.test(e.key))       { registry.pressChar(e.key);          return; }
    if (KEY_MAP[e.key] !== undefined) { registry.pressChar(KEY_MAP[e.key]); return; }
  });

  log.log('INFO', 'GCalc ready');
} catch (err) {
  log.log('ERROR', err.message);
  throw err;
} finally {
  log.complete();
}
