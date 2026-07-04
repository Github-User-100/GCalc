import { AppLogger } from '../../shared/AppLogger/javascript/AppLogger.js';

export class HistoryDisplay {
  #logEl;
  #liveEl;
  #liveRowEl;
  #onCopyToInput; // callback(text) when user clicks a history entry

  constructor(logEl, liveEl, onCopyToInput) {
    const log = AppLogger.enter('HistoryDisplay.constructor');
    try {
      this.#logEl       = logEl;
      this.#liveEl      = liveEl;
      this.#liveRowEl   = liveEl.parentElement;
      this.#onCopyToInput = onCopyToInput ?? (() => {});
    } catch (err) {
      log.log('ERROR', err.message);
      throw err;
    } finally {
      log.complete();
    }
  }

  appendEntry(expression, result, isError = false) {
    const log = AppLogger.enter('HistoryDisplay.appendEntry');
    try {
      const entry = document.createElement('div');
      entry.className = 'history-entry';

      const exprEl = document.createElement('div');
      exprEl.className = 'history-expr';
      exprEl.textContent = this.#displayExpr(expression);

      const resultEl = document.createElement('div');
      resultEl.className = `history-result${isError ? ' error' : ''}`;
      resultEl.textContent = isError ? result : `= ${result}`;

      entry.appendChild(exprEl);
      entry.appendChild(resultEl);

      // Click copies expression (or numeric result for non-error) to live input
      entry.addEventListener('click', () => {
        const text = isError ? expression : result;
        log.log('DEBUG', `History click-to-copy: "${text}"`);
        this.#onCopyToInput(text);
      });

      this.#logEl.appendChild(entry);
      this.#scrollToBottom();
      log.log('DEBUG', `Appended: ${expression} = ${result}`);
    } catch (err) {
      log.log('ERROR', err.message);
      throw err;
    } finally {
      log.complete();
    }
  }

  updateLiveInput(buffer) {
    this.#liveEl.textContent = this.#displayExpr(buffer);
  }

  clearHistory() {
    const log = AppLogger.enter('HistoryDisplay.clearHistory');
    try {
      for (const el of [...this.#logEl.querySelectorAll('.history-entry')]) el.remove();
      log.log('INFO', 'History cleared');
    } catch (err) {
      log.log('ERROR', err.message);
      throw err;
    } finally {
      log.complete();
    }
  }

  // Convert internal tokens to display characters
  #displayExpr(expr) {
    return expr
      .replace(/\*/g, '×')
      .replace(/\//g, '÷')
      .replace(/~/g, '(-)')
      .replace(/-/g, '−');
  }

  #scrollToBottom() {
    this.#logEl.scrollTop = this.#logEl.scrollHeight;
  }
}
