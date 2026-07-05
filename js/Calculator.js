import { AppLogger } from '../../shared/AppLogger/javascript/AppLogger.js';
import { ExpressionParser } from './ExpressionParser.js';

export const CalcState = Object.freeze({ INPUT: 'INPUT', RESULT: 'RESULT', ERROR: 'ERROR', GRAPH_2D: 'GRAPH_2D', GRAPH_3D: 'GRAPH_3D' });

export class Calculator {
  #buffer = '';
  #state  = CalcState.INPUT;
  #onChange; // callback(buffer, state)

  constructor(onChange) {
    this.#onChange = onChange ?? (() => {});
  }

  get buffer() { return this.#buffer; }
  get state()  { return this.#state; }

  enterGraphMode(mode) {
    const log = AppLogger.enter('Calculator.enterGraphMode');
    try {
      this.#buffer = '';
      this.#state  = mode === '3d' ? CalcState.GRAPH_3D : CalcState.GRAPH_2D;
      this.#notify();
    } catch (err) {
      log.log('ERROR', err.message);
      throw err;
    } finally {
      log.complete();
    }
  }

  input(char) {
    const log = AppLogger.enter('Calculator.input');
    try {
      if (this.#state === CalcState.RESULT || this.#state === CalcState.ERROR) {
        this.#buffer = '';
        this.#state  = CalcState.INPUT;
      }
      // Single letters only valid in graph modes (multi-char strings like 'sin(' pass through)
      if (/^[a-zA-Z]$/.test(char) && this.#state !== CalcState.GRAPH_2D && this.#state !== CalcState.GRAPH_3D) return;
      // y only valid in 3D mode
      if (char === 'y' && this.#state !== CalcState.GRAPH_3D) return;
      this.#buffer += char;
      this.#notify();
    } catch (err) {
      log.log('ERROR', err.message);
      throw err;
    } finally {
      log.complete();
    }
  }

  delete() {
    const log = AppLogger.enter('Calculator.delete');
    try {
      if (this.#state === CalcState.RESULT || this.#state === CalcState.ERROR) {
        this.#buffer = '';
        this.#state  = CalcState.INPUT;
        this.#notify();
        return;
      }
      if (this.#buffer.length > 0) {
        this.#buffer = this.#buffer.slice(0, -1);
        this.#notify();
      }
    } catch (err) {
      log.log('ERROR', err.message);
      throw err;
    } finally {
      log.complete();
    }
  }

  evaluate() {
    const log = AppLogger.enter('Calculator.evaluate');
    try {
      if (!this.#buffer.trim()) return null;

      const result = ExpressionParser.evaluate(this.#buffer);

      if (result instanceof Error) {
        const prevExpr = this.#buffer;
        this.#buffer = result.message;
        this.#state  = CalcState.ERROR;
        this.#notify();
        return { expr: prevExpr, result: result.message, isError: true };
      }

      const displayResult = ExpressionParser.formatNumber(result);
      const prevExpr = this.#buffer;
      this.#buffer = displayResult;
      this.#state  = CalcState.RESULT;
      this.#notify();
      log.log('INFO', `${prevExpr} = ${displayResult}`);
      return { expr: prevExpr, result: displayResult, isError: false };
    } catch (err) {
      log.log('ERROR', err.message);
      throw err;
    } finally {
      log.complete();
    }
  }

  clearLiveInput() {
    const log = AppLogger.enter('Calculator.clearLiveInput');
    try {
      this.#buffer = '';
      this.#state  = CalcState.INPUT;
      this.#notify();
    } catch (err) {
      log.log('ERROR', err.message);
      throw err;
    } finally {
      log.complete();
    }
  }

  #notify() {
    this.#onChange(this.#buffer, this.#state);
  }
}
